import { defineField, defineType } from 'sanity';

// TECHMED Quiz Hub. One document per quiz shown on the website.
// Works with any quiz platform (QuizBoot today, Kairo next): only the link changes.
// The quiz link and passcode of LOCKED quizzes are never sent to students who
// aren't entitled; the website's secure quiz-access server decides.

const SUBJECTS = ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Mixed / All'];
const PROGRAMMES = [
  'Daily Builder',
  'Weekly CBT Challenge',
  'Diagnostic',
  'Class Quiz',
  'Mock Exam',
  'Book Question Bank',
  'Operation 100',
  'Other',
];

export default defineType({
  name: 'quiz',
  title: 'Quiz',
  type: 'document',
  groups: [
    { name: 'card', title: 'Card', default: true },
    { name: 'access', title: 'Who can open it' },
    { name: 'schedule', title: 'Status & schedule' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'card',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'card',
      options: { source: 'title', maxLength: 90 },
      description: 'Used in the link: /quizzes/<slug>. Click Generate.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 2,
      group: 'card',
      description: '1–2 lines shown on the quiz card.',
      validation: (Rule) => Rule.max(240),
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'string',
      group: 'card',
      options: { list: SUBJECTS },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'topic', title: 'Topic', type: 'string', group: 'card' }),
    defineField({
      name: 'programme',
      title: 'Programme',
      type: 'string',
      group: 'card',
      options: { list: PROGRAMMES },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'questionCount',
      title: 'Number of questions',
      type: 'number',
      group: 'card',
      validation: (Rule) => Rule.min(1).integer(),
    }),
    defineField({
      name: 'durationMinutes',
      title: 'Time (minutes)',
      type: 'number',
      group: 'card',
      validation: (Rule) => Rule.min(1).integer(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image (optional)',
      type: 'image',
      group: 'card',
      options: { hotspot: true },
    }),
    defineField({ name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' }, group: 'card' }),
    defineField({
      name: 'featured',
      title: 'Featured / This week',
      type: 'boolean',
      group: 'card',
      initialValue: false,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order (optional)',
      type: 'number',
      group: 'card',
      description: 'Lower shows first. Leave empty to sort newest first.',
    }),

    // ---------------- Access ----------------
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'access',
      options: {
        list: [
          { title: 'Free: everyone can open it', value: 'free' },
          { title: 'Paid class: students on a plan', value: 'paid' },
          { title: 'Book bonus: students who own a book', value: 'book' },
          { title: 'Programme: e.g. Operation 100', value: 'programme' },
          { title: 'Hidden: never shown on the site', value: 'hidden' },
        ],
        layout: 'radio',
      },
      initialValue: 'free',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'minimumPlan',
      title: 'Lowest plan that can open it',
      type: 'string',
      group: 'access',
      description: 'Higher plans include lower ones: Ultimate includes Mastery, Mastery includes Core.',
      options: {
        list: [
          { title: 'Core (Core, Mastery and Ultimate)', value: 'core' },
          { title: 'Mastery (Mastery and Ultimate)', value: 'mastery' },
          { title: 'Ultimate only', value: 'ultimate' },
        ],
        layout: 'radio',
      },
      hidden: ({ parent }) => !['paid', 'programme'].includes(parent?.category),
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const cat = (ctx.parent as { category?: string })?.category;
          return cat === 'paid' && !value ? 'Choose the lowest plan for a paid class quiz' : true;
        }),
    }),
    defineField({
      name: 'linkedResource',
      title: 'Book (Book bonus)',
      type: 'reference',
      to: [{ type: 'resource' }],
      group: 'access',
      description: 'Students who own this book can open the quiz.',
      hidden: ({ parent }) => parent?.category !== 'book',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const cat = (ctx.parent as { category?: string })?.category;
          return cat === 'book' && !value ? 'Choose the book' : true;
        }),
    }),
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      group: 'access',
      options: { list: ['QuizBoot', 'Kairo', 'Other'], layout: 'radio' },
      initialValue: 'QuizBoot',
    }),
    defineField({
      name: 'quizUrl',
      title: 'Quiz link',
      type: 'url',
      group: 'access',
      description: 'For locked quizzes this is only given to students who can open it.',
      validation: (Rule) =>
        Rule.uri({ scheme: ['https'] }).custom((value, ctx) => {
          const p = ctx.parent as { category?: string; status?: string };
          if (p?.category === 'hidden' || p?.category === 'programme') return true;
          return value ? true : 'Add the quiz link';
        }),
    }),
    defineField({ name: 'quizKey', title: 'Quiz key (optional)', type: 'string', group: 'access' }),
    defineField({
      name: 'passcode',
      title: 'Passcode (optional)',
      type: 'string',
      group: 'access',
      description: 'Shown, with a copy button, only to students who can open the quiz.',
    }),
    defineField({
      name: 'isPublicOnPlatform',
      title: 'Is this quiz PUBLIC on the quiz platform?',
      type: 'boolean',
      group: 'access',
      initialValue: false,
      description:
        'If a locked quiz is public on QuizBoot, anyone with the link can take it. Make paid and book quizzes private with a passcode.',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const cat = (ctx.parent as { category?: string })?.category;
          return value && ['paid', 'book'].includes(cat || '')
            ? { message: 'Locked quiz is public on the platform: make it private with a passcode', level: 'warning' } as never
            : true;
        }),
    }),

    // ---------------- Status & schedule ----------------
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'schedule',
      options: { list: ['Draft', 'Live', 'Closed', 'Archived'], layout: 'radio' },
      initialValue: 'Live',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'opensAt',
      title: 'Opens at (optional)',
      type: 'datetime',
      group: 'schedule',
      description: 'Before this time the quiz shows as "Coming soon" (or stays hidden for Programme quizzes unless set below).',
    }),
    defineField({ name: 'closesAt', title: 'Closes at (optional)', type: 'datetime', group: 'schedule' }),
    defineField({
      name: 'comingSoonText',
      title: '"Coming soon" message (optional)',
      type: 'text',
      rows: 4,
      group: 'schedule',
      description: 'Shown before the quiz opens, e.g. what Operation 100 is and why it matters.',
    }),
    defineField({
      name: 'waitlistMessage',
      title: 'WhatsApp waitlist message (optional)',
      type: 'text',
      rows: 3,
      group: 'schedule',
      description: 'Use {name} where the student\'s name should go. Shown as a "Join the waitlist" button before the quiz opens.',
    }),
  ],
  orderings: [
    { title: 'Newest first', name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] },
    { title: 'Sort order', name: 'sortAsc', by: [{ field: 'sortOrder', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subject: 'subject', category: 'category', status: 'status', media: 'coverImage' },
    prepare({ title, subject, category, status, media }) {
      const cat = { free: 'Free', paid: 'Paid class', book: 'Book bonus', programme: 'Programme', hidden: 'Hidden' }[
        category as string
      ];
      return { title, subtitle: [cat, subject, status].filter(Boolean).join(' · '), media };
    },
  },
});
