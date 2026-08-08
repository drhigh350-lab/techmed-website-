import { defineField, defineType } from 'sanity';

// A full deep-dive page for a single syllabus topic (e.g. "Chemical
// Combination" under Chemistry). Deliberately a separate, heavier
// document from subject.ts's embedded topic outline — a topic only gets
// one of these once it has genuine TECHMED guidance content to publish,
// not just because it's named in the official syllabus. An empty list of
// these documents is the expected, correct state until that content
// exists; the /jamb-syllabus/[subject]/[topic] route reads from here and
// simply builds no pages until then.
export default defineType({
  name: 'syllabusTopic',
  title: 'Syllabus Topic',
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
      description: 'Used at /jamb-syllabus/<subject>/<slug>. Should match the slug entered on the parent subject\'s topic outline.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'reference',
      to: [{ type: 'subject' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'officialScope',
      title: 'Official JAMB Scope',
      type: 'text',
      rows: 4,
      description: 'What is directly represented in the official JAMB syllabus for this topic. Clearly labeled as official on the page — do not blend with TECHMED\'s own guidance here.',
    }),
    defineField({
      name: 'whyThisMatters',
      title: 'Why This Matters',
      type: 'text',
      rows: 3,
      description: "TECHMED's guidance — why this topic is worth a student's attention.",
    }),
    defineField({
      name: 'beforeYouStart',
      title: 'Before You Start',
      type: 'text',
      rows: 3,
      description: "TECHMED's guidance — prerequisite topics/concepts a student should have before this one.",
    }),
    defineField({
      name: 'thisTopicUnlocks',
      title: 'This Topic Unlocks',
      type: 'text',
      rows: 3,
      description: "TECHMED's guidance — what later topics depend on this one.",
    }),
    defineField({
      name: 'commonTraps',
      title: 'Common Traps',
      type: 'array',
      of: [{ type: 'string' }],
      description: "TECHMED's guidance — mistakes students commonly make on this topic.",
    }),
    defineField({
      name: 'historicalAnalysis',
      title: 'Historical Analysis',
      type: 'text',
      rows: 3,
      description: 'Past-paper pattern observations, e.g. how often this topic tends to appear. Must be presented as a directional estimate, never as an official JAMB figure.',
    }),
    defineField({
      name: 'relatedTopics',
      title: 'Related Topics',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'syllabusTopic' }] }],
      description: 'Prevents this page from being an orphan and gives students a next/related step.',
    }),
    defineField({
      name: 'relatedResources',
      title: 'Related Resources',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'resource' }] }],
      description: 'Existing products/tools in the resource catalogue relevant to this topic (e.g. the subject\'s Booster System).',
    }),
    defineField({
      name: 'practiceUrl',
      title: 'Practice URL',
      type: 'string',
      description: 'Link to practice questions for this topic, once one exists (e.g. a future /practice/<subject>/<topic> page or an external quiz link). Leave empty until real practice content exists.',
    }),
    defineField({
      name: 'metaTitle',
      title: 'Meta Title Override',
      type: 'string',
      description: 'Search-intent-aligned title, e.g. "JAMB Chemistry Mole Concept: What to Know & Common Mistakes | TECHMED". Falls back to an auto-generated title if left empty.',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description Override',
      type: 'text',
      rows: 2,
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'subject.name' },
  },
});
