import article from './documents/article';
import author from './documents/author';
import category from './documents/category';
import blockContent from './objects/blockContent';
import relatedLink from './objects/relatedLink';
import seo from './objects/seo';

// Spread this into a Studio's sanity.config.ts: schema: { types: schemaTypes }
export const schemaTypes = [article, author, category, blockContent, relatedLink, seo];
