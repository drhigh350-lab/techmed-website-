import { defineField, defineType } from '../helpers';

// A pointer to an existing TECHMED asset (a Resource/Blueprint, a Tool,
// another article) that isn't itself a Sanity document yet. See
// sanity/README.md for why this is a plain object rather than a
// `reference` field.
export default defineType({
  name: 'relatedLink',
  title: 'Related link',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'string',
      description: 'A site path (e.g. /resources.html#chemistry-blueprint) or a full URL.',
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Short description',
      type: 'string',
      description: 'One sentence on why this is relevant here, e.g. "The full JAMB Chemistry syllabus, broken into a study-ready blueprint."',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Optional. Falls back to a plain text link if not set.',
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'url' },
  },
});
