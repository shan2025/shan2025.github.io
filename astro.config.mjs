import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Pages are static; only /api/chat runs on the server (as a Vercel function), so the AI key stays secret.
export default defineConfig({
  site: 'https://shadin.xyz',
  output: 'static',
  adapter: vercel(),
  build: { format: 'directory' },
});
