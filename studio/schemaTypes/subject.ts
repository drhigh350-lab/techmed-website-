import { defineField, defineType } from 'sanity';

// The JAMB/UTME syllabus hub's subject-level content. One document per
// subject (Mathematics, Physics, Chemistry, Biology, Use of English).
// Stages/topics are modelled as an embedded outline (not standalone
// documents) because at this stage they're navigational structure, not
// individual pages — see syllabusTopic.ts for the standalone document
// type used once a topic gets its own full deep-dive page.
export default defineType({
  name: 'subject',
  title: 'JAMB Subject',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'e.g. "Chemistry", "Use of English".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      description: 'Used at /jamb-syllabus/<slug>.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      validation: (Rule) => Rule.integer(),
    }),
    defineField({
      name: 'topicCount',
      title: 'Official Topic Count',
      type: 'number',
      description: 'The number of topics in JAMB\'s official syllabus for this subject, if the subject is organized by numbered topics (leave empty for Use of English).',
    }),
    defineField({
      name: 'keyDependencies',
      title: 'Key Dependency Note',
      type: 'text',
      rows: 3,
      description: 'Optional: which topics this subject\'s guidance identifies as major dependency points for later topics. Only fill this in when TECHMED has actually documented this for the subject — do not guess.',
    }),
    defineField({
      name: 'stages',
      title: 'TECHMED Stage Structure',
      type: 'array',
      description: "TECHMED's own reorganization of the official syllabus into conceptual stages. This is TECHMED's interpretation, not JAMB's official sectioning — the page must say so.",
      of: [
        {
          type: 'object',
          name: 'stage',
          fields: [
            defineField({ name: 'name', title: 'Stage Name', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'order', title: 'Order', type: 'number', validation: (Rule) => Rule.required().integer() }),
            defineField({
              name: 'topics',
              title: 'Topics',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'topicRef',
                  fields: [
                    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
                    defineField({
                      name: 'slug',
                      title: 'Slug',
                      type: 'string',
                      description: 'Used at /jamb-syllabus/<subject>/<slug> once this topic has its own syllabusTopic document. Leave empty until then.',
                    }),
                    defineField({
                      name: 'examWeight',
                      title: 'Exam Weight',
                      type: 'object',
                      description: 'From the TECHMED Blueprint\'s yield badge (e.g. "HIGH YIELD · ~4-5 of 40"). A directional guide, not an official JAMB figure -- leave empty rather than estimate if no Blueprint badge exists yet for this topic.',
                      fields: [
                        defineField({ name: 'min', title: 'Min Questions', type: 'number', validation: (Rule) => Rule.integer().min(0) }),
                        defineField({ name: 'max', title: 'Max Questions', type: 'number', validation: (Rule) => Rule.integer().min(0) }),
                        defineField({
                          name: 'tier',
                          title: 'Tier',
                          type: 'string',
                          options: { list: ['foundational', 'low', 'medium', 'high'] },
                        }),
                      ],
                      preview: {
                        select: { min: 'min', max: 'max', tier: 'tier' },
                        prepare({ min, max, tier }) {
                          return { title: tier ? `${tier} · ~${min}-${max}` : undefined };
                        },
                      },
                    }),
                    defineField({
                      name: 'prerequisites',
                      title: 'Prerequisites',
                      type: 'array',
                      of: [{ type: 'string' }],
                      description: 'Titles of other topics in this same subject that the Blueprint states this one requires (not just "helps with"). Must match another topic\'s Title exactly, elsewhere in this subject\'s stage list.',
                    }),
                  ],
                  preview: { select: { title: 'title' } },
                },
              ],
            }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'order' },
            prepare({ title, subtitle }) {
              return { title, subtitle: subtitle ? `Stage ${subtitle}` : undefined };
            },
          },
        },
      ],
    }),
    defineField({
      name: 'examStructure',
      title: 'Exam Structure (Use of English only)',
      type: 'array',
      description: 'The section-by-section question breakdown, where JAMB publishes one (currently only Use of English). Leave empty for other subjects.',
      of: [
        {
          type: 'object',
          name: 'examSection',
          fields: [
            defineField({ name: 'section', title: 'Section', type: 'string' }),
            defineField({ name: 'area', title: 'Area', type: 'string' }),
            defineField({ name: 'questions', title: 'Questions', type: 'number' }),
          ],
        },
      ],
    }),
    defineField({
      name: 'requiredText',
      title: 'Required Reading Text (Use of English only)',
      type: 'string',
      description: 'e.g. "The Lekki Headmaster".',
    }),
    defineField({
      name: 'relatedResourceSlug',
      title: 'Related Resource Slug',
      type: 'string',
      description: 'Slug of a matching product in the resource catalogue (e.g. "chemistry-booster-system"), if one exists. Leave empty if none does.',
    }),
    defineField({
      name: 'previewImage',
      title: 'Roadmap Preview Image',
      type: 'image',
      options: { hotspot: true },
      description: 'The subject roadmap graphic shown on the subject page. Leave empty to show a "coming soon" placeholder instead.',
    }),
    defineField({
      name: 'guideFile',
      title: 'Guide Document (PDF)',
      type: 'file',
      options: { accept: '.pdf' },
      description: 'The full subject guide students can view and download. Leave empty until the document is ready — the page shows a "Full guide coming soon" state instead of a broken link.',
    }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'topicCount' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? `${subtitle} topics` : undefined };
    },
  },
});
