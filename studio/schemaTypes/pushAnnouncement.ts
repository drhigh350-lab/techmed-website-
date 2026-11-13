import { defineField, defineType } from 'sanity';

// A notification you write yourself. Once published, it is sent as a push
// notification (within 5 minutes, or at "Send at") and appears in the bell on
// the website. Each announcement is sent only once.
export default defineType({
  name: 'announcement',
  title: 'Notification',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Short and clear, e.g. "Mock exam opens tomorrow at 8 PM". Emojis are fine.',
      validation: (Rule) => Rule.required().max(65),
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required().max(180),
    }),
    defineField({
      name: 'audience',
      title: 'Send to',
      type: 'string',
      options: {
        list: [
          { title: 'Everyone', value: 'all' },
          { title: 'Free students only', value: 'free' },
          { title: 'Paid students only (Core, Mastery, Ultimate)', value: 'paid' },
        ],
        layout: 'radio',
      },
      initialValue: 'all',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'link',
      title: 'Opens this page when tapped',
      type: 'string',
      description: 'A page on the website, e.g. /quizzes, /pricing, /dashboard, /resources. Leave empty for the dashboard.',
      options: {
        list: [
          { title: 'Dashboard', value: '/dashboard' },
          { title: 'Quizzes', value: '/quizzes' },
          { title: 'Pricing / Enrol', value: '/pricing' },
          { title: 'Resources', value: '/resources' },
        ],
      },
    }),
    defineField({
      name: 'sendAt',
      title: 'Send at (optional)',
      type: 'datetime',
      description: 'Leave empty to send within 5 minutes of publishing. Must be within 24 hours of the scheduled time to go out.',
    }),
  ],
  orderings: [{ title: 'Newest first', name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] }],
  preview: {
    select: { title: 'title', audience: 'audience', sendAt: 'sendAt' },
    prepare({ title, audience, sendAt }) {
      const who = { all: 'Everyone', free: 'Free students', paid: 'Paid students' }[audience as string] || 'Everyone';
      return { title, subtitle: `${who}${sendAt ? ` · ${new Date(sendAt).toLocaleString()}` : ''}` };
    },
  },
});
