// UTME 2027 Builder experience configuration — a single Sanity singleton
// (same pattern as siteSettings/builderManifesto/founder) so TECHMED can
// change which Builder Cohort is currently active, or the confirmed
// tutorial dates, from Sanity Studio without a frontend deploy.
//
// channelUrl (the permanent, public UTME 2027 Builders Channel) is safe to
// fall back to a real, known URL if Sanity is unreachable — it's a real,
// stable destination. joinUrl (the currently active cohort's WhatsApp
// group) is never given a fallback URL: that link changes over time as
// cohorts fill, and fabricating one would send a student somewhere real
// but wrong. Its absence is a valid state the join page renders safely.
import { fetchSanity } from './sanity';

export interface BuilderSettings {
  active: boolean;
  channelUrl: string;
  channelLabel: string;
  joinUrl?: string;
  tutorialActive: boolean;
  tutorialTitle: string;
  tutorialDescription: string;
  tutorialStartDate?: string;
  tutorialEndDate?: string;
}

const FALLBACK_BUILDER_SETTINGS: BuilderSettings = {
  active: true,
  channelUrl: 'https://whatsapp.com/channel/0029Vb8nzXH545v4f8EF103D',
  channelLabel: 'UTME 2027 Builders Channel',
  tutorialActive: true,
  tutorialTitle: 'Free UTME 2027 Tutorials',
  tutorialDescription:
    'TECHMED is providing a free tutorial experience for UTME 2027 candidates. Full details are being finalized and will be shared with Builders as the season approaches.',
  tutorialStartDate: '2026-10-05',
  tutorialEndDate: '2026-11-09',
};

const BUILDER_SETTINGS_QUERY = `*[_id == "utmeBuilderSettings"][0]{
  active,
  channelUrl,
  channelLabel,
  joinUrl,
  tutorialActive,
  tutorialTitle,
  tutorialDescription,
  tutorialStartDate,
  tutorialEndDate
}`;

export async function getBuilderSettings(): Promise<BuilderSettings> {
  const settings = await fetchSanity<Partial<BuilderSettings>>(BUILDER_SETTINGS_QUERY, {});
  return {
    active: settings.active ?? FALLBACK_BUILDER_SETTINGS.active,
    channelUrl: settings.channelUrl || FALLBACK_BUILDER_SETTINGS.channelUrl,
    channelLabel: settings.channelLabel || FALLBACK_BUILDER_SETTINGS.channelLabel,
    joinUrl: settings.joinUrl || undefined,
    tutorialActive: settings.tutorialActive ?? FALLBACK_BUILDER_SETTINGS.tutorialActive,
    tutorialTitle: settings.tutorialTitle || FALLBACK_BUILDER_SETTINGS.tutorialTitle,
    tutorialDescription: settings.tutorialDescription || FALLBACK_BUILDER_SETTINGS.tutorialDescription,
    tutorialStartDate: settings.tutorialStartDate || FALLBACK_BUILDER_SETTINGS.tutorialStartDate,
    tutorialEndDate: settings.tutorialEndDate || FALLBACK_BUILDER_SETTINGS.tutorialEndDate,
  };
}

// "5 October" / "9 November 2026" — only includes the year on the end date
// when the two dates fall in different years, so the common case (a
// tutorial season inside one year) doesn't repeat itself.
export function formatDateRange(startISO?: string, endISO?: string): string | undefined {
  if (!startISO || !endISO) return undefined;
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;

  const dayMonth = (d: Date) => d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long' });
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = dayMonth(start);
  const endLabel = sameYear ? dayMonth(end) : end.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  return `${startLabel} — ${endLabel}`;
}
