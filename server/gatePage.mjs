// Server-rendered access gate. Self-contained (no external assets) so nothing of the
// AI Lab app is delivered before the visitor is authorised.

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderGatePage({ nonce, error = '', configured = true }) {
  const errorBlock = error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : '';
  const disabled = configured ? '' : 'disabled';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>CureConnect AI Vision — Private access</title>
<style nonce="${nonce}">
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #e2e8f0;
    background: radial-gradient(1200px 600px at 10% -10%, rgba(20,184,166,.16), transparent 60%),
                radial-gradient(900px 500px at 110% 110%, rgba(59,130,246,.14), transparent 60%), #050b1a; }
  main { width: 100%; max-width: 440px; padding: 36px 32px; border-radius: 24px;
    background: rgba(15,23,42,.72); border: 1px solid rgba(148,163,184,.16);
    box-shadow: 0 30px 80px -20px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.04); }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; }
  .logo { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;
    background: linear-gradient(135deg,#14b8a6,#0e7490); box-shadow: 0 0 24px rgba(20,184,166,.35); }
  .brand b { display: block; font-size: 18px; letter-spacing: -.01em; }
  .brand span { font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: #5eead4; }
  h1 { font-size: 22px; margin: 0 0 8px; letter-spacing: -.01em; }
  p { margin: 0 0 18px; color: #94a3b8; font-size: 14.5px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #cbd5e1; }
  input { width: 100%; padding: 13px 14px; border-radius: 12px; font: inherit; color: #f8fafc;
    background: rgba(2,6,23,.7); border: 1px solid rgba(148,163,184,.25); }
  input:focus-visible, button:focus-visible { outline: 3px solid #5eead4; outline-offset: 2px; }
  button { margin-top: 16px; width: 100%; padding: 13px; border: 0; border-radius: 12px; font: 600 15px/1 inherit;
    font-family: inherit; color: #04201d; background: linear-gradient(135deg,#5eead4,#14b8a6); cursor: pointer; }
  button[disabled] { opacity: .5; cursor: not-allowed; }
  .error { color: #fecaca; background: rgba(127,29,29,.35); border: 1px solid rgba(248,113,113,.35);
    padding: 10px 12px; border-radius: 10px; font-size: 14px; }
  .notice { margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(148,163,184,.14); font-size: 12.5px; color: #7c8ba1; }
  .notice p { font-size: 12.5px; margin-bottom: 8px; color: #7c8ba1; }
</style>
</head>
<body>
<main>
  <div class="brand">
    <div class="logo" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
    </div>
    <div><b>CureConnect AI Vision</b><span>Private preview</span></div>
  </div>
  <h1>Enter your access code</h1>
  <p>This area is invitation-only. Ask the CureConnect team for an access code.</p>
  ${configured ? '' : '<p class="error" role="alert">Access has not been configured on this server yet.</p>'}
  ${errorBlock}
  <form method="post" action="/ai-lab/login" autocomplete="off">
    <label for="code">Access code</label>
    <input id="code" name="code" type="password" required maxlength="200" autofocus ${disabled}>
    <button type="submit" ${disabled}>Continue</button>
  </form>
  <div class="notice">
    <p><strong>Educational information only.</strong> CureConnect AI Vision does not diagnose conditions or replace a qualified clinician. In an emergency, call <strong>112</strong>.</p>
    <p><strong>Privacy:</strong> your messages and uploaded files are sent to Google's Gemini API for processing. CureConnect does not store your conversations or reports.</p>
  </div>
</main>
</body>
</html>`;
}
