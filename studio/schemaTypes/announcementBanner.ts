import { defineField, defineType } from 'sanity';

// A single sitewide announcement strip — free tutorials, paid tutorials
// later, JAMB/UTME news, etc. Deliberately text-only, not image-based:
// this is a fully static site, so an image here would add real bytes and
// layout-shift risk to every single page load, while text costs almost
// nothing and is editable from here in seconds with no design/export step.
export default defineType({
  name: 'announcementBanner',
  title: 'Announcement Banner',
  type: 'document',
  fields: [
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Turn off to hide the banner sitewide without deleting its content.',
      initialValue: false,
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'string',
      description: 'Keep this to one short sentence — it renders on a single line on all screen sizes.',
      validation: (Rule) => Rule.max(140),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA Label',
      type: 'string',
      description: 'e.g. "Join the Builders Channel". Keep it short.',
    }),
    defineField({
      name: 'ctaUrl',
      title: 'CTA Link',
      type: 'string',
      description: 'A full URL (e.g. a WhatsApp link) or a path on this site (e.g. "/utme-2027/builders").',
    }),
  ],
  preview: {
    select: { active: 'active', message: 'message' },
    prepare({ active, message }) {
      return {
        title: 'Announcement Banner',
        subtitle: active ? (message || '(no message set)') : 'Inactive',
      };
    },
  },
});
