export interface SanityImage {
  asset?: { _ref: string; _type: 'reference' };
  alt?: string;
  caption?: string;
}

export interface RelatedLink {
  title: string;
  url: string;
  description?: string;
  image?: SanityImage;
}

export interface Category {
  title: string;
  slug: string;
  description?: string;
}

export interface Author {
  name: string;
  slug: string;
  role?: string;
  image?: SanityImage;
  bio?: string;
}

export interface ArticleSeo {
  title?: string;
  description?: string;
  canonical?: string;
  socialImage?: SanityImage;
}

export interface ArticleSummary {
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: SanityImage;
  category?: Category;
  publishedAt: string;
  updatedAt?: string;
  featured?: boolean;
  order?: number;
}

export interface Article extends ArticleSummary {
  tags?: string[];
  author?: Author;
  body: unknown[];
  relatedResources?: RelatedLink[];
  relatedTools?: RelatedLink[];
  relatedBlueprints?: RelatedLink[];
  seo?: ArticleSeo;
}
