import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'builderManifesto',
  title: 'Builder Manifesto',
  type: 'document',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'The small heading shown above the manifesto lines.',
    }),
    defineField({
      name: 'lines',
      title: 'Lines',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'One entry per line, shown in order. Per the Campaign Operating Manual this should stay verbatim wherever it appears across the site.',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Builder Manifesto' };
    },
  },
});
