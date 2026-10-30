import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: '/', // ✅ REQUIRED

    plugins: [react()],

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    // NOTE: never inject server secrets (e.g. GEMINI_API_KEY) via `define` — they would ship in the public bundle.
    // Gemini is called only from server/ (see AI_LAB.md).

    optimizeDeps: {
      esbuildOptions: {
        sourcemap: false,
      },
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
