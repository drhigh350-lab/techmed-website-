// TECHMED Student Enrolment Roster & Package Entitlements Engine
// Sourced from authoritative UTME 2027 Programme Specifications
// Manages Core (20% discount), Mastery (included boosters), and Ultimate (bootcamps & mentorship).

import type { StudentEntitlement } from './supabase';

export type CohortTier = 'core' | 'mastery' | 'ultimate';

export interface EnrolledStudent {
  email: string;
  fullName: string;
  tier: CohortTier;
  enrolledAt: string;
  expiresAt: string; // Cohort validity through UTME 2027 (e.g. 2027-05-31)
  paymentReference: string;
  isMonthlyRenewal?: boolean;
  hasFounderMentorship?: boolean; // Ultimate-only confirmed grant (limited to 20 students)
  notes?: string;
}

// Default verified cohort roster (seeded from verified class enrolments)
// Students registering with these emails automatically receive their plan entitlements.
export const VERIFIED_ROSTER: EnrolledStudent[] = [
  {
    email: 'wisdomjohnson207@gmail.com',
    fullName: 'Wisdom Johnson',
    tier: 'ultimate',
    enrolledAt: '2026-10-01T00:00:00Z',
    expiresAt: '2027-05-31T23:59:59Z',
    paymentReference: 'TM-COHORT-ULT-001',
    hasFounderMentorship: true,
    notes: 'Confirmed Ultimate Builder with Founder Mentorship Seat #1',
  },
  {
    email: 'chinedu.okafor.prep@gmail.com',
    fullName: 'Chinedu Okafor',
    tier: 'mastery',
    enrolledAt: '2026-10-15T00:00:00Z',
    expiresAt: '2027-05-31T23:59:59Z',
    paymentReference: 'TM-COHORT-MAS-014',
    hasFounderMentorship: false,
    notes: 'Mastery Enrolment — All 3 booster systems included',
  },
  {
    email: 'aminat.bello.exam@gmail.com',
    fullName: 'Aminat Bello',
    tier: 'core',
    enrolledAt: '2026-10-20T00:00:00Z',
    expiresAt: '2027-02-21T23:59:59Z',
    paymentReference: 'TM-COHORT-COR-082',
    isMonthlyRenewal: false,
    hasFounderMentorship: false,
    notes: 'Core Enrolment (3 months upfront) — 20% discount on standalone e-books',
  },
];

// Resources included per cohort tier
export const TIER_INCLUSIONS: Record<CohortTier, string[]> = {
  core: [], // No free paid boosters included; eligible for 20% discount
  mastery: [
    'chemistry-booster',
    'biology-booster',
    'physics-booster',
  ],
  ultimate: [
    'chemistry-booster',
    'biology-booster',
    'physics-booster',
    'post-utme-brainstorming-hub',
    'operation-100',
  ],
};

export const MAX_MENTORSHIP_SEATS = 20;

// Count confirmed founder mentorship allocations across static and dynamic rosters
export function getConfirmedMentorshipCount(): number {
  const all = getAllEnrolledStudents();
  return all.filter(s => s.hasFounderMentorship).length;
}

// Check if an email is on the enrolled cohort roster
export function getEnrolledStudent(email?: string | null): EnrolledStudent | null {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  // Check in-memory roster
  const found = VERIFIED_ROSTER.find(s => s.email.toLowerCase() === cleanEmail);
  if (found) return found;

  // Check dynamic localStorage roster if available
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('techmed_dynamic_roster');
      if (stored) {
        const dynamicList: EnrolledStudent[] = JSON.parse(stored);
        const match = dynamicList.find(s => s.email.toLowerCase() === cleanEmail);
        if (match) return match;
      }
    } catch {}
  }

  return null;
}

// Check if student is eligible for the 20% discount on standalone e-books
// Only active (non-expired) Core, Mastery, and Ultimate cohort students qualify
export function isEligibleForCoreDiscount(email?: string | null): boolean {
  const student = getEnrolledStudent(email);
  if (!student) return false;
  // Expired cohorts are no longer eligible for active student discounts
  if (student.expiresAt && new Date(student.expiresAt).getTime() < Date.now()) {
    return false;
  }
  return true;
}

// Generate the entitlements array for an enrolled student based on their tier
// Enforces server/roster expiry: if cohort has expired, active entitlements are not granted
export function generateRosterEntitlements(
  email: string,
  userId?: string
): StudentEntitlement[] {
  const student = getEnrolledStudent(email);
  if (!student) return [];

  // If cohort expired, do not grant active cohort package inclusions
  const isExpired = student.expiresAt && new Date(student.expiresAt).getTime() < Date.now();
  if (isExpired) {
    return [];
  }

  const includedResourceIds = TIER_INCLUSIONS[student.tier] || [];
  const planId = `cohort-${student.tier}`;

  return includedResourceIds.map((resId) => ({
    id: `roster_${student.tier}_${resId}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    customerEmail: student.email,
    resourceId: resId,
    grantSource: 'plan_inclusion',
    planId,
    grantedAt: student.enrolledAt,
    expiresAt: student.expiresAt,
    isActive: true,
    resourceTitle: getResourceTitle(resId),
  }));
}

function getResourceTitle(id: string): string {
  switch (id) {
    case 'chemistry-booster':
      return 'Chemistry Booster System';
    case 'biology-booster':
      return 'Biology Booster System';
    case 'physics-booster':
      return 'Physics Booster System';
    case 'post-utme-brainstorming-hub':
      return 'Post Brainstorming Hub — All Universities';
    case 'operation-100':
      return 'Operation 100 — 2027 Edition';
    default:
      return id;
  }
}

// Add student to dynamic roster (used by admin portal)
// Enforces strict limit of 20 confirmed Founder Mentorship seats
export function addStudentToRoster(student: EnrolledStudent): void {
  if (typeof window === 'undefined') return;
  try {
    let list: EnrolledStudent[] = [];
    const stored = localStorage.getItem('techmed_dynamic_roster');
    if (stored) list = JSON.parse(stored);

    const existingIdx = list.findIndex(s => s.email.toLowerCase() === student.email.toLowerCase());
    const wasAlreadyMentorship = (existingIdx >= 0 && list[existingIdx].hasFounderMentorship) ||
      VERIFIED_ROSTER.some(s => s.email.toLowerCase() === student.email.toLowerCase() && s.hasFounderMentorship);

    if (student.hasFounderMentorship && !wasAlreadyMentorship) {
      const currentCount = getConfirmedMentorshipCount();
      if (currentCount >= MAX_MENTORSHIP_SEATS) {
        throw new Error(`Founder Mentorship seat limit reached (${MAX_MENTORSHIP_SEATS} seats max). Cannot allocate additional mentorship places.`);
      }
    }

    if (existingIdx >= 0) {
      list[existingIdx] = student;
    } else {
      list.push(student);
    }
    localStorage.setItem('techmed_dynamic_roster', JSON.stringify(list));
  } catch (err: any) {
    console.warn('Failed to save student to dynamic roster:', err);
    throw err;
  }
}

// Fetch all enrolled students (merges static verified roster and dynamic admin roster)
export function getAllEnrolledStudents(): EnrolledStudent[] {
  let combined = [...VERIFIED_ROSTER];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('techmed_dynamic_roster');
      if (stored) {
        const dynamicList: EnrolledStudent[] = JSON.parse(stored);
        for (const item of dynamicList) {
          const idx = combined.findIndex(c => c.email.toLowerCase() === item.email.toLowerCase());
          if (idx >= 0) {
            combined[idx] = item;
          } else {
            combined.push(item);
          }
        }
      }
    } catch {}
  }
  return combined;
}

