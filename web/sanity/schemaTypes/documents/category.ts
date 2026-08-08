import { defineField, defineType } from '../helpers';

// A small, CMS-managed taxonomy. Add/rename/retire categories from Sanity
// without touching frontend code. Seed examples (create these as documents
// in Sanity, not in code): Getting Started, JAMB / UTME, Syllabus, Subject
// Preparation, Study Strategy, Examination Strategy, Admission, Student
// Guides.
export default defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Optional. Can be used as an intro line on category-filtered views later.',
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
});
