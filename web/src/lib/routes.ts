// Single source of truth for the site's routes — used by Navbar, Footer,
// and each placeholder page's metadata, so link labels/paths never drift
// out of sync between them.

export interface SiteRoute {
  label: string;
  path: string;
  /** Short description shown on the route's own placeholder page. */
  description: string;
}

// Primary navigation, in the order specified for the Navbar. "Legal" is
// intentionally excluded here — it lives in the footer only, not the nav.
export const NAV_ROUTES: SiteRoute[] = [
  { label: 'About', path: '/about', description: 'The story behind TECHMED and the Builder philosophy.' },
  { label: 'Builder Cohort', path: '/cohort', description: 'What a Builder Cohort is and how it works.' },
  { label: 'Resources', path: '/resources', description: 'Boosters, revision materials and structured resources.' },
  { label: 'Tools', path: '/tools', description: 'KAIRO, the Study Planner, CBT Practice and other tools.' },
  { label: 'Podcast', path: '/podcast', description: '5 Minutes Forward — a daily habit of intentional growth.' },
  { label: 'Blog', path: '/blog', description: 'Writing on strategy, preparation and the Builder journey.' },
  { label: 'Contact', path: '/contact', description: 'Get in touch with TECHMED.' },
];

export const LEGAL_ROUTE: SiteRoute = {
  label: 'Legal',
  path: '/legal',
  description: 'Terms, privacy and other legal information.',
};

export const ALL_ROUTES: SiteRoute[] = [...NAV_ROUTES, LEGAL_ROUTE];
