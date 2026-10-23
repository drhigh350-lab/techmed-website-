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
      name: 'headline',
      title: 'Headline (optional)',
      type: 'string',
      description: 'Short prefix or title, e.g. "Ongoing: Free Foundation Protocol".',
    }),
    defineField({
      name: 'message',
      title: 'Message / Short Description',
      type: 'string',
      description: 'Keep this concise — it renders clearly on mobile and desktop.',
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'icon',
      title: 'Icon (optional)',
      type: 'image',
      options: { hotspot: true },
      description:
        'Optional small icon shown to the left of the message. Leave empty for a text-only banner.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA Label',
      type: 'string',
      description: 'e.g. "Join Now", "Learn More". Keep it short.',
    }),
    defineField({
      name: 'ctaUrl',
      title: 'CTA Link',
      type: 'string',
      description: 'A full URL (e.g. a WhatsApp link) or a path on this site (e.g. "/foundation-protocol").',
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date (optional)',
      type: 'datetime',
      description: 'If set, the announcement will not display before this date and time.',
    }),
    defineField({
      name: 'endDate',
      title: 'End Date (optional)',
      type: 'datetime',
      description: 'If set, the announcement will automatically expire after this date and time.',
    }),
    defineField({
      name: 'priority',
      title: 'Priority / Display Order',
      type: 'number',
      description: 'Higher numbers indicate higher priority.',
      initialValue: 0,
    }),
  ],
  preview: {
    select: { active: 'active', headline: 'headline', message: 'message' },
    prepare({ active, headline, message }) {
      const title = headline || message || 'Announcement Banner';
      return {
        title,
        subtitle: active ? (message || '(no message set)') : 'Inactive',
      };
    },
  },
});
