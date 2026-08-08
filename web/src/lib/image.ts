import imageUrlBuilder from '@sanity/image-url';
import type { SanityImage } from './types';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

const builder = projectId ? imageUrlBuilder({ projectId, dataset }) : null;

/** Returns a Sanity CDN URL for an image field, or null if unavailable. */
export function imageUrl(
  image: SanityImage | undefined,
  { width, height }: { width?: number; height?: number } = {}
): string | null {
  if (!builder || !image?.asset?._ref) return null;

  let img = builder.image(image);
  if (width) img = img.width(width);
  if (height) img = img.height(height);
  return img.auto('format').url();
}
