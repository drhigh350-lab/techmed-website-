import { toHTML } from '@portabletext/to-html';
import { imageUrl } from './image';

/**
 * Renders an article's Portable Text body to semantic HTML. This is
 * structured-content rendering, not raw HTML injection — Sanity's block
 * content is a typed tree, and only the handful of node types below (all
 * defined in sanity/schemaTypes/objects/blockContent.ts) get a renderer.
 * There is no path from CMS input to arbitrary HTML/script output.
 */
export function renderBody(body: unknown[] | undefined): string {
  if (!body || body.length === 0) return '';

  return toHTML(body as any, {
    components: {
      types: {
        image: ({ value }) => {
          const src = imageUrl(value, { width: 1200 });
          if (!src) return '';
          const alt = escapeAttr(value.alt || '');
          const caption = value.caption
            ? `<figcaption>${escapeAttr(value.caption)}</figcaption>`
            : '';
          return `<figure><img src="${src}" alt="${alt}" loading="lazy" />${caption}</figure>`;
        },
      },
      marks: {
        link: ({ value, children }) => {
          const href = value?.href || '#';
          const isExternal = /^https?:\/\//i.test(href);
          const rel = isExternal ? ' rel="noopener noreferrer" target="_blank"' : '';
          return `<a href="${escapeAttr(href)}"${rel}>${children}</a>`;
        },
      },
    },
  });
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
