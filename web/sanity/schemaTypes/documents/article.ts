import { defineField, defineType } from '../helpers';

// The Knowledge Base / Blog article. Every relationship field is optional —
// an article must render correctly with none of them set. See
// sanity/README.md for the reasoning behind relatedLink vs. reference.
export default defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Short summary shown on /blog/, and used as the meta description / OG description fallback when seo.description is empty.',
      validation: (Rule: any) => Rule.max(300),
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt text',
          validation: (Rule: any) => Rule.required(),
        },
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      description: 'Freeform, but keep it purposeful — e.g. "JAMB 2027", "Chemistry", "Past Questions". Not a replacement for Category.',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      description: 'Optional. When unset, the article page and structured data attribute the piece to TECHMED rather than inventing a byline.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated at',
      type: 'datetime',
      description: 'Optional. Set this when a meaningful revision is published; renders as "Updated <date>" alongside the publish date.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      description: 'Featured articles may be surfaced first on /blog/.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'relatedResources',
      title: 'Related resources',
      type: 'array',
      of: [{ type: 'relatedLink' }],
      description: 'e.g. a paid guide, a free download. Not the JAMB Blueprints specifically — see Related Blueprints below.',
    }),
    defineField({
      name: 'relatedTools',
      title: 'Related tools',
      type: 'array',
      of: [{ type: 'relatedLink' }],
      description: 'e.g. a quiz, a calculator, a practice tool.',
    }),
    defineField({
      name: 'relatedBlueprints',
      title: 'Related Blueprints',
      type: 'array',
      of: [{ type: 'relatedLink' }],
      description: 'The existing TECHMED JAMB Blueprint resources — TECHMED’s optimized presentation of the JAMB syllabus, not a replacement for it.',
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      description: 'Optional. Lower numbers sort first among featured articles. Leave unset to sort by publish date.',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'excerpt', media: 'featuredImage' },
  },
});
