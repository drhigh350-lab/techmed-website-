// Sitewide announcement banner — a single Sanity singleton (same pattern
// as siteSettings/utmeBuilderSettings) so TECHMED can change it — free
// tutorials today, paid tutorials or JAMB/UTME news later — from Studio
// alone. No fallback content: an unreachable Sanity or an unseeded/unset
// document should simply show no banner, never an invented announcement.
import { fetchSanity } from './sanity';

export interface AnnouncementBanner {
  active: boolean;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
}

const BANNER_QUERY = `*[_id == "announcementBanner"][0]{active, message, ctaLabel, ctaUrl}`;

export async function getAnnouncementBanner(): Promise<AnnouncementBanner | null> {
  const banner = await fetchSanity<Partial<AnnouncementBanner> | null>(BANNER_QUERY, null);
  if (!banner || !banner.active || !banner.message || !banner.ctaLabel || !banner.ctaUrl) return null;
  return {
    active: true,
    message: banner.message,
    ctaLabel: banner.ctaLabel,
    ctaUrl: banner.ctaUrl,
  };
}
