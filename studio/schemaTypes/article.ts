import type { ComponentType } from 'react';
import { defineField, defineType, type ArrayOfObjectsInputProps } from 'sanity';
import { MarkdownPasteInput } from '../components/MarkdownPasteInput';

// The TECHMED Knowledge Base / Blog content model. Body uses Sanity's
// standard portable-text block content — restricted to the block styles,
// list types and marks the frontend serializer (web/src/lib/articles.ts)
// actually renders, plus inline images. This is not a raw-HTML field: an
// editor can never inject arbitrary markup, only the structured content
// types enabled below, same safety posture as every other rich-text-ish
// field in this schema set (see resources.ts's note on why thumbnail SVGs
// are developer-authored only).
//
// relatedBlueprints references `subject` documents, not a separate
// Blueprint type — the JAMB Subject documents (with their previewImage/
// guideFile) already are the Blueprints. relatedTools references
// `resource` too, since there's no standalone tool document type yet
// (Kairo is itself a `resource`) — same target type as relatedResources,
// kept as a separate field because the frontend renders them as distinct
// sections with different framing copy.
export default defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      description: 'Used at /blog/<slug>. Changing this after publishing breaks existing links.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Shown on the article card and used as the meta description fallback. Keep it to 1-2 sentences.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Shown at the top of the article and on its card. Used as the default social-share image when no SEO social image is set.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Describe the image for screen readers and search engines.',
        }),
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'articleCategory' }],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'object',
      description: 'Leave empty to show the article as written by TECHMED, rather than guessing or leaving it blank.',
      fields: [
        defineField({ name: 'name', title: 'Name', type: 'string' }),
        defineField({ name: 'role', title: 'Role', type: 'string' }),
        defineField({ name: 'photo', title: 'Photo', type: 'image', options: { hotspot: true } }),
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      description: 'Only set this when the article has been meaningfully revised after publishing.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Shows this article in the highlighted spot at the top of /blog. Same convention as a Resource\'s Featured flag.',
      initialValue: false,
    }),
    defineField({
      name: 'showMethodDiagram',
      title: 'Show the TECHMED Method Diagram',
      type: 'boolean',
      description: 'Shows the seven-step (Understand -> Prepare) visual near the top of the article. Only turn this on for articles that actually walk through the Method — not every article should show it.',
      initialValue: false,
    }),
    defineField({
      name: 'showStageFlow',
      title: 'Show the Subject Stage Flow',
      type: 'boolean',
      description:
        'Shows a visual flow of the Blueprint stages for the FIRST subject in Related Blueprints below. Only meaningful on a subject-specific article with exactly one relevant subject — not the flagship piece that links all five.',
      initialValue: false,
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      description:
        'Write directly, or draft elsewhere (e.g. ChatGPT) and paste in — pasting Markdown-formatted text (## headings, **bold**, - bullets, [links](url)) auto-converts into real formatted blocks instead of landing as literal symbols.',
      // Sanity's field-level `components.input` type is a union covering
      // every possible array shape (primitives, objects, portable text);
      // MarkdownPasteInput only handles the portable-text one, which this
      // field actually is. The runtime contract matches; only the union
      // widens beyond what any single component could satisfy.
      components: { input: MarkdownPasteInput as unknown as ComponentType<ArrayOfObjectsInputProps> },
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({ name: 'href', title: 'URL', type: 'url', validation: (Rule) => Rule.required() }),
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'faq',
      title: 'Frequently Asked Questions',
      type: 'array',
      description: 'Optional. Kept as structured Q&A rather than part of the body so it can render as a real accordion and power FAQPage structured data — not just prose that happens to look like questions.',
      of: [
        {
          type: 'object',
          name: 'faqItem',
          fields: [
            defineField({ name: 'question', title: 'Question', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'answer', title: 'Answer', type: 'text', rows: 3, validation: (Rule) => Rule.required() }),
          ],
          preview: { select: { title: 'question' } },
        },
      ],
    }),
    defineField({
      name: 'relatedResources',
      title: 'Related Resources',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'resource' }] }],
      description: 'Boosters, guides and other TECHMED Resources genuinely relevant to this article.',
    }),
    defineField({
      name: 'relatedTools',
      title: 'Related Tools',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'resource' }] }],
      description: 'e.g. Kairo — tools currently live as `resource` documents too, no separate tool type exists yet.',
    }),
    defineField({
      name: 'relatedBlueprints',
      title: 'Related Blueprints',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'subject' }] }],
      description: 'JAMB Subject Blueprints this article connects to, e.g. "Want the full Chemistry syllabus?"',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      description: 'All optional — each falls back to the article\'s own title/excerpt/URL/featured image when left empty.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: 'metaTitle', title: 'Meta Title', type: 'string' }),
        defineField({ name: 'metaDescription', title: 'Meta Description', type: 'text', rows: 2 }),
        defineField({ name: 'canonicalUrl', title: 'Canonical URL', type: 'url' }),
        defineField({ name: 'socialImage', title: 'Social Image', type: 'image', options: { hotspot: true } }),
      ],
    }),
  ],
  orderings: [
    { title: 'Published, newest first', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'category.title', media: 'featuredImage' },
  },
});
