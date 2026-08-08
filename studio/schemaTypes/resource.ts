import { defineField, defineType } from 'sanity';

const CATEGORIES = ['Academic', 'Admission', 'Quizzes', 'Digital Tools', 'Growth', 'Opportunities'];
const TYPES = ['Guide', 'Blueprint', 'Booster System', 'Quiz', 'Tool', 'Course', 'Webinar', 'Opportunity', 'Other'];

export default defineType({
  name: 'resource',
  title: 'Resource',
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
      description: 'Used in the URL: /resources/<slug>. Changing this after publishing breaks existing links.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Shown on the resource card and as the page description. Keep it to 1-2 sentences.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: CATEGORIES },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: { list: TYPES },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Free or Paid',
      type: 'string',
      options: { list: ['free', 'paid'] },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Leave empty for free resources, or for a paid resource whose price is not public yet ("Price coming soon" is shown instead).',
      hidden: ({ document }) => document?.status !== 'paid',
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'NGN',
      hidden: ({ document }) => document?.status !== 'paid',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Controls position on the Resources page — lower numbers first. Same convention as FAQ ordering.',
      validation: (Rule) => Rule.integer(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Shows this resource in the highlighted Featured Resource area near the top of the page. Independent of Display Order.',
      initialValue: false,
    }),
    defineField({
      name: 'primaryImage',
      title: 'Primary Image',
      type: 'image',
      options: { hotspot: true },
      description: 'The canonical image for this resource — used on the card, the detail page, and as the social-share (Open Graph) image. Leave empty to show a category icon instead.',
    }),
    defineField({
      name: 'previewImages',
      title: 'Preview Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      description: 'Optional additional images shown on the resource detail page (e.g. sample pages, screenshots).',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'actionLabel',
      title: 'Action Label',
      type: 'string',
      description: 'Verb-first CTA label, e.g. "View Guide", "Start Quiz", "Open Tool". Never "Buy" for a free resource.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'accessUrl',
      title: 'Access URL',
      type: 'string',
      description: 'Internal or external URL for free resources / direct-access tools, e.g. /tools or a PDF path.',
    }),
    defineField({
      name: 'paystackUrl',
      title: 'Paystack Payment Link',
      type: 'url',
      description: 'A static Paystack Payment Link, if one exists for this product. Leave empty to hide the "Buy with Paystack" button rather than show a broken link.',
      hidden: ({ document }) => document?.status !== 'paid',
    }),
    defineField({
      name: 'whatsappUrl',
      title: 'WhatsApp Link',
      type: 'url',
      description: 'A wa.me link, ideally with a pre-filled message for this specific product.',
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      description: 'For resources that live entirely off-site (e.g. a partner quiz platform).',
    }),
    defineField({
      name: 'whatsIncluded',
      title: "What's Included",
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Shown as a bullet list on the resource detail page.',
    }),
    defineField({
      name: 'whoItsFor',
      title: "Who It's For",
      type: 'text',
      rows: 2,
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
    select: { title: 'title', subtitle: 'category', media: 'primaryImage' },
  },
});
