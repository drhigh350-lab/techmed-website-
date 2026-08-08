# Sanity content model — Knowledge Base / Blog

No Sanity Studio exists in this repo yet, and no project has been
provisioned (no project ID, dataset, or API token is configured anywhere in
the codebase or the connected Cloudflare account as of this writing). This
folder is the **canonical schema definition** for the article content
model described in the Knowledge Base brief — written so it can be dropped
into a Sanity Studio the moment one is set up, without redesigning the
shape.

## Why plain objects instead of the `sanity` package

`defineType`/`defineField` from the `sanity` package are identity helpers
used purely for editor DX and type inference inside a Studio project —
they don't change the resulting schema JSON. Installing the full `sanity`
package here (it pulls in ~1000 transitive packages, including React, for
the Studio UI) just to get those helpers would violate the "don't
introduce React unnecessarily" / "don't overbuild" constraints for what is
the Astro frontend, not the Studio. `helpers.ts` provides loosely-typed
local stand-ins with the same shape, so these files type-check standalone.
When a real Studio is created, either keep using these files as-is (they
work unmodified — Studio doesn't require importing the helpers from
`sanity`) or swap the two imports in `helpers.ts` for the real package.

## Structure

- `schemaTypes/documents/article.ts` — the Article document (title, slug,
  excerpt, body, featuredImage, category, tags, author, dates, featured,
  related-content arrays, seo, order).
- `schemaTypes/documents/category.ts` — a small, CMS-managed taxonomy
  (title + slug). Add/rename categories in Sanity without touching
  frontend code.
- `schemaTypes/documents/author.ts` — minimal author profile. Optional on
  every article — publishing doesn't require inventing a byline.
- `schemaTypes/objects/seo.ts` — reusable SEO object (title, description,
  canonical, social image). Embed this on other document types later
  instead of redefining SEO fields.
- `schemaTypes/objects/relatedLink.ts` — a lightweight "related content"
  pointer (title, url, description, image, kind) used by
  `relatedResources`, `relatedTools`, and `relatedBlueprints`.
- `schemaTypes/index.ts` — the exported array a Studio's `sanity.config.ts`
  would spread into `schema.types`.

## Why `relatedLink` instead of Sanity `reference`s

The brief asks articles to link to existing Resources, Tools, and
Blueprints — but none of those currently exist as Sanity document types
(the live Resources page is static HTML with no CMS behind it). Modeling
these as `reference` fields would require inventing a parallel
Resource/Tool schema in this same task, which the brief explicitly rules
out ("do not create a second CMS/content system", "do NOT create a
duplicate Blueprint system").

Instead, `relatedLink` is a small embedded object an editor fills in
directly (title, URL, short description, optional image, and a `kind` tag
for rendering). It points at whatever already resolves the destination —
today that's a path into the static site (e.g. `/resources.html#...`);
once Resources/Tools get real Sanity documents, each of the three fields
can be swapped from an array of objects to an array of references without
touching `article.ts`'s other fields or any frontend query shape beyond
that one field.

## Frontend query

`web/src/lib/sanity.ts` reads `PUBLIC_SANITY_PROJECT_ID` /
`PUBLIC_SANITY_DATASET` and is fail-soft: with no project configured (the
current state), every query returns an empty result and the site renders
its empty state instead of crashing the build.
