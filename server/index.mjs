// Entry point: `npm run start:ai-lab`
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { gateConfigured, loadConfig } from './config.mjs';
import { createGeminiService } from './gemini.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Local development convenience: load .env if present (Node >= 20.12). Never required in production.
try {
  process.loadEnvFile?.(path.join(root, '.env'));
} catch {
  /* no .env file */
}

const config = loadConfig();
const gemini = createGeminiService({ apiKey: config.geminiApiKey, model: config.geminiModel });
const app = createApp({ config, gemini, distDir: path.join(root, 'dist-ai-lab') });

if (!gemini.configured) console.warn('[ai-lab] GEMINI_API_KEY is not set — AI endpoints will return "not_configured".');
if (!gateConfigured(config)) {
  console.warn('[ai-lab] AI_LAB_ACCESS_CODE (>= 8 chars) and AI_LAB_SESSION_SECRET (>= 32 chars) are required — nobody can sign in until both are set.');
}

app.listen(config.port, () => {
  console.log(`[ai-lab] listening on port ${config.port} (model: ${config.geminiModel})`);
});
