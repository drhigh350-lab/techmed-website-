import { defineField, defineType } from 'sanity';
import { SealedUrlInput, SEALED_PREFIX } from '../components/SealedInput';

// Easy Access Zone: live-class links. Students see the right link on their
// dashboard. Links are only ever given to students whose plan (or 3-day grace
// period) covers them, by the website's secure server, never in page code.
export default defineType({
  name: 'classLink',
  title: 'Class Link',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', description: 'e.g. Chemistry: Mole Concept (Week 2)', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'string',
      options: { list: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'General'] },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'topic', title: 'Topic', type: 'string' }),
    defineField({
      name: 'kind',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Subject classroom (always on)', value: 'classroom' },
          { title: 'Scheduled live class', value: 'session' },
        ],
        layout: 'radio',
      },
      initialValue: 'classroom',
    }),
    defineField({
      name: 'startsAt',
      title: 'Date & time',
      type: 'datetime',
      hidden: ({ parent }) => parent?.kind !== 'session',
    }),
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      options: { list: ['Telegram', 'WhatsApp', 'Google Meet', 'Zoom', 'Other'] },
      initialValue: 'Telegram',
    }),
    defineField({
      name: 'url',
      title: 'Class link',
      type: 'url',
      description: 'Free community groups only. Everyone can see this link.',
      hidden: ({ parent }) => parent?.minimumPlan !== 'free',
      validation: (Rule) =>
        Rule.uri({ scheme: ['https'] }).custom((value, ctx) =>
          (ctx.parent as { minimumPlan?: string })?.minimumPlan === 'free' && !value ? 'Add the link' : true,
        ),
    }),
    defineField({
      name: 'sealedUrl',
      title: 'Class link (locked)',
      type: 'string',
      description: 'Type the link and press "Lock & save". Only students whose plan covers this class will receive it.',
      components: { input: SealedUrlInput },
      hidden: ({ parent }) => parent?.minimumPlan === 'free',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          if (value && !String(value).startsWith(SEALED_PREFIX)) return 'Press "Lock & save" so the link is protected';
          return (ctx.parent as { minimumPlan?: string })?.minimumPlan !== 'free' && !value ? 'Add the class link' : true;
        }),
    }),
    defineField({
      name: 'minimumPlan',
      title: 'Lowest plan that can see it',
      type: 'string',
      description: 'Higher plans include lower ones: Ultimate includes Mastery, Mastery includes Core.',
      options: {
        list: [
          { title: 'Everyone (free community group)', value: 'free' },
          { title: 'Core (Core, Mastery and Ultimate)', value: 'core' },
          { title: 'Mastery (Mastery and Ultimate)', value: 'mastery' },
          { title: 'Ultimate only', value: 'ultimate' },
        ],
        layout: 'radio',
      },
      initialValue: 'core',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'notes', title: 'Note for students (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'active',
      title: 'Show on dashboard',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { title: 'title', subject: 'subject', plan: 'minimumPlan', active: 'active' },
    prepare({ title, subject, plan, active }) {
      return { title, subtitle: [subject, plan && `from ${plan}`, active === false ? 'hidden' : null].filter(Boolean).join(' · ') };
    },
  },
});
