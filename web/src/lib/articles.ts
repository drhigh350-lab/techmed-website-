// TECHMED Knowledge Base / Blog data model.
//
// Same fetchSanity + fallback pattern as resources.ts and syllabus.ts —
// FALLBACK_ARTICLES is deliberately empty. No article content exists yet;
// this file is infrastructure for publishing real TECHMED content next,
// not a place to invent it. An empty list is the correct, intentional
// fallback (both when Sanity is unreachable and when nothing's published
// yet) — the frontend renders a clean empty state for it, never fabricated
// articles.
import { toHTML, escapeHTML } from '@portabletext/to-html';
import type { PortableTextBlock } from '@portabletext/types';
import { fetchSanity } from './sanity';

export interface ArticleCategory {
  title: string;
  slug: string;
}

export interface ArticleAuthor {
  name?: string;
  role?: string;
  photoUrl?: string;
}

export interface RelatedResourceRef {
  title: string;
  slug: string;
  description?: string;
}

export interface RelatedBlueprintRef {
  name: string;
  slug: string;
  description?: string;
  /** Stage names only (no topics) — just enough to draw the StageFlow
   * diagram on a subject-specific article, not a full syllabus dump. */
  stages?: string[];
}

export interface ArticleFaqItem {
  question: string;
  answer: string;
}

export interface ArticleSeo {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  socialImage?: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  category?: ArticleCategory;
  tags?: string[];
  author?: ArticleAuthor;
  publishedAt: string;
  updatedAt?: string;
  featured?: boolean;
  body: PortableTextBlock[];
  relatedResources?: RelatedResourceRef[];
  relatedTools?: RelatedResourceRef[];
  relatedBlueprints?: RelatedBlueprintRef[];
  faq?: ArticleFaqItem[];
  seo?: ArticleSeo;
  /** True when this article should show the TECHMED Method diagram — set
   * deliberately per article, not inferred, since not every article is
   * about the seven-step system. */
  showMethodDiagram?: boolean;
  /** Shows a StageFlow diagram for the subject in relatedBlueprints[0] —
   * only meaningful on a subject-specific article with exactly one
   * relevant Blueprint, not the flagship piece that links all five. */
  showStageFlow?: boolean;
}

export const FALLBACK_ARTICLES: Article[] = [];

// Excludes drafts — see the identical fix/comment on SUBJECT_QUERY in
// syllabus.ts for why this matters: without it, an editor's unpublished
// draft can be returned instead of (or alongside) the real published
// document, since drafts share the same _type.
const ARTICLE_QUERY = `*[_type == "article" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
  "id": _id,
  "slug": slug.current,
  title,
  excerpt,
  "featuredImage": featuredImage.asset->url,
  "featuredImageAlt": featuredImage.alt,
  "category": category->{title, "slug": slug.current},
  tags,
  "author": {
    "name": author.name,
    "role": author.role,
    "photoUrl": author.photo.asset->url
  },
  publishedAt,
  updatedAt,
  featured,
  showMethodDiagram,
  showStageFlow,
  faq,
  body[]{
    ...,
    _type == "image" => {
      ...,
      "assetUrl": asset->url
    }
  },
  "relatedResources": relatedResources[]->{title, "slug": slug.current, description},
  "relatedTools": relatedTools[]->{title, "slug": slug.current, description},
  "relatedBlueprints": relatedBlueprints[]->{name, "slug": slug.current, description, "stages": stages[] | order(order asc).name},
  "seo": {
    "metaTitle": seo.metaTitle,
    "metaDescription": seo.metaDescription,
    "canonicalUrl": seo.canonicalUrl,
    "socialImage": seo.socialImage.asset->url
  }
}`;

export async function getArticles(): Promise<Article[]> {
  return fetchSanity<Article[]>(ARTICLE_QUERY, FALLBACK_ARTICLES);
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const articles = await getArticles();
  return articles.find((article) => article.slug === slug);
}

export function getFeaturedArticle(articles: Article[]): Article | undefined {
  return articles.find((article) => article.featured);
}

// Same-category first, falling back to shared tags, excluding the article
// itself — no manual "related articles" field to maintain per article.
export function getRelatedArticles(articles: Article[], current: Article, limit = 3): Article[] {
  const others = articles.filter((article) => article.slug !== current.slug);

  const sameCategory = current.category
    ? others.filter((article) => article.category?.slug === current.category?.slug)
    : [];

  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const currentTags = new Set(current.tags ?? []);
  const sharedTags = others.filter(
    (article) => !sameCategory.includes(article) && (article.tags ?? []).some((tag) => currentTags.has(tag)),
  );

  return [...sameCategory, ...sharedTags].slice(0, limit);
}

// Restricted to the block styles/marks/types actually enabled on the
// `article.body` schema (see studio/schemaTypes/article.ts) — this is a
// serializer over structured, known content types, not an HTML injection
// path. escapeHTML (used internally by defaultComponents for plain text)
// keeps anything an editor types as body text safe by default.
export function renderArticleBody(body: PortableTextBlock[]): string {
  return toHTML(body, {
    components: {
      types: {
        image: ({ value }) => {
          const alt = escapeHTML(typeof value.alt === 'string' ? value.alt : '');
          const src = typeof value.assetUrl === 'string' ? value.assetUrl : '';
          if (!src) return '';
          return `<img src="${escapeHTML(src)}" alt="${alt}" loading="lazy" decoding="async" />`;
        },
      },
      marks: {
        link: ({ children, value }) => {
          const href = typeof value?.href === 'string' ? value.href : '#';
          const isExternal = /^https?:\/\//.test(href);
          const rel = isExternal ? ' target="_blank" rel="noopener"' : '';
          return `<a href="${escapeHTML(href)}"${rel}>${children}</a>`;
        },
      },
    },
  });
}
