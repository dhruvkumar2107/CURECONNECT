// Separate build for the CureConnect AI Vision mini-site (served by server/index.mjs at /ai-lab).
// Kept apart from the main site's build so it ships no analytics, Firebase or third-party fonts.
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'ai-lab'),
  base: '/ai-lab/',
  plugins: [react()],
  // Own stylesheet only; do not pick up the main site's Tailwind/PostCSS pipeline.
  css: { postcss: { plugins: [] } },
  // No VITE_* variables are needed by this bundle; never expose secrets through `define`.
  envPrefix: 'AI_LAB_PUBLIC_',
  build: {
    outDir: path.resolve(__dirname, 'dist-ai-lab'),
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: { polyfill: false },
  },
  server: {
    port: 3001,
    // `npm run dev:ai-lab` + `npm run start:ai-lab`: API calls are proxied to the local server.
    proxy: { '/api/ai-lab': 'http://localhost:8787' },
  },
});
