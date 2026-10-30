// Run with: npm run test:ai-lab
// The Gemini service is replaced by a fake HERE ONLY. Production always uses createGeminiService().

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createApp, createFollowupSplitter, validateMessages } from '../app.mjs';
import { createAuth } from '../auth.mjs';
import { loadConfig } from '../config.mjs';
import { validateUpload } from '../fileValidation.mjs';
import { AiError, toAiError } from '../gemini.mjs';
import { FOLLOWUP_MARKER } from '../prompts.mjs';
import { computeRangeCheck, normaliseReport, parseRange } from '../reportAnalysis.mjs';
import { detectEmergency } from '../safety.mjs';

const CODE = 'test-access-code-123';
const baseEnv = {
  AI_LAB_ACCESS_CODE: CODE,
  AI_LAB_SESSION_SECRET: 'x'.repeat(40),
  AI_LAB_REPORTS_PER_HOUR: '3',
  AI_LAB_MAX_UPLOAD_MB: '1',
};

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'latin1');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

function fakeGemini(overrides = {}) {
  const calls = [];
  return {
    calls,
    model: 'fake-model',
    configured: true,
    async *streamText(args) {
      calls.push({ kind: 'stream', args });
      if (overrides.streamError) throw overrides.streamError;
      yield 'Hello ';
      yield 'there.';
      yield `\n${FOLLOWUP_MARKER.slice(0, 5)}`;
      yield `${FOLLOWUP_MARKER.slice(5)}\n- What causes it?\n- When should I see a doctor?`;
    },
    async generateJson(args) {
      calls.push({ kind: 'json', args });
      if (overrides.jsonError) throw overrides.jsonError;
      if (args.schema.properties.findings) {
        return {
          isMedicalDocument: true,
          readability: 'clear',
          overview: { reportType: 'CBC', reportDate: '', context: '', summary: 'A blood count.' },
          findings: [{ name: 'Haemoglobin', value: '10.1', unit: 'g/dL', referenceRange: '13.0 - 17.0', printedFlag: 'L', outOfRange: 'within', legibility: 'clear' }],
          terms: [],
          interpretation: 'May be low.',
          doctorQuestions: ['Why is it low?'],
          limitations: [],
        };
      }
      return {
        reportedSymptoms: [{ symptom: 'Headache', details: '' }],
        reportedDurationAndProgression: '',
        reportedContext: [],
        unansweredQuestions: [],
        educationalInformation: [],
        questionsForClinician: [],
        careLevel: 'routine',
        careRecommendation: '',
      };
    },
    async status() {
      return { state: 'online', model: 'fake-model' };
    },
  };
}

async function startServer(gemini, env = {}) {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ailab-'));
  fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>AI Lab App</title>');
  fs.mkdirSync(path.join(distDir, 'assets'));
  fs.writeFileSync(path.join(distDir, 'assets', 'app.js'), 'console.log(1)');
  const config = loadConfig({ ...baseEnv, ...env });
  const app = createApp({ config, gemini, distDir });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { server, url, config, close: () => new Promise((r) => server.close(r)) };
}

async function login(url, code = CODE) {
  const res = await fetch(`${url}/ai-lab/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `code=${encodeURIComponent(code)}`,
    redirect: 'manual',
  });
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  return { res, cookie };
}

const api = (url, cookie, p, init = {}) =>
  fetch(`${url}/api/ai-lab${p}`, {
    ...init,
    headers: { 'x-ai-lab': '1', ...(cookie ? { cookie } : {}), ...(init.headers || {}) },
  });

const json = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const readNdjson = async (res) => (await res.text()).trim().split('\n').map((l) => JSON.parse(l));

// ─────────────────────────────────────────────────────────────────────────────

describe('unit: validation and safety helpers', () => {
  test('upload validation uses content, not declared type', () => {
    assert.equal(validateUpload(PDF, 'application/pdf', 1e6).ok, true);
    assert.equal(validateUpload(PNG, 'image/png', 1e6).ok, true);
    assert.equal(validateUpload(PNG, 'application/octet-stream', 1e6).mimeType, 'image/png');
    assert.equal(validateUpload(PNG, 'application/pdf', 1e6).code, 'content_mismatch');
    assert.equal(validateUpload(Buffer.from('<script>alert(1)</script>....'), 'image/png', 1e6).code, 'content_mismatch');
    assert.equal(validateUpload(Buffer.from('MZ\x90\x00 executable.....'), 'application/pdf', 1e6).code, 'content_mismatch');
    assert.equal(validateUpload(PDF, 'text/html', 1e6).code, 'unsupported_type');
    assert.equal(validateUpload(PDF, 'application/pdf', 10).code, 'file_too_large');
    assert.equal(validateUpload(Buffer.alloc(0), 'application/pdf', 1e6).code, 'empty_file');
    assert.equal(validateUpload(Buffer.from('%PDF-1.4 truncated file no end'), 'application/pdf', 1e6).code, 'malformed_pdf');
    const encrypted = Buffer.from('%PDF-1.4\ntrailer<</Encrypt 5 0 R>>\n%%EOF', 'latin1');
    assert.equal(validateUpload(encrypted, 'application/pdf', 1e6).code, 'encrypted_pdf');
  });

  test('emergency detection (English + Hindi), no false alarm on routine text', () => {
    assert.equal(detectEmergency('I have crushing chest pain and my arm is numb').emergency, true);
    assert.equal(detectEmergency("I can't breathe properly").emergency, true);
    assert.equal(detectEmergency('मुझे सीने में दर्द हो रहा है').emergency, true);
    const sh = detectEmergency('I want to kill myself');
    assert.equal(sh.emergency && sh.selfHarm, true);
    assert.equal(detectEmergency('I have had a mild runny nose for two days').emergency, false);
  });

  test('range parsing and deterministic range check', () => {
    assert.deepEqual(parseRange('13.0 - 17.0'), { low: 13, high: 17 });
    assert.deepEqual(parseRange('4.0–11.0 x10^3/uL'), { low: 4, high: 11 });
    assert.equal(parseRange('< 200').high, 200);
    assert.equal(computeRangeCheck('10.1', '13.0 - 17.0'), 'below');
    assert.equal(computeRangeCheck('250', '<200'), 'above');
    assert.equal(computeRangeCheck('15', '13 to 17'), 'within');
    assert.equal(computeRangeCheck('Positive', 'Negative'), 'not_computable');
    assert.equal(computeRangeCheck('12', ''), 'not_computable');
  });

  test('normaliseReport flags disagreement between model and server range check', () => {
    const r = normaliseReport({
      findings: [{ name: 'Hb', value: '10.1', unit: 'g/dL', referenceRange: '13-17', printedFlag: 'L', outOfRange: 'within', legibility: 'clear' }],
    });
    assert.equal(r.findings[0].serverRangeCheck, 'below');
    assert.equal(r.findings[0].checksDisagree, true);
  });

  test('message validation', () => {
    assert.ok(validateMessages([]).error);
    assert.ok(validateMessages([{ role: 'model', text: 'hi' }]).error);
    assert.ok(validateMessages([{ role: 'system', text: 'hi' }]).error);
    assert.ok(validateMessages([{ role: 'user', text: 'x'.repeat(7000) }]).error);
    assert.ok(validateMessages(Array.from({ length: 41 }, () => ({ role: 'user', text: 'a' }))).error);
    assert.deepEqual(validateMessages([{ role: 'user', text: ' hi ' }]).messages, [{ role: 'user', text: 'hi' }]);
  });

  test('follow-up splitter never leaks the marker across chunk boundaries', () => {
    const s = createFollowupSplitter();
    let out = '';
    for (const c of ['Answer text', '.\n[[FOLL', 'OW_UPS]]\n- One?\n', '- Two?']) out += s.push(c);
    const { rest, followUps } = s.finish();
    out += rest;
    assert.equal(out.includes('[['), false);
    assert.equal(out.trim(), 'Answer text.');
    assert.deepEqual(followUps, ['One?', 'Two?']);
  });

  test('provider errors map to safe codes', () => {
    assert.equal(toAiError({ status: 429, message: 'quota' }).code, 'quota_exceeded');
    assert.equal(toAiError({ status: 403, message: 'x' }).code, 'invalid_api_key');
    assert.equal(toAiError({ status: 400, message: 'API key not valid' }).code, 'invalid_api_key');
    assert.equal(toAiError({ status: 500, message: 'internal secret detail' }).message.includes('secret'), false);
    assert.equal(toAiError(new TypeError('fetch failed')).code, 'network_error');
  });

  test('sessions: tampering, expiry, and revocation by changing the access code', () => {
    let t = 1_000_000;
    const cfg = loadConfig(baseEnv);
    const a = createAuth(cfg, { now: () => t });
    const token = a.issueToken();
    assert.ok(a.verifyToken(token));
    assert.equal(a.verifyToken(`${token}x`), null);
    assert.equal(a.verifyToken(`${token.split('.')[0]}.AAAA`), null);
    const rotated = createAuth(loadConfig({ ...baseEnv, AI_LAB_ACCESS_CODE: 'a-new-code-456' }), { now: () => t });
    assert.equal(rotated.verifyToken(token), null);
    t += cfg.sessionTtlMs + 1;
    assert.equal(a.verifyToken(token), null);
  });
});

describe('integration: gate, API and Gemini wiring', () => {
  let ctx;
  let gemini;
  before(async () => {
    gemini = fakeGemini();
    ctx = await startServer(gemini);
  });
  after(() => ctx.close());

  test('unauthenticated page shows the gate, not the app', async () => {
    const res = await fetch(`${ctx.url}/ai-lab`);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /Enter your access code/);
    assert.doesNotMatch(html, /AI Lab App/);
    assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
  });

  test('unauthenticated assets and API are blocked', async () => {
    assert.equal((await fetch(`${ctx.url}/ai-lab/assets/app.js`)).status, 401);
    assert.equal((await api(ctx.url, null, '/status')).status, 401);
    const r = await api(ctx.url, null, '/chat', json({ messages: [{ role: 'user', text: 'hi' }] }));
    assert.equal(r.status, 401);
    assert.equal(gemini.calls.length, 0);
  });

  test('wrong code is rejected; right code sets a secure session cookie', async () => {
    const bad = await login(ctx.url, 'nope');
    assert.equal(bad.res.status, 401);
    assert.equal(bad.cookie, undefined);
    const good = await login(ctx.url);
    assert.equal(good.res.status, 303);
    const setCookie = good.res.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    const page = await fetch(`${ctx.url}/ai-lab/`, { headers: { cookie: good.cookie } });
    assert.match(await page.text(), /AI Lab App/);
    assert.equal((await fetch(`${ctx.url}/ai-lab/assets/app.js`, { headers: { cookie: good.cookie } })).status, 200);
  });

  test('CSRF: missing custom header or foreign Origin is rejected', async () => {
    const { cookie } = await login(ctx.url);
    const noHeader = await fetch(`${ctx.url}/api/ai-lab/chat`, { ...json({ messages: [{ role: 'user', text: 'hi' }] }), headers: { cookie, 'content-type': 'application/json' } });
    assert.equal(noHeader.status, 403);
    const foreign = await api(ctx.url, cookie, '/chat', {
      ...json({ messages: [{ role: 'user', text: 'hi' }] }),
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    });
    assert.equal(foreign.status, 403);
  });

  test('chat streams deltas, hides the follow-up marker, and passes full history', async () => {
    const { cookie } = await login(ctx.url);
    const messages = [
      { role: 'user', text: 'What is anaemia?' },
      { role: 'model', text: 'Anaemia means...' },
      { role: 'user', text: 'What causes it?' },
    ];
    const res = await api(ctx.url, cookie, '/chat', json({ messages, mode: 'general', language: 'en' }));
    assert.equal(res.status, 200);
    const events = await readNdjson(res);
    assert.equal(events[0].type, 'meta');
    assert.equal(events[0].emergency, null);
    const text = events.filter((e) => e.type === 'delta').map((e) => e.text).join('');
    assert.equal(text.trim(), 'Hello there.');
    assert.deepEqual(events.at(-1), { type: 'done', followUps: ['What causes it?', 'When should I see a doctor?'] });
    const call = gemini.calls.at(-1).args;
    assert.equal(call.contents.length, 3);
    assert.equal(call.contents[1].role, 'model');
    assert.match(call.systemInstruction, /Always reply in English/);
  });

  test('chat flags emergencies before the model answers', async () => {
    const { cookie } = await login(ctx.url);
    const res = await api(ctx.url, cookie, '/chat', json({ messages: [{ role: 'user', text: 'Sudden chest pain spreading to my jaw' }] }));
    const [meta] = await readNdjson(res);
    assert.match(meta.emergency.message, /112/);
  });

  test('report context is fenced as data in the system instruction', async () => {
    const { cookie } = await login(ctx.url);
    await (await api(ctx.url, cookie, '/chat', json({ messages: [{ role: 'user', text: 'Explain my Hb' }], reportContext: '{"Hb":"10.1"}' }))).text();
    assert.match(gemini.calls.at(-1).args.systemInstruction, /<report_analysis>\n\{"Hb":"10.1"\}\n<\/report_analysis>/);
  });

  test('report analysis: valid PDF is sent inline; server range check overrides nothing silently', async () => {
    const { cookie } = await login(ctx.url);
    const res = await api(ctx.url, cookie, '/analyze-report?language=en', { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: PDF });
    assert.equal(res.status, 200);
    const body = await res.json();
    const f = body.analysis.findings[0];
    assert.equal(f.value, '10.1');
    assert.equal(f.serverRangeCheck, 'below');
    assert.equal(f.checksDisagree, true);
    const part = gemini.calls.at(-1).args.contents[0].parts[0];
    assert.equal(part.inlineData.mimeType, 'application/pdf');
    assert.equal(Buffer.from(part.inlineData.data, 'base64').equals(PDF), true);
  });

  test('report analysis rejects disguised, unsupported and oversized files', async () => {
    const { cookie } = await login(ctx.url);
    const before = gemini.calls.length;
    const fake = await api(ctx.url, cookie, '/analyze-report', { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: Buffer.from('<html><script>alert(1)</script></html>') });
    assert.equal(fake.status, 415);
    const html = await api(ctx.url, cookie, '/analyze-report', { method: 'POST', headers: { 'content-type': 'text/html' }, body: '<html></html>' });
    assert.equal(html.status, 415);
    const big = Buffer.concat([PDF, Buffer.alloc(2 * 1024 * 1024)]);
    const tooBig = await api(ctx.url, cookie, '/analyze-report', { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: big });
    assert.equal(tooBig.status, 413);
    assert.equal((await tooBig.json()).error.code, 'file_too_large');
    assert.equal(gemini.calls.length, before);
  });

  test('per-session rate limit on report analysis', async () => {
    const { cookie } = await login(ctx.url);
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      const r = await api(ctx.url, cookie, '/analyze-report', { method: 'POST', headers: { 'content-type': 'image/png' }, body: PNG });
      statuses.push(r.status);
      await r.text();
    }
    assert.deepEqual(statuses, [200, 200, 200, 429]);
  });

  test('symptom summary escalates care level when red flags were reported', async () => {
    const { cookie } = await login(ctx.url);
    const res = await api(ctx.url, cookie, '/symptom-summary', json({ messages: [{ role: 'user', text: 'Headache and now I fainted and passed out' }] }));
    const body = await res.json();
    assert.equal(body.summary.careLevel, 'emergency');
    assert.ok(body.emergency);
  });

  test('logout clears the cookie', async () => {
    const { cookie } = await login(ctx.url);
    const res = await api(ctx.url, cookie, '/logout', { method: 'POST' });
    assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
  });
});

describe('integration: failure handling', () => {
  test('missing API key → clear not_configured error, no quota consumed', async () => {
    const g = { ...fakeGemini(), configured: false };
    const ctx = await startServer(g);
    try {
      const { cookie } = await login(ctx.url);
      const res = await api(ctx.url, cookie, '/chat', json({ messages: [{ role: 'user', text: 'hi' }] }));
      assert.equal(res.status, 503);
      assert.equal((await res.json()).error.code, 'not_configured');
    } finally {
      await ctx.close();
    }
  });

  test('quota error mid-stream is reported as a structured event', async () => {
    const ctx = await startServer(fakeGemini({ streamError: new AiError('quota_exceeded', 'The AI usage quota has been reached.', 429) }));
    try {
      const { cookie } = await login(ctx.url);
      const events = await readNdjson(await api(ctx.url, cookie, '/chat', json({ messages: [{ role: 'user', text: 'hi' }] })));
      assert.equal(events.at(-1).type, 'error');
      assert.equal(events.at(-1).error.code, 'quota_exceeded');
    } finally {
      await ctx.close();
    }
  });

  test('provider failure on report returns safe JSON error', async () => {
    const ctx = await startServer(fakeGemini({ jsonError: { status: 503, message: 'backend stack trace here' } }));
    try {
      const { cookie } = await login(ctx.url);
      const res = await api(ctx.url, cookie, '/analyze-report', { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: PDF });
      const body = await res.json();
      assert.equal(res.status, 503);
      assert.equal(body.error.code, 'provider_unavailable');
      assert.equal(JSON.stringify(body).includes('stack'), false);
    } finally {
      await ctx.close();
    }
  });

  test('gate refuses all logins when access is not configured', async () => {
    const ctx = await startServer(fakeGemini(), { AI_LAB_ACCESS_CODE: '', AI_LAB_SESSION_SECRET: '' });
    try {
      const { res, cookie } = await login(ctx.url, '');
      assert.equal(res.status, 401);
      assert.equal(cookie, undefined);
    } finally {
      await ctx.close();
    }
  });
});
