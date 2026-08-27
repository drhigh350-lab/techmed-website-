import { defineField, defineType } from 'sanity';

// Singleton for the /contact page's editable copy — same pattern as
// utmeBuilderSettings for the Builders page. Contact *identity* (phone
// number, social URLs) lives on siteSettings instead, since those are
// sitewide facts, not page copy; this document only holds the words
// around them. Every field has a safe, non-fabricated fallback in
// web/src/lib/contact.ts, so the page renders correctly even before this
// document is ever published.
export default defineType({
  name: 'contactPageSettings',
  title: 'Contact Page Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'heroTitle',
      title: 'Hero Title',
      type: 'string',
      description: 'e.g. "Need help? We\'re here."',
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero Subtitle',
      type: 'text',
      rows: 3,
      description: 'One short paragraph. What students can reach TECHMED for — questions, preparation support, issues along the way.',
    }),
    defineField({
      name: 'supportTopics',
      title: 'What Students Can Contact Us About',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'One short phrase per line, e.g. "Questions about your preparation journey". Keep this to real, deliverable support — not a promise of unlimited 1:1 tutoring.',
    }),
    defineField({
      name: 'supportDisclaimer',
      title: 'Support Disclaimer (optional)',
      type: 'string',
      description: 'A short honest line clarifying what this channel is not, e.g. that it is not a substitute for 1:1 tutoring. Leave blank to use the default.',
    }),
    defineField({
      name: 'proofHeading',
      title: 'Proof Section Heading',
      type: 'string',
    }),
    defineField({
      name: 'proofIntro',
      title: 'Proof Section Intro',
      type: 'text',
      rows: 3,
      description: 'Restrained framing copy for the credibility section — what TECHMED is built around, not a boast. Specific verified proof (outcomes, testimonials, credentials) is added separately as Proof Point entries.',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Contact Page Settings' };
    },
  },
});
