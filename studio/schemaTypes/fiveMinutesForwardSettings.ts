import { defineField, defineType } from 'sanity';

// Singleton for the /podcast page — a short "doorway" page introducing
// 5 Minutes Forward (TECHMED's daily growth podcast) and sending visitors
// to the real 5 Minutes Forward site. Same pattern as
// contactPageSettings/utmeBuilderSettings. Deliberately small: this page
// does not host episodes, so there is no archive/list content here — just
// the intro copy, one preview image, and the external link.
export default defineType({
  name: 'fiveMinutesForwardSettings',
  title: '5 Minutes Forward Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'heroTitle',
      title: 'Title',
      type: 'string',
      description: 'e.g. "5 Minutes Forward".',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 4,
      description: 'One short paragraph: what it is, why it exists, and that it\'s a daily few-minute habit. Keep this concise — the full experience lives on the 5 Minutes Forward site, not here.',
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview Image',
      type: 'image',
      options: { hotspot: true },
      description: 'A sneak-peek visual (e.g. a cover image or a still from the show). Optional — a placeholder is shown until one is uploaded.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA Label',
      type: 'string',
      description: 'Defaults to "Explore 5 Minutes Forward" if left blank.',
    }),
    defineField({
      name: 'externalUrl',
      title: '5 Minutes Forward Site URL',
      type: 'url',
      description: 'Where the primary CTA sends visitors. Currently forward.techmedng.com — change this single field if that ever moves, no code change needed.',
    }),
  ],
  preview: {
    prepare() {
      return { title: '5 Minutes Forward Settings' };
    },
  },
});
