// GROQ queries for the Knowledge Base / Blog. Kept in one place so the
// article shape only needs to change here when the schema changes.

const summaryProjection = /* groq */ `{
  title,
  "slug": slug.current,
  excerpt,
  featuredImage,
  "category": category->{title, "slug": slug.current},
  publishedAt,
  updatedAt,
  featured,
  order
}`;

const articleProjection = /* groq */ `{
  title,
  "slug": slug.current,
  excerpt,
  featuredImage,
  "category": category->{title, "slug": slug.current},
  tags,
  "author": author->{name, "slug": slug.current, role, image, bio},
  publishedAt,
  updatedAt,
  featured,
  order,
  body,
  relatedResources,
  relatedTools,
  relatedBlueprints,
  seo
}`;

export const ARTICLE_LIST_QUERY = /* groq */ `
  *[_type == "article" && defined(slug.current) && publishedAt <= now()]
    | order(featured desc, coalesce(order, 9999) asc, publishedAt desc)
    ${summaryProjection}
`;

export const ARTICLE_BY_SLUG_QUERY = /* groq */ `
  *[_type == "article" && slug.current == $slug && publishedAt <= now()][0]
    ${articleProjection}
`;

export const ARTICLE_SLUGS_QUERY = /* groq */ `
  *[_type == "article" && defined(slug.current) && publishedAt <= now()]{ "slug": slug.current }
`;

// Related-by-category is intentionally simple: same category, most recent
// first, excluding the current article. No recommendation algorithm.
export const RELATED_ARTICLES_QUERY = /* groq */ `
  *[_type == "article" && defined(slug.current) && publishedAt <= now()
    && slug.current != $slug && category->slug.current == $categorySlug]
    | order(publishedAt desc)[0...3]
    ${summaryProjection}
`;
