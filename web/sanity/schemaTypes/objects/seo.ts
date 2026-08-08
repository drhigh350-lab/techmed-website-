import { defineField, defineType } from '../helpers';

// Reusable SEO object. If other document types (Resources, Tools, the
// Blueprints) get their own Sanity documents later, embed this same type
// on them instead of redefining SEO fields per document.
export default defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'SEO title',
      type: 'string',
      description: 'Overrides the article title in <title> and Open Graph. Leave blank to use the article title.',
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      description: 'Overrides the article excerpt for meta description and Open Graph/Twitter. Leave blank to use the excerpt.',
    }),
    defineField({
      name: 'canonical',
      title: 'Canonical URL',
      type: 'url',
      description: 'Only set this if the canonical article lives elsewhere. Leave blank to canonicalize to this article’s own URL.',
    }),
    defineField({
      name: 'socialImage',
      title: 'Social share image',
      type: 'image',
      description: 'Used for Open Graph/Twitter cards. Falls back to the featured image, then a site default, when not set.',
      options: { hotspot: true },
    }),
  ],
});
