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
  adapter: cloudflare(),
  integrations: [sitemap()],
});
