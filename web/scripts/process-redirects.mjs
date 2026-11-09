import fs from 'node:fs';
import path from 'node:path';

/**
 * Deduplicates and validates Cloudflare Pages _redirects file after Astro build.
 * Ensures that Astro's @astrojs/cloudflare adapter appending behavior does not produce
 * duplicate source rules (which triggers Cloudflare deployment error 100324).
 */
export function cleanRedirectsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[process-redirects] File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const seenSources = new Map();
  const validRedirects = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;

    const source = parts[0];
    const destination = parts[1];
    const status = parts[2] || '301';

    // Disallow blanket wildcard redirection on /library/* that would break the reader
    if (source === '/library/*' || source === '/library/read/*') {
      console.warn(`[process-redirects] Skipping invalid reader wildcard redirect: ${source}`);
      continue;
    }

    if (seenSources.has(source)) {
      console.log(`[process-redirects] Deduplicated redundant rule for source: "${source}"`);
      continue;
    }

    seenSources.set(source, { source, destination, status });
    validRedirects.push({ source, destination, status });
  }

  // Ensure /library points to /resources/
  const libRule = seenSources.get('/library');
  if (libRule) {
    libRule.destination = '/resources/';
  } else {
    validRedirects.push({ source: '/library', destination: '/resources/', status: '301' });
    seenSources.set('/library', { source: '/library', destination: '/resources/', status: '301' });
  }

  // Ensure /utme-2027/builders/join points to /utme-2027/builders
  const joinRule = seenSources.get('/utme-2027/builders/join');
  if (!joinRule) {
    validRedirects.unshift({ source: '/utme-2027/builders/join', destination: '/utme-2027/builders', status: '301' });
  }

  const outputContent = validRedirects
    .map((r) => `${r.source.padEnd(28)} ${r.destination.padEnd(24)} ${r.status}`)
    .join('\n') + '\n';

  fs.writeFileSync(filePath, outputContent, 'utf8');
  console.log(`[process-redirects] Successfully formatted ${validRedirects.length} unique rules in ${filePath}`);
}

// When executed directly as a script
const distPaths = [
  path.resolve('dist/_redirects'),
  path.resolve('../dist/_redirects'),
];

for (const p of distPaths) {
  if (fs.existsSync(p)) {
    cleanRedirectsFile(p);
  }
}
