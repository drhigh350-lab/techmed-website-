import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// TECHMED web foundation — static output, deployed to Cloudflare via the
// Cloudflare adapter's static-assets mode (no server rendering; this
// remains a fully static site, just packaged the way Cloudflare's
// unified Workers deploy pipeline expects).
export default defineConfig({
  site: 'https://techmedng.com',
  output: 'static',
  outDir: '../dist',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  adapter: cloudflare(),
  integrations: [sitemap()],
  redirects: {
    // /join's unique content (4H Standard, Builder Rules, the cohort-join
    // link) was folded into /utme-2027/builders itself, so a student never
    // has to click through a second page to reach it.
    '/utme-2027/builders/join': '/utme-2027/builders',
  },
});
