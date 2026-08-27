import { defineField, defineType } from 'sanity';

const CATEGORIES = ['Outcome', 'Achievement', 'Testimonial', 'Experience', 'Credential', 'Other'];

// Restrained, progressively-filled credibility items for the Contact page
// (and reusable anywhere else a small proof section is needed later). No
// document exists here until someone adds one in Studio — the Contact page
// never shows a fabricated stat, testimonial or result. Same list pattern
// as faqItem: plain documents ordered by `order`, no singleton wrapper.
export default defineType({
  name: 'proofPoint',
  title: 'Proof Point',
  type: 'document',
  fields: [
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: CATEGORIES },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'statement',
      title: 'Statement',
      type: 'text',
      rows: 3,
      description: 'The verified proof itself, in plain language — a real outcome, achievement, testimonial, credential, etc. Only add what can actually be verified.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution (optional)',
      type: 'string',
      description: 'Who or what this is attributed to, e.g. a name, cohort, or credential holder. Leave blank if not applicable.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Controls display order (lower numbers first).',
      validation: (Rule) => Rule.required().integer(),
    }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'statement', subtitle: 'category' },
    prepare({ title, subtitle }) {
      return { title, subtitle };
    },
  },
});
