// Access gate: a shared access code exchanged for a signed, HttpOnly session cookie.
// Sessions are stateless (HMAC-signed). The signing key is derived from BOTH the
// session secret and the access code, so changing either one revokes every session.

import crypto from 'node:crypto';

export const COOKIE_NAME = 'cc_ailab';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest();

export function createAuth(config, { now = () => Date.now() } = {}) {
  const key = crypto
    .createHmac('sha256', config.sessionSecret || 'unconfigured')
    .update(`ai-lab-session:${config.accessCode}`)
    .digest();

  const sign = (payload) => crypto.createHmac('sha256', key).update(payload).digest();

  function issueToken() {
    const payload = b64url(
      JSON.stringify({ sid: crypto.randomBytes(16).toString('hex'), exp: now() + config.sessionTtlMs }),
    );
    return `${payload}.${b64url(sign(payload))}`;
  }

  /** Returns the session ({ sid, exp }) or null. */
  function verifyToken(token) {
    if (typeof token !== 'string' || token.length > 512) return null;
    const [payload, mac] = token.split('.');
    if (!payload || !mac) return null;
    const expected = sign(payload);
    const given = Buffer.from(mac, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (typeof data.sid !== 'string' || typeof data.exp !== 'number' || data.exp <= now()) return null;
      return data;
    } catch {
      return null;
    }
  }

  function checkAccessCode(candidate) {
    if (typeof candidate !== 'string' || !config.accessCode) return false;
    return crypto.timingSafeEqual(sha256(candidate), sha256(config.accessCode));
  }

  function cookieHeader(token, maxAgeMs) {
    const parts = [
      `${COOKIE_NAME}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    ];
    if (config.isProduction) parts.push('Secure');
    return parts.join('; ');
  }

  return {
    issueToken,
    verifyToken,
    checkAccessCode,
    sessionCookie: (token) => cookieHeader(token, config.sessionTtlMs),
    clearCookie: () => cookieHeader('', 0),
  };
}

export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0 && part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return undefined;
}
