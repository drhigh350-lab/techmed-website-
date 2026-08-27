import { defineField, defineType } from 'sanity';

// A single sitewide announcement strip — free tutorials, paid tutorials
// later, JAMB/UTME news, etc. Text is the primary content: this is a
// fully static site, so a full banner IMAGE would add real bytes and
// layout-shift risk to every single page load, while text costs almost
// nothing and is editable from here in seconds with no design/export
// step. The optional icon image below is small and deliberately
// constrained (see its description) so it stays cheap even when set.
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
      name: 'icon',
      title: 'Icon (optional)',
      type: 'image',
      options: { hotspot: true },
      description:
        'Optional small icon shown to the left of the message (e.g. a logo mark or a small graphic). Keep it simple — this renders at about 24px tall, not as a banner image. Leave empty for a text-only banner.',
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
