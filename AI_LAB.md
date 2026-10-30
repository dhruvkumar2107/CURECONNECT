# CureConnect AI Vision (`/ai-lab`)

A private, invitation-only health-information copilot built on the **Google Gemini API**. It is not linked from the main CureConnect site's navbar, footer or homepage.

| Feature | What it does |
|---|---|
| **Ask anything** | Streaming health Q&A with conversation context, stop / retry / copy / clear, and suggested follow-ups |
| **Medical Report Intelligence** | PDF/JPG/PNG/WebP upload → values copied exactly as printed, a server-side check against the printed reference ranges, plain-language explanation, questions for the doctor, and limitations. Follow-up questions in chat use the analysis. |
| **Symptom Copilot** | Guided intake that asks only useful follow-ups → structured doctor-visit summary (copy / download `.txt`). It keeps what the user said separate from what the AI generated. |
| **Voice** | Browser speech recognition into an editable text box (English/Hindi) and browser text-to-speech with stop/replay. It can be turned off. |
| **Safety** | Deterministic red-flag detection (English + Hindi) shows emergency guidance (**112** / 108, plus Tele-MANAS 14416 for self-harm) *before* the model answers. Server-side system instructions forbid diagnoses, doses and medication changes. |

---

## Architecture

```
Browser ──► cureconnect-dckr.onrender.com  (existing Render Static Site, unchanged app)
              │  rewrite /ai-lab*, /api/ai-lab/*
              ▼
           cureconnect-ai-lab.onrender.com  (new Render Web Service: server/index.mjs)
              ├─ GET  /ai-lab              → access-code gate, or the app (only with a valid session)
              ├─ POST /ai-lab/login        → sets HttpOnly session cookie
              ├─ GET  /ai-lab/assets/*     → built frontend (session required)
              ├─ GET  /api/ai-lab/status   → Gemini key/model check (no tokens used)
              ├─ POST /api/ai-lab/chat              (streaming NDJSON)
              ├─ POST /api/ai-lab/analyze-report    (raw file body, in memory)
              ├─ POST /api/ai-lab/symptom-summary   (JSON schema output)
              └─ POST /api/ai-lab/logout
                         │
                         ▼
                   Google Gemini API (generateContent; stateless; files sent inline)
```

**Why a separate service?** The existing site is a Render **Static Site**. It cannot run server code, and Gemini must be called server-side so the key stays secret. Render static sites can rewrite a path to an external URL. That lets the AI Lab appear at `https://cureconnect-dckr.onrender.com/ai-lab` without moving or rebuilding the main site.

| Path | Purpose |
|---|---|
| `server/index.mjs` | Entry point |
| `server/app.mjs` | Routes, security headers, CSRF/origin checks, limits, streaming |
| `server/auth.mjs` | Access code check (constant-time) and HMAC-signed session cookies |
| `server/gemini.mjs` | All Gemini calls and error mapping (`@google/genai`) |
| `server/prompts.mjs` | System instructions and JSON schemas |
| `server/safety.mjs` | Emergency red-flag detection |
| `server/fileValidation.mjs` | Magic-byte content validation, size limits, encrypted/malformed PDF rejection |
| `server/reportAnalysis.mjs` | Normalisation and deterministic range check of extracted values |
| `server/rateLimit.mjs` | In-memory limiter |
| `server/tests/` | `node:test` suite (Gemini is faked **only** here) |
| `ai-lab/` | Standalone React frontend (own Vite build → `dist-ai-lab/`) |
| `vite.ai-lab.config.ts` | Build config for the frontend |

The AI Lab frontend has **no PostHog, Firebase, Google Fonts or other third-party scripts**, and the CSP blocks any that might be added.

---

## Environment variables

See `.env.example`. All are server-side only. **Never** prefix them with `VITE_`.

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | From https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | no | Default `gemini-3.8-flash` (Google's recommended current model, Oct 2026). `gemini-3.5-flash-lite` is cheaper. |
| `AI_LAB_ACCESS_CODE` | yes | ≥ 8 chars. This is what you give invitees. |
| `AI_LAB_SESSION_SECRET` | yes | ≥ 32 random chars |
| `AI_LAB_ALLOWED_ORIGINS` | via proxy | `https://cureconnect-dckr.onrender.com` |
| `NODE_ENV` | prod | `production` → Secure cookies and HSTS |
| `AI_LAB_SESSION_HOURS`, `AI_LAB_*_PER_HOUR`, `AI_LAB_DAILY_LIMIT`, `AI_LAB_MAX_UPLOAD_MB`, `TRUST_PROXY_HOPS` | no | Limits (see `server/config.mjs`) |

---

## Run locally

```bash
npm install
cp .env.example .env              # fill in GEMINI_API_KEY, access code and secret
npm run build:ai-lab
npm run start:ai-lab              # http://localhost:8787/ai-lab
npm test                          # server test suite
```

To get hot reload while working on the frontend, run `npm run start:ai-lab`, sign in once at `http://localhost:8787/ai-lab`, then run `npm run dev:ai-lab` and open `http://localhost:3001/ai-lab/`. API calls are proxied, and the cookie is shared because cookies are scoped to the host, not the port.

The main site is unchanged: `npm run dev` / `npm run build`.

---

## Deploy on Render

### 1. Create the AI service
**Dashboard → New → Blueprint** and select this repo; `render.yaml` defines only `cureconnect-ai-lab`. Alternatively, use **New → Web Service** with:

- Runtime **Node**, Build `npm ci --include=dev && npm run build:ai-lab`, Start `npm run start:ai-lab`
- Health check path `/healthz`
- Environment: `NODE_ENV=production`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_LAB_ACCESS_CODE`, `AI_LAB_SESSION_SECRET`, `AI_LAB_ALLOWED_ORIGINS=https://cureconnect-dckr.onrender.com`

Check `https://<service>.onrender.com/ai-lab`. The access-code page should load, and the status pill should read **Gemini online** after you sign in.

### 2. Route `/ai-lab` on the main domain
On the existing **static site**, go to **Redirects/Rewrites** and add these rules, all of type **Rewrite**, *above* any existing `/*` rule:

| Source | Destination |
|---|---|
| `/ai-lab` | `https://<service>.onrender.com/ai-lab` |
| `/ai-lab/*` | `https://<service>.onrender.com/ai-lab/*` |
| `/api/ai-lab/*` | `https://<service>.onrender.com/api/ai-lab/*` |

The main site uses `HashRouter`, so these paths never collide with its routes.

> **Verify after deploying:** Render's docs confirm that rewrites to a full external URL are supported. They don't say whether cookies and streamed responses pass through intact. If sign-in or streaming misbehaves through the proxy, use the service URL (`https://<service>.onrender.com/ai-lab`) directly. Everything works there on its own.

### Free-plan notes
Free web services sleep after about 15 minutes idle, and the first request can take 30–60 s to wake. In-memory rate limits reset on restart. Run a single instance, because limits are per process.

---

## Access control and revocation

- The access code is checked server-side with a constant-time comparison. Login is rate limited to 8 attempts per IP per 15 minutes, plus 60 failed attempts globally per 15 minutes.
- Sessions use an HMAC-signed `HttpOnly; Secure; SameSite=Strict` cookie that lasts 8 hours by default.
- **Revoke all access:** change `AI_LAB_ACCESS_CODE` or `AI_LAB_SESSION_SECRET` in Render. Every existing session is invalidated immediately, because the signing key is derived from both.
- **Disable entirely:** suspend the web service or remove the rewrite rules.
- Every API route requires a valid session, so calling the API directly without signing in returns `401`. POST requests also need the `x-ai-lab: 1` header and an allowed `Origin` (CSRF protection).

## Privacy and security

- Conversations live only in browser memory and are gone on refresh or **Clear**. Nothing is written to a database.
- Uploaded files are held in server memory for the duration of one request, then sent **inline** to Gemini. They are never written to disk and never uploaded to the Gemini Files API, so there are no provider-side files to delete.
- We use the stateless `generateContent` API, not the Interactions API, which stores conversations server-side by default.
- Logs contain only error codes, never prompts, report contents or file names.
- Headers: strict CSP (`script-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`), `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, HSTS, and `Permissions-Policy` (microphone limited to self). No CORS headers are sent, so only same-origin requests work.
- `vite.config.ts` previously injected `GEMINI_API_KEY` into the **public** main bundle via `define`. That has been removed.
- ⚠️ **Gemini free tier:** Google states that free-tier prompts *are used to improve its products*, while paid-tier prompts are not. For real health information, **enable billing on the Google AI Studio project** before inviting users.
- Voice input uses the browser's Web Speech API. In Chrome and Edge, the browser vendor's speech service processes the audio. CureConnect and Gemini only ever receive the text the user reviews and sends.

## Costs (checked Oct 2026, https://ai.google.dev/gemini-api/docs/pricing)

`gemini-3.8-flash` paid tier: **$0.75 / 1M input** and **$3.75 / 1M output** tokens (thinking tokens count as output) until 31 Dec 2026. Prices **double from 1 Jan 2027** ($1.50 / $7.50). `gemini-3.5-flash-lite` costs $0.30 / $2.50.

These per-request figures are rough estimates, not measured:
- Chat turn (about 3k tokens in, 1–2k out): **≈ $0.005–0.01**
- Report analysis (a few pages or one image, 2–4k tokens of JSON out): **≈ $0.01–0.02**
- With the default global cap of 500 requests/day, the worst case is about **$5–10/day**. Lower `AI_LAB_DAILY_LIMIT` to cap spend, and set a budget alert in Google Cloud.

The status check (`models.get`) consumes no tokens.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Status shows "AI not configured" | Set `GEMINI_API_KEY` and redeploy |
| "API key invalid" | Regenerate the key in AI Studio and update it in Render |
| "Model unavailable" | Set `GEMINI_MODEL` to a current model from https://ai.google.dev/gemini-api/docs/models |
| "Quota reached" | Free-tier or project quota is exhausted. Wait, or enable billing. |
| "Access has not been configured" on the gate page | Set `AI_LAB_ACCESS_CODE` (≥ 8 chars) and `AI_LAB_SESSION_SECRET` (≥ 32 chars) |
| POST returns `403 forbidden` through the proxy | Add the static site origin to `AI_LAB_ALLOWED_ORIGINS` |
| Everyone gets "Too many attempts" via the proxy | The proxy IP is shared. Set `TRUST_PROXY_HOPS` to match the proxy chain, or use the service URL directly. |
| `AI Lab frontend has not been built` | The build command must include `npm run build:ai-lab` |

## Known limitations

- No retrieval or citations. The optional "evidence-backed answers" feature is not implemented, and model-written links are shown as plain text rather than clickable links.
- Report follow-ups use the structured analysis, not the original file. Details the analysis didn't capture can't be answered, and the assistant is instructed to say so.
- AI extraction can misread values. The server's numeric range check catches some disagreements ("Check manually"), but users must verify against the original report.
- Rate limits are in-memory and reset on restart.
- Emergency detection is keyword-based (English and Hindi). It is a safety net, not a triage system.
