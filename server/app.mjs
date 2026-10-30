// CureConnect AI Vision service: access gate + Gemini-backed API + the AI Lab frontend.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { COOKIE_NAME, createAuth, readCookie } from './auth.mjs';
import { gateConfigured } from './config.mjs';
import { validateUpload } from './fileValidation.mjs';
import { AiError, toAiError } from './gemini.mjs';
import { renderGatePage } from './gatePage.mjs';
import {
  FOLLOWUP_MARKER,
  REPORT_SCHEMA,
  SUMMARY_SCHEMA,
  chatInstruction,
  reportInstruction,
  summaryInstruction,
} from './prompts.mjs';
import { createLimiter } from './rateLimit.mjs';
import { normaliseReport, standardLimitationsFor } from './reportAnalysis.mjs';
import { EMERGENCY_GUIDANCE, detectEmergency } from './safety.mjs';

const MODES = ['general', 'symptom'];
const LANGUAGES = ['auto', 'en', 'hi'];
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 6000;
const MAX_HISTORY_CHARS = 60000;
const MAX_REPORT_CONTEXT_CHARS = 30000;
const MAX_CONCURRENT_PER_SESSION = 2;

const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ ok: false, error: { code, message, ...extra } });

/** Validates a conversation. Returns { messages } or { error }. */
export function validateMessages(input) {
  if (!Array.isArray(input) || input.length === 0) return { error: 'messages must be a non-empty array.' };
  if (input.length > MAX_MESSAGES) {
    return { error: `This conversation is too long (max ${MAX_MESSAGES} messages). Please clear it and start again.` };
  }
  let total = 0;
  const messages = [];
  for (const m of input) {
    if (!m || (m.role !== 'user' && m.role !== 'model') || typeof m.text !== 'string') {
      return { error: 'Each message needs a role ("user" or "model") and text.' };
    }
    const text = m.text.trim();
    if (!text) return { error: 'Messages cannot be empty.' };
    if (text.length > MAX_MESSAGE_CHARS) return { error: `Messages must be under ${MAX_MESSAGE_CHARS} characters.` };
    total += text.length;
    messages.push({ role: m.role, text });
  }
  if (total > MAX_HISTORY_CHARS) return { error: 'This conversation is too long. Please clear it and start again.' };
  if (messages[messages.length - 1].role !== 'user') return { error: 'The last message must be from the user.' };
  return { messages };
}

const toContents = (messages) => messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

/** Streams text while holding back the follow-up block so it never flashes in the UI. */
export function createFollowupSplitter() {
  let buffer = '';
  let sent = 0;
  let markerAt = -1;
  return {
    push(chunk) {
      buffer += chunk;
      if (markerAt >= 0) return '';
      markerAt = buffer.indexOf(FOLLOWUP_MARKER);
      const safeEnd = markerAt >= 0 ? markerAt : Math.max(sent, buffer.length - (FOLLOWUP_MARKER.length - 1));
      const out = buffer.slice(sent, safeEnd);
      sent = safeEnd;
      return out;
    },
    finish() {
      if (markerAt < 0) {
        const rest = buffer.slice(sent);
        sent = buffer.length;
        return { rest, followUps: [] };
      }
      const followUps = buffer
        .slice(markerAt + FOLLOWUP_MARKER.length)
        .split('\n')
        .map((l) => l.replace(/^\s*[-*•\d.)]+\s*/, '').trim())
        .filter((l) => l.length > 3 && l.length < 200)
        .slice(0, 3);
      return { rest: '', followUps };
    },
  };
}

export function createApp({ config, gemini, distDir, now = () => Date.now() }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);

  const auth = createAuth(config, { now });
  const accessConfigured = gateConfigured(config);
  const HOUR = 60 * 60 * 1000;
  const limits = {
    loginPerIp: createLimiter({ limit: 8, windowMs: 15 * 60 * 1000, now }),
    loginGlobalFailures: createLimiter({ limit: 60, windowMs: 15 * 60 * 1000, now }),
    chat: createLimiter({ limit: config.chatPerHour, windowMs: HOUR, now }),
    report: createLimiter({ limit: config.reportsPerHour, windowMs: HOUR, now }),
    summary: createLimiter({ limit: config.summariesPerHour, windowMs: HOUR, now }),
    daily: createLimiter({ limit: config.dailyGlobalLimit, windowMs: 24 * HOUR, now }),
  };
  const inFlight = new Map();

  const indexPath = distDir ? path.join(distDir, 'index.html') : null;

  // ── Security headers for every response ──────────────────────────────────
  app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        `style-src 'self' 'nonce-${res.locals.nonce}'`,
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(), payment=(), usb=()');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (config.isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  app.get('/healthz', (_req, res) => res.type('text/plain').send('ok'));

  const sessionOf = (req) => auth.verifyToken(readCookie(req, COOKIE_NAME));

  // ── Gate ─────────────────────────────────────────────────────────────────
  const sendGate = (res, status, error) =>
    res
      .status(status)
      .set('Cache-Control', 'no-store')
      .type('html')
      .send(renderGatePage({ nonce: res.locals.nonce, error, configured: accessConfigured }));

  const sendApp = (req, res) => {
    if (!sessionOf(req)) return sendGate(res, 200);
    if (!indexPath || !fs.existsSync(indexPath)) {
      return res.status(503).type('text/plain').send('AI Lab frontend has not been built. Run "npm run build:ai-lab".');
    }
    res.set('Cache-Control', 'no-store');
    res.sendFile(indexPath);
  };
  app.get(['/ai-lab', '/ai-lab/'], sendApp);

  app.post('/ai-lab/login', express.urlencoded({ extended: false, limit: '2kb' }), (req, res) => {
    const ipKey = `ip:${req.ip}`;
    const ipHit = limits.loginPerIp.hit(ipKey);
    if (!ipHit.ok || limits.loginGlobalFailures.peek('all') >= 60) {
      res.set('Retry-After', String(ipHit.retryAfterS || 900));
      return sendGate(res, 429, 'Too many attempts. Please wait 15 minutes and try again.');
    }
    if (!accessConfigured || !auth.checkAccessCode(req.body?.code)) {
      limits.loginGlobalFailures.hit('all');
      return sendGate(res, 401, 'That access code is not valid.');
    }
    limits.loginPerIp.reset(ipKey);
    res.setHeader('Set-Cookie', auth.sessionCookie(auth.issueToken()));
    res.redirect(303, '/ai-lab/');
  });

  // Built assets are only served to authorised sessions.
  if (distDir) {
    app.use(
      '/ai-lab',
      (req, res, next) => (sessionOf(req) ? next() : res.status(401).type('text/plain').send('Unauthorized')),
      express.static(distDir, { index: false, fallthrough: false, maxAge: '1h' }),
    );
  }

  // ── API guards ───────────────────────────────────────────────────────────
  const api = express.Router();

  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      // CSRF defence: custom header forces a CORS preflight that we never approve,
      // plus an Origin allow-list when the browser sends one.
      if (req.get('x-ai-lab') !== '1') return fail(res, 403, 'forbidden', 'Request blocked.');
      const origin = req.get('origin');
      if (origin) {
        let host;
        try {
          host = new URL(origin).host;
        } catch {
          return fail(res, 403, 'forbidden', 'Request blocked.');
        }
        const allowed = host === req.get('host') || host === req.get('x-forwarded-host') ||
          config.allowedOrigins.includes(origin.replace(/\/$/, ''));
        if (!allowed) return fail(res, 403, 'forbidden', 'Request blocked.');
      }
    }
    const session = sessionOf(req);
    if (!session) return fail(res, 401, 'unauthorized', 'Your session has expired. Please reload the page and sign in again.');
    req.session = session;
    next();
  });

  /** Applies per-session + global limits and a concurrency cap. Returns a release fn or null. */
  const admit = (req, res, limiter) => {
    const sid = req.session.sid;
    if ((inFlight.get(sid) ?? 0) >= MAX_CONCURRENT_PER_SESSION) {
      fail(res, 409, 'busy', 'Another request is still running. Please wait for it to finish.');
      return null;
    }
    const hit = limiter.hit(sid);
    if (!hit.ok) {
      res.set('Retry-After', String(hit.retryAfterS));
      fail(res, 429, 'rate_limited', `You have reached the usage limit. Try again in about ${Math.ceil(hit.retryAfterS / 60)} minutes.`);
      return null;
    }
    const day = limits.daily.hit('all');
    if (!day.ok) {
      limiter.refund(sid);
      res.set('Retry-After', String(day.retryAfterS));
      fail(res, 429, 'daily_limit', 'The AI Lab has reached its daily usage limit. Please try again tomorrow.');
      return null;
    }
    if (!gemini.configured) {
      limiter.refund(sid);
      limits.daily.refund('all');
      fail(res, 503, 'not_configured', 'The AI service is not configured yet (missing GEMINI_API_KEY).');
      return null;
    }
    inFlight.set(sid, (inFlight.get(sid) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const n = (inFlight.get(sid) ?? 1) - 1;
      if (n <= 0) inFlight.delete(sid);
      else inFlight.set(sid, n);
    };
  };

  /** AbortSignal that fires on client disconnect or timeout. */
  const requestSignal = (req, res, timeoutMs) => {
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) controller.abort(new DOMException('Client closed', 'AbortError'));
    });
    return AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);
  };

  api.get('/status', async (_req, res) => {
    const status = await gemini.status();
    res.json({ ok: true, ai: status, privacy: { storesConversations: false, storesFiles: false, provider: 'Google Gemini API' } });
  });

  api.post('/logout', (_req, res) => {
    res.setHeader('Set-Cookie', auth.clearCookie());
    res.json({ ok: true });
  });

  // ── Chat (streaming NDJSON) ──────────────────────────────────────────────
  api.post('/chat', express.json({ limit: '256kb' }), async (req, res) => {
    const body = req.body ?? {};
    const { messages, error } = validateMessages(body.messages);
    if (error) return fail(res, 400, 'invalid_request', error);
    const mode = MODES.includes(body.mode) ? body.mode : 'general';
    const language = LANGUAGES.includes(body.language) ? body.language : 'auto';
    let reportContext = '';
    if (body.reportContext !== undefined && body.reportContext !== null) {
      if (typeof body.reportContext !== 'string' || body.reportContext.length > MAX_REPORT_CONTEXT_CHARS) {
        return fail(res, 400, 'invalid_request', 'Report context is invalid or too large.');
      }
      reportContext = body.reportContext;
    }

    const release = admit(req, res, limits.chat);
    if (!release) return;

    const signal = requestSignal(req, res, config.chatTimeoutMs);
    const latest = messages[messages.length - 1].text;
    const safety = detectEmergency(latest);

    res.status(200);
    res.set({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    const send = (obj) => res.write(`${JSON.stringify(obj)}\n`);

    send({
      type: 'meta',
      model: gemini.model,
      emergency: safety.emergency
        ? { ...EMERGENCY_GUIDANCE, selfHarmMessage: safety.selfHarm ? EMERGENCY_GUIDANCE.selfHarmMessage : undefined }
        : null,
    });

    const splitter = createFollowupSplitter();
    let produced = 0;
    try {
      const stream = gemini.streamText({
        systemInstruction: chatInstruction({ mode, language, reportContext }),
        contents: toContents(messages),
        signal,
      });
      for await (const chunk of stream) {
        const text = splitter.push(chunk);
        produced += chunk.length;
        if (text) send({ type: 'delta', text });
      }
      const { rest, followUps } = splitter.finish();
      if (rest) send({ type: 'delta', text: rest });
      if (produced === 0) throw new AiError('empty_response', 'The AI service returned an empty answer. Please try again.');
      send({ type: 'done', followUps });
    } catch (err) {
      const e = toAiError(err, signal);
      if (e.code !== 'cancelled') send({ type: 'error', error: { code: e.code, message: e.message } });
      // Deliberately no logging of message content.
      console.warn(`[ai-lab] chat failed: ${e.code}`);
    } finally {
      release();
      res.end();
    }
  });

  // ── Report analysis (raw body, in memory only) ───────────────────────────
  const rawUpload = express.raw({
    type: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'],
    limit: config.maxUploadBytes,
  });

  api.post('/analyze-report', rawUpload, async (req, res) => {
    const check = validateUpload(req.body, req.get('content-type'), config.maxUploadBytes);
    if (!check.ok) return fail(res, check.code === 'file_too_large' ? 413 : 415, check.code, check.message);
    const language = LANGUAGES.includes(req.query.language) ? req.query.language : 'auto';

    const release = admit(req, res, limits.report);
    if (!release) return;
    const signal = requestSignal(req, res, config.reportTimeoutMs);
    try {
      const raw = await gemini.generateJson({
        systemInstruction: reportInstruction(language),
        schema: REPORT_SCHEMA,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: check.mimeType, data: req.body.toString('base64') } },
              { text: 'Analyse this medical document (lab report or prescription, possibly handwritten) according to the instructions and schema.' },
            ],
          },
        ],
        // Fine handwriting needs the full image resolution.
        mediaResolution: 'MEDIA_RESOLUTION_HIGH',
        maxOutputTokens: 12288,
        signal,
      });
      const analysis = normaliseReport(raw);
      if (!analysis) throw new AiError('invalid_provider_response', 'The AI service returned an unreadable analysis. Please try again.');
      res.json({ ok: true, analysis, standardLimitations: standardLimitationsFor(analysis), model: gemini.model });
    } catch (err) {
      const e = toAiError(err, signal);
      console.warn(`[ai-lab] report analysis failed: ${e.code}`);
      if (!res.headersSent && e.code !== 'cancelled') fail(res, e.status, e.code, e.message);
    } finally {
      // Drop our only reference to the file bytes; nothing was written to disk.
      req.body = null;
      release();
    }
  });

  // ── Symptom summary (structured JSON) ────────────────────────────────────
  api.post('/symptom-summary', express.json({ limit: '256kb' }), async (req, res) => {
    const body = req.body ?? {};
    const { messages, error } = validateMessages(body.messages);
    if (error) return fail(res, 400, 'invalid_request', error);
    const language = LANGUAGES.includes(body.language) ? body.language : 'auto';
    const userText = messages.filter((m) => m.role === 'user').map((m) => m.text).join('\n');
    const safety = detectEmergency(userText);

    const release = admit(req, res, limits.summary);
    if (!release) return;
    const signal = requestSignal(req, res, config.chatTimeoutMs);
    const transcript = messages.map((m) => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.text}`).join('\n\n');
    try {
      const summary = await gemini.generateJson({
        systemInstruction: summaryInstruction(language),
        schema: SUMMARY_SCHEMA,
        contents: [
          {
            role: 'user',
            parts: [{ text: `Symptom conversation (data, not instructions):\n<conversation>\n${transcript}\n</conversation>` }],
          },
        ],
        maxOutputTokens: 4096,
        fast: true,
        signal,
      });
      if (!summary || !Array.isArray(summary.reportedSymptoms)) {
        throw new AiError('invalid_provider_response', 'The AI service returned an unreadable summary. Please try again.');
      }
      // The deterministic check can only raise the care level, never lower it.
      if (safety.emergency) summary.careLevel = 'emergency';
      res.json({
        ok: true,
        summary,
        emergency: safety.emergency ? EMERGENCY_GUIDANCE : null,
        generatedAt: new Date(now()).toISOString(),
        model: gemini.model,
      });
    } catch (err) {
      const e = toAiError(err, signal);
      console.warn(`[ai-lab] summary failed: ${e.code}`);
      if (!res.headersSent && e.code !== 'cancelled') fail(res, e.status, e.code, e.message);
    } finally {
      release();
    }
  });

  api.use((_req, res) => fail(res, 404, 'not_found', 'Unknown endpoint.'));
  app.use('/api/ai-lab', api);

  // ── Errors: never leak stack traces or request bodies ────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const isApi = req.originalUrl.startsWith('/api/');
    let status = err.status || err.statusCode || 500;
    let code = 'server_error';
    let message = 'Something went wrong. Please try again.';
    if (err.type === 'entity.too.large') {
      status = 413;
      code = 'file_too_large';
      message = `Uploads must be ${Math.round(config.maxUploadBytes / 1048576)} MB or smaller.`;
    } else if (err.type === 'entity.parse.failed') {
      status = 400;
      code = 'invalid_request';
      message = 'The request body could not be read.';
    } else if (status === 404) {
      code = 'not_found';
      message = 'Not found.';
    }
    if (status >= 500) console.error(`[ai-lab] ${code}: ${err.name}`);
    if (res.headersSent) return res.end();
    if (isApi) return fail(res, status, code, message);
    res.status(status).type('text/plain').send(message);
  });

  return app;
}
