import { defineField, defineType } from 'sanity';

// Deliberately minimal — just enough to let editors add/rename a blog
// category from Studio without a code change. Suggested starting set
// (seeded by web/scripts/seed.mjs, not hardcoded here): Getting Started,
// JAMB / UTME, Syllabus, Subject Preparation, Study Strategy, Examination
// Strategy, Admission, Student Guides. Not the same taxonomy as `resource`
// categories (Academic, Admission, etc.) — those describe products; this
// describes editorial content, so it's a separate, smaller type rather
// than overloading resource's category enum.
export default defineType({
  name: 'articleCategory',
  title: 'Article Category',
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
      description: 'Not used in a route yet — reserved for a future /blog/category/<slug> filter view.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
});
