import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'utmeBuilderSettings',
  title: 'UTME 2027 Builder Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Internal Title',
      type: 'string',
      description: 'Studio-only label for this document. Never shown to visitors.',
    }),
    defineField({
      name: 'active',
      title: 'Builder Experience Active',
      type: 'boolean',
      description: 'Master switch for the whole /utme-2027/builders experience. Turn off to fall back to safe defaults everywhere it is used.',
      initialValue: true,
    }),
    defineField({
      name: 'channelUrl',
      title: 'Builders Channel URL',
      type: 'url',
      description: 'The permanent, public UTME 2027 Builders Channel — independent of any tutorial cohort. Used by every "Follow the Builders" call to action.',
    }),
    defineField({
      name: 'channelLabel',
      title: 'Builders Channel Label',
      type: 'string',
      description: 'How the permanent channel is referred to on the site, e.g. "UTME 2027 Builders Channel".',
    }),
    defineField({
      name: 'joinUrl',
      title: 'Current Cohort Join URL',
      type: 'url',
      description: 'The WhatsApp group for whichever Builder Cohort is currently active (e.g. Cohort A). Change this — and only this — to move new joins to a different cohort once one fills. Leave blank if no cohort is currently open; the join page will show a safe "being prepared" state instead of a broken link.',
    }),
    defineField({
      name: 'joinLabel',
      title: 'Current Cohort Internal Label',
      type: 'string',
      description: 'Studio-only reference for which cohort joinUrl currently points to, e.g. "Builder Cohort A". Never shown to visitors — students are never told which internal cohort they are joining.',
    }),
    defineField({
      name: 'tutorialActive',
      title: 'Free Tutorial Section Active',
      type: 'boolean',
      description: 'Shows/hides the "Free UTME 2027 Tutorial" section on the Builder landing page.',
      initialValue: true,
    }),
    defineField({
      name: 'tutorialTitle',
      title: 'Tutorial Title',
      type: 'string',
    }),
    defineField({
      name: 'tutorialDescription',
      title: 'Tutorial Description',
      type: 'text',
      rows: 3,
      description: 'Keep this to what is actually confirmed — do not describe subjects, schedule or teaching structure that has not been finalized.',
    }),
    defineField({
      name: 'tutorialStartDate',
      title: 'Tutorial Start Date',
      type: 'date',
    }),
    defineField({
      name: 'tutorialEndDate',
      title: 'Tutorial End Date',
      type: 'date',
    }),
  ],
  preview: {
    select: { active: 'active', joinLabel: 'joinLabel' },
    prepare({ active, joinLabel }) {
      return {
        title: 'UTME 2027 Builder Settings',
        subtitle: `${active ? 'Active' : 'Inactive'}${joinLabel ? ` — routing to ${joinLabel}` : ' — no cohort link set'}`,
      };
    },
  },
});
