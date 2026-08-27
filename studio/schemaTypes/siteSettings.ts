import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
    }),
    defineField({
      name: 'whatsappChannelUrl',
      title: 'WhatsApp Channel URL',
      type: 'url',
      description: 'Used by every "Become a Builder" call to action across the site.',
    }),
    defineField({
      name: 'whatsappNumber',
      title: 'WhatsApp / SMS / Call Number',
      type: 'string',
      description:
        'International format, digits only, no spaces or plus sign (e.g. "2347044255045" for 07044255045). Drives the WhatsApp, SMS and Call actions on the Contact page. Currently a personal number — replace this single field with a dedicated TECHMED support number whenever one exists; nothing else needs to change.',
      validation: (Rule) => Rule.regex(/^\d{10,15}$/, { name: 'digits only, international format' }),
    }),
    defineField({
      name: 'instagramUrl',
      title: 'Instagram URL',
      type: 'url',
    }),
    defineField({
      name: 'facebookUrl',
      title: 'Facebook URL',
      type: 'url',
      description: 'Shown on the Contact page. Note: the Footer currently links a separate, older Facebook page — see that component if the two should be reconciled.',
    }),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube URL',
      type: 'url',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Site Settings' };
    },
  },
});
