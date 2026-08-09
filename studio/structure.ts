import type { StructureResolver } from 'sanity/structure';

// siteSettings, builderManifesto and founder are singletons — the seed
// script (web/scripts/seed.mjs) writes them to fixed document IDs, so the
// desk structure below links straight to that one document rather than
// offering a "create new" list, which would let someone create duplicates
// that the frontend's `*[_id == "..."][0]` queries would never see anyway.
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.listItem()
        .title('Builder Manifesto')
        .id('builderManifesto')
        .child(S.document().schemaType('builderManifesto').documentId('builderManifesto')),
      S.listItem()
        .title('Founder')
        .id('founder')
        .child(S.document().schemaType('founder').documentId('founder')),
      S.listItem()
        .title('UTME 2027 Builder Settings')
        .id('utmeBuilderSettings')
        .child(S.document().schemaType('utmeBuilderSettings').documentId('utmeBuilderSettings')),
      S.divider(),
      S.documentTypeListItem('faqItem').title('FAQ'),
      S.divider(),
      S.documentTypeListItem('resource').title('Resources'),
      S.documentTypeListItem('subject').title('JAMB Subjects'),
      S.documentTypeListItem('syllabusTopic').title('Syllabus Topics'),
      S.divider(),
      S.documentTypeListItem('article').title('Blog Articles'),
      S.documentTypeListItem('articleCategory').title('Blog Categories'),
    ]);
