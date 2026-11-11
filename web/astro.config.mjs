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
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  vite: {
    server: {
      strictPort: true,
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      allowedHosts: true,
    },
  },
  adapter: cloudflare(),
  integrations: [
    sitemap({
      // Keep private, utility and redirect-only URLs out of search results.
      // Each of these pages also carries <meta name="robots" content="noindex">.
      filter: (page) => {
        const path = new URL(page).pathname;
        const excluded = [
          /^\/dashboard\/?$/,
          /^\/login\/?$/,
          /^\/register\/?$/,
          /^\/account\//,
          /^\/admin\//,
          /^\/library(\/|$)/, // reader + admin + legacy redirect
          /^\/read\//,
          /^\/payment\//,
          /^\/cohort\/?$/,
          /^\/utme-2027\/builders\/join\/?$/,
          /^\/404\/?$/,
        ];
        return !excluded.some((rx) => rx.test(path));
      },
    }),
  ],
  redirects: {
    // /join's unique content (4H Standard, Builder Rules, the cohort-join
    // link) was folded into /utme-2027/builders itself, so a student never
    // has to click through a second page to reach it.
    '/utme-2027/builders/join': '/utme-2027/builders',
    // Retire redundant /library landing page; unify discovery & bookshelf at /resources
    '/library': '/resources/',
    // Old placeholder slug for the Organic Chemistry e-book.
    '/resources/organic-chemistry-mastery-manual': '/resources/organic-chemistry-mastery',
  },
});
