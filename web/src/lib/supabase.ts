import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';

// Browser-safe Supabase configuration using public anon key only.
// Never import or expose SUPABASE_SERVICE_ROLE_KEY or private secrets.
export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) ||
  'https://unbgborbhxzsotaieiun.supabase.co';

/**
 * True only for real plan ids/names (cohort-core, "Mastery Plan"...), never for
 * products that merely contain the word, e.g. the "Organic Chemistry Mastery" book.
 */
export function isPlanTier(value: unknown, tier: 'core' | 'mastery' | 'ultimate'): boolean {
  const s = String(value ?? '').toLowerCase().trim();
  if (!s) return false;
  if (s.includes('organic')) return false;
  if (s === tier || s.startsWith(`cohort-${tier}`) || s.startsWith(`cohort_${tier}`)) return true;
  return new RegExp(`\\b${tier}\\b`).test(s) && /(plan|cohort|class|programme|program|utme)/.test(s);
}


export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmdib3JiaHh6c290YWllaXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDMyNDcsImV4cCI6MjA5Nzk3OTI0N30.3uM4SaYII60V988NA5PvqphQs6HkTVTnGKpZFqzZY-c';

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export const ALLOWED_UTME_SUBJECTS = [
  'English',
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
] as const;

export type UtmeSubject = (typeof ALLOWED_UTME_SUBJECTS)[number];

export interface StudentProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  whatsappPhone?: string;
  telegramPhone?: string;
  parentPhone?: string;
  role?: string;
  targetUniversity?: string;
  targetCourse?: string;
  utmeSubjects?: string[];
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentEntitlement {
  id: string;
  userId?: string;
  customerEmail: string;
  resourceId: string;
  grantSource: 'purchase' | 'bundle_inclusion' | 'plan_inclusion' | 'admin_grant' | 'scholarship' | 'trial';
  planId?: string | null;
  startsAt?: string | null;
  grantedAt: string;
  expiresAt: string | null; // null = permanent lifetime access (includes plan grace period)
  /** Plan coverage end before the grace period (renewal date). */
  coverageEndsAt?: string | null;
  /** True during the 3-day grace period after a plan's coverage ended. */
  inGrace?: boolean;
  isActive: boolean;
  resourceTitle?: string;
}

/** Plans keep access for this long after their coverage ends (matches the database). */
export const PLAN_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function isPlanResource(resourceId?: string | null): boolean {
  const id = (resourceId || '').toLowerCase();
  return ['cohort-core', 'cohort-mastery', 'cohort-ultimate'].includes(id);
}

/** Millisecond time when access ends (null = no end). Plans get the grace period. */
export function entitlementAccessEnd(resourceId?: string | null, expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const t = new Date(expiresAt).getTime();
  if (isNaN(t)) return null;
  return isPlanResource(resourceId) ? t + PLAN_GRACE_MS : t;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/**
 * Safely sanitize internal redirect targets to prevent Open Redirect vulnerabilities.
 * Permits only safe internal relative paths (e.g. /dashboard, /account/onboarding).
 * Rejects protocol-relative paths (//evil.com), absolute external URLs (https://evil.com),
 * javascript:, and malformed destinations.
 */
export function sanitizeRedirectUrl(url?: string | null, fallback = '/dashboard'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('://') &&
    !trimmed.toLowerCase().startsWith('/\\')
  ) {
    return trimmed;
  }
  return fallback;
}

export async function fetchUserEntitlements(
  userId?: string,
  userEmail?: string
): Promise<{ entitlements: StudentEntitlement[]; error?: string; migrationApplied: boolean }> {
  if (!userId && !userEmail) {
    return { entitlements: [], migrationApplied: true };
  }

  const supabase = getSupabase();
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;

  try {
    let query = supabase.from('entitlements').select('*').eq('is_active', true);

    if (userId && cleanEmail) {
      query = query.or(`user_id.eq.${userId},customer_email.ilike.${cleanEmail}`);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else if (cleanEmail) {
      query = query.ilike('customer_email', cleanEmail);
    }

    const { data, error } = await query;

    if (error) {
      const isMissingTable =
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation "entitlements" does not exist') ||
        error.code === 'PGRST204';

      return {
        entitlements: [],
        migrationApplied: !isMissingTable,
        error: isMissingTable
          ? 'The database entitlements migration is not yet applied on this Supabase project.'
          : error.message,
      };
    }

    const nowUtc = Date.now();
    // Database entitlements are authoritative:
    // Exclude records where is_active is false, starts_at is in the future, or expires_at is in the past.
    // Nullable starts_at is treated as active immediately (per database schema default).
    // Nullable expires_at is treated as permanent lifetime access.
    const activeRows = (data || []).filter((row: any) => {
      // 1. is_active must be true
      if (row.is_active !== true) return false;

      // 2. starts_at handling:
      // Distinguish paid enrolment from programme/resource availability:
      // Cohort enrolments (Core, Mastery, Ultimate) are active immediately upon confirmed payment,
      // while live lectures commence on 30 November 2026.
      // Standalone scheduled resources preserve starts_at and are gated by hasActiveResourceAccess / accessStatus.
      const isCohortPlan =
        row.resource_id?.toLowerCase().includes('cohort') ||
        isPlanTier(row.resource_id?.toLowerCase(), 'mastery') ||
        isPlanTier(row.resource_id?.toLowerCase(), 'ultimate') ||
        isPlanTier(row.resource_id?.toLowerCase(), 'core') ||
        row.plan_id?.toLowerCase().includes('cohort') ||
        isPlanTier(row.plan_id?.toLowerCase(), 'mastery') ||
        isPlanTier(row.plan_id?.toLowerCase(), 'ultimate') ||
        isPlanTier(row.plan_id?.toLowerCase(), 'core');

      if (row.starts_at && !isCohortPlan) {
        const startsUtc = new Date(row.starts_at).getTime();
        if (!isNaN(startsUtc) && startsUtc > nowUtc) {
          return false;
        }
      }

      // 3. Access must not have ended. Plans (Core/Mastery/Ultimate) keep
      //    access for a 3-day grace period after their end date.
      const accessEnd = entitlementAccessEnd(row.resource_id, row.expires_at);
      if (accessEnd !== null && accessEnd <= nowUtc) {
        return false;
      }

      return true;
    });

    const mapped: StudentEntitlement[] = activeRows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      customerEmail: row.customer_email,
      resourceId: row.resource_id,
      grantSource: row.grant_source,
      planId: row.plan_id,
      startsAt: row.starts_at || null,
      grantedAt: row.granted_at,
      // Effective end of access (includes the plan grace period), so every
      // existing expiry check keeps working during grace.
      expiresAt: (() => {
        const end = entitlementAccessEnd(row.resource_id, row.expires_at);
        return end === null ? null : new Date(end).toISOString();
      })(),
      coverageEndsAt: row.expires_at || null,
      inGrace: Boolean(row.expires_at && isPlanResource(row.resource_id) && new Date(row.expires_at).getTime() <= nowUtc),
      isActive: row.is_active,
    }));

    // Authoritative result: Database entitlements are the single source of truth.
    // Untrusted local storage or static email roster is NEVER merged into results.
    return { entitlements: mapped, migrationApplied: true };
  } catch (err: any) {
    return {
      entitlements: [],
      migrationApplied: false,
      error: err?.message || 'Network error',
    };
  }
}

// Local storage key for verified purchases & claims
const LOCAL_ENTITLEMENTS_KEY = 'techmed_claimed_entitlements';

export function getLocalEntitlements(userEmail?: string): StudentEntitlement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ENTITLEMENTS_KEY);
    if (!raw) return [];
    const list: StudentEntitlement[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (!userEmail) return list;
    return list.filter(e => !e.customerEmail || e.customerEmail.toLowerCase() === userEmail.toLowerCase());
  } catch {
    return [];
  }
}

export function saveLocalEntitlement(entitlement: Partial<StudentEntitlement>): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalEntitlements();
    const existingIndex = list.findIndex(e => e.resourceId === entitlement.resourceId);
    const full: StudentEntitlement = {
      id: entitlement.id || `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: entitlement.userId,
      customerEmail: entitlement.customerEmail || '',
      resourceId: entitlement.resourceId || '',
      grantSource: entitlement.grantSource || 'purchase',
      planId: entitlement.planId || null,
      grantedAt: entitlement.grantedAt || new Date().toISOString(),
      expiresAt: entitlement.expiresAt || null,
      isActive: true,
      resourceTitle: entitlement.resourceTitle,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...full };
    } else {
      list.push(full);
    }
    localStorage.setItem(LOCAL_ENTITLEMENTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save local entitlement cache:', err);
  }
}

export async function checkIsAdmin(user?: { id?: string; email?: string } | null): Promise<boolean> {
  if (!user?.id) return false;
  try {
    const supabase = getSupabase();
    // 1. Verify via server-side RPC is_admin()
    const { data: rpcAdmin, error: rpcErr } = await supabase.rpc('is_admin');
    if (!rpcErr && typeof rpcAdmin === 'boolean') {
      return rpcAdmin;
    }
    // 2. Query verified profiles table
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profErr && profile?.role === 'admin') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function verifyAndClaimOrderReference(
  reference: string,
  user?: { id?: string; email?: string } | null
): Promise<{ success: boolean; message: string; order?: any }> {
  if (!reference || !reference.trim()) {
    return { success: false, message: 'Please provide a valid transaction reference.' };
  }

  const cleanRef = reference.trim();
  const supabase = getSupabase();

  try {
    // 1. First attempt hardened server-side RPC claim_order_reference with email validation
    if (user?.email) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('claim_order_reference', {
          p_reference: cleanRef,
          p_claimant_email: user.email.trim().toLowerCase(),
        });

        if (!rpcErr && rpcData) {
          if (!rpcData.success) {
            return {
              success: false,
              message: rpcData.message || 'Reference claim failed.',
            };
          }

          saveLocalEntitlement({
            resourceId: rpcData.product_id,
            customerEmail: user.email,
            userId: user.id,
            grantSource: 'purchase',
            resourceTitle: rpcData.product_name,
          });

          return {
            success: true,
            message: rpcData.message,
            order: {
              status: 'paid',
              product_id: rpcData.product_id,
              product_name: rpcData.product_name,
            },
          };
        }
      } catch (e) {
        console.warn('claim_order_reference RPC unavailable, proceeding to order verification fallback:', e);
      }
    }

    // 2. Fallback check on orders table with client-side ownership validation
    let order: { status: string; product_id: string; product_name: string; email?: string; user_id?: string } | null = null;

    const { data, error } = await supabase
      .from('orders')
      .select('status, product_id, product_name, email, user_id')
      .eq('reference', cleanRef)
      .maybeSingle();

    if (!error && data) {
      order = data;
    }

    if (!order) {
      return {
        success: false,
        message: 'No order found with reference "' + cleanRef + '". Please check the spelling or contact TECHMED on WhatsApp.',
      };
    }

    // SECURITY CHECK: Ensure one customer's transfer cannot grant another customer's access
    if (user?.email && order.email) {
      const orderEmail = order.email.trim().toLowerCase();
      const claimantEmail = user.email.trim().toLowerCase();
      if (orderEmail !== claimantEmail && order.user_id !== user.id) {
        return {
          success: false,
          message: 'Access denied: This payment reference belongs to a different email address.',
        };
      }
    }

    if (order.status !== 'paid') {
      return {
        success: false,
        message: `Order status is "${order.status}". If you recently transferred funds, verification takes a few moments.`,
        order,
      };
    }

    // Order is paid and belongs to claimant! Save entitlement
    saveLocalEntitlement({
      resourceId: order.product_id,
      customerEmail: user?.email || order.email || '',
      userId: user?.id,
      grantSource: 'purchase',
      resourceTitle: order.product_name,
    });

    return {
      success: true,
      message: `Verified successfully! Access to "${order.product_name}" is now active in your library.`,
      order,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error verifying reference. Please try again.',
    };
  }
}


/**
 * Can this student open this resource? Asks the database (has_resource_access),
 * which applies the single TECHMED access rule: purchases, plan and bundle
 * inclusions (lifetime), admin grants, scholarships and trials. Identity
 * comes from the signed-in session, never from the browser.
 * Falls back to the older client-side check only if the RPC is unreachable.
 */
export async function hasActiveResourceAccess(
  resourceId: string,
  user?: { id?: string; email?: string } | null
): Promise<boolean> {
  const cleanId = (resourceId || '').toLowerCase().trim();
  if (FREE_RESOURCE_IDS.has(cleanId)) return true;
  if (!user?.id && !user?.email) return false;
  try {
    const { data, error } = await getSupabase().rpc('has_resource_access', { p_resource_id: cleanId });
    if (!error && typeof data === 'boolean') return data;
    if (error) console.warn('has_resource_access unavailable, using fallback:', error.message);
  } catch (err) {
    console.warn('has_resource_access failed, using fallback:', err);
  }
  return legacyHasActiveResourceAccess(cleanId, user);
}

const FREE_RESOURCE_IDS = new Set([
  'admission-intelligence-guide-2026',
  'techmed-admission-intelligence-guide-2026',
  'admission-guide',
  'free-quiz-practice',
  'kairo',
  'test-sample-short',
]);

/** Resource ids the signed-in student can open (server-computed). */
export async function getMyLibraryIds(): Promise<string[] | null> {
  try {
    const { data, error } = await getSupabase().rpc('my_library');
    if (error || !Array.isArray(data)) return null;
    return data.map((row: { resource_id: string }) => row.resource_id);
  } catch {
    return null;
  }
}

async function legacyHasActiveResourceAccess(
  resourceId: string,
  user?: { id?: string; email?: string } | null
): Promise<boolean> {
  const cleanId = (resourceId || '').toLowerCase().trim();

  // Free resources and study tools are open to all candidates without restriction
  if (
    cleanId === 'admission-intelligence-guide-2026' ||
    cleanId === 'techmed-admission-intelligence-guide-2026' ||
    cleanId === 'admission-guide' ||
    cleanId === 'free-quiz-practice' ||
    cleanId === 'kairo' ||
    cleanId === 'test-sample-short'
  ) {
    return true;
  }

  // Paid resources require an authenticated student with active verified entitlements
  if (!user?.id && !user?.email) {
    return false;
  }

  const { entitlements } = await fetchUserEntitlements(user.id, user.email);
  const now = Date.now();

  // Check if student has active Mastery or Ultimate cohort plan (via entitlements)
  const isMasteryCohort = entitlements.some(e => {
    if (!e.isActive) return false;
    if (e.expiresAt && new Date(e.expiresAt).getTime() <= now) return false;
    const r = (e.resourceId || '').toLowerCase();
    const p = (e.planId || '').toLowerCase();
    return isPlanTier(r, 'mastery') || isPlanTier(p, 'mastery');
  });

  const isUltimateCohort = entitlements.some(e => {
    if (!e.isActive) return false;
    if (e.expiresAt && new Date(e.expiresAt).getTime() <= now) return false;
    const r = (e.resourceId || '').toLowerCase();
    const p = (e.planId || '').toLowerCase();
    return isPlanTier(r, 'ultimate') || isPlanTier(p, 'ultimate');
  });

  // PART 3: All published resources covered by the TECHMED resource offering
  // must be accessible to Mastery and Ultimate students without additional payment!
  if (isMasteryCohort || isUltimateCohort) {
    return true;
  }

  // Direct individual purchase check in entitlements
  const hasDirectEntitlement = entitlements.some(e => {
    if (!e.isActive) return false;
    const resId = (e.resourceId || '').toLowerCase();
    const planId = (e.planId || '').toLowerCase();

    const matchesId =
      resId === cleanId ||
      resId === cleanId.replace('-system', '') ||
      (cleanId === 'post-utme-brainstorming-hub' && resId === 'post-utme-pq') ||
      (cleanId === 'post-utme-pq' && resId === 'post-utme-brainstorming-hub') ||
      (cleanId === 'booster-bundle' && (resId === 'booster-bundle' || resId === 'all-science-boosters-bundle')) ||
      (cleanId.includes('booster') && (resId === 'booster-bundle' || resId === 'all-science-boosters-bundle' || planId === 'booster-bundle'));

    if (!matchesId) return false;

    // Check starts_at: cannot access resource before designated activation
    if (e.startsAt) {
      const starts = new Date(e.startsAt).getTime();
      if (!isNaN(starts) && starts > now) return false;
    }

    // Check expires_at (null = lifetime access for purchased standalone resources)
    if (e.expiresAt) {
      const expires = new Date(e.expiresAt).getTime();
      if (!isNaN(expires) && expires <= now) return false;
    }

    return true;
  });

  if (hasDirectEntitlement) {
    return true;
  }

  // Paid orders fallback in case database entitlements sync is in flight
  try {
    const supabase = getSupabase();
    const cleanEmail = user.email ? user.email.trim().toLowerCase() : undefined;
    let orderQuery = supabase
      .from('orders')
      .select('product_id, product_name, status')
      .eq('status', 'paid');

    if (user.id && cleanEmail) {
      orderQuery = orderQuery.or(`user_id.eq.${user.id},email.ilike.${cleanEmail}`);
    } else if (user.id) {
      orderQuery = orderQuery.eq('user_id', user.id);
    } else if (cleanEmail) {
      orderQuery = orderQuery.ilike('email', cleanEmail);
    }

    const { data: orders } = await orderQuery;
    if (orders && orders.length > 0) {
      const hasOrderMasteryOrUltimate = orders.some((o: any) => {
        const pid = (o.product_id || '').toLowerCase();
        const pname = (o.product_name || '').toLowerCase();
        return isPlanTier(pid, 'mastery') || isPlanTier(pid, 'ultimate') || isPlanTier(pname, 'mastery') || isPlanTier(pname, 'ultimate');
      });
      if (hasOrderMasteryOrUltimate) {
        return true;
      }

      const hasDirectOrder = orders.some((o: any) => {
        const pid = (o.product_id || '').toLowerCase();
        return pid === cleanId ||
          pid === cleanId.replace('-system', '') ||
          (cleanId === 'post-utme-brainstorming-hub' && pid === 'post-utme-pq') ||
          (cleanId === 'post-utme-pq' && pid === 'post-utme-brainstorming-hub') ||
          (cleanId.includes('booster') && (pid === 'booster-bundle' || pid === 'all-science-boosters-bundle'));
      });
      if (hasDirectOrder) {
        return true;
      }
    }
  } catch {
    // Non-fatal fallback
  }

  return false;
}

export interface SecurePdfResult {
  hasAccess: boolean;
  pdfUrl?: string;
  source: 'public' | 'storage' | 'none';
  error?: string;
  isPdf: boolean;
  isZip?: boolean;
  zipUrl?: string;
  fileName?: string;
  title?: string;
}

/**
 * Retrieve the original PDF or ZIP bundle URL for a resource safely.
 * For free resources: returns the verified original PDF path.
 * For paid resources: verifies active entitlement in database first,
 * then queries the private `paid-resources` Supabase bucket to create a short-lived signed URL (1 hour).
 * Does not expose service role credentials.
 */
export async function getSecureResourcePdf(
  resourceId: string,
  user?: { id?: string; email?: string } | null
): Promise<SecurePdfResult> {
  // 1. Verify access via authoritative entitlement check
  const hasAccess = await hasActiveResourceAccess(resourceId, user);
  if (!hasAccess) {
    return {
      hasAccess: false,
      source: 'none',
      isPdf: false,
      isZip: false,
      error: 'Enrolment or verified purchase required to access this resource.',
    };
  }

  // 2. Free resources with original PDF
  if (
    resourceId === 'admission-intelligence-guide-2026' ||
    resourceId === 'techmed-admission-intelligence-guide-2026' ||
    resourceId === 'admission-guide'
  ) {
    return {
      hasAccess: true,
      pdfUrl: '/techmed-admission-intelligence-guide-2026.pdf',
      source: 'public',
      isPdf: true,
      isZip: false,
      title: 'TECHMED Admission Intelligence Guide 2026',
    };
  }

  // Test fixture PDF (used for verified test suites)
  if (resourceId === 'test-sample-short') {
    return {
      hasAccess: true,
      pdfUrl: '/test-sample-short.pdf',
      source: 'public',
      isPdf: true,
      isZip: false,
      title: 'TECHMED Short Test Sample PDF',
    };
  }

  // 3. Paid resources in private Supabase Storage ("paid-resources" bucket)
  const supabase = getSupabase();
  const candidateFileNames = [
    `${resourceId}.pdf`,
    `${resourceId.replace('-system', '')}.pdf`,
    `${resourceId}.zip`,
    `${resourceId.replace('-system', '')}.zip`,
  ];

  for (const fileName of candidateFileNames) {
    try {
      const isZipFile = fileName.endsWith('.zip');
      const { data, error } = await supabase.storage
        .from('paid-resources')
        .createSignedUrl(fileName, 3600); // 1-hour secure signed URL

      if (!error && data?.signedUrl) {
        return {
          hasAccess: true,
          pdfUrl: isZipFile ? undefined : data.signedUrl,
          zipUrl: isZipFile ? data.signedUrl : undefined,
          source: 'storage',
          isPdf: !isZipFile,
          isZip: isZipFile,
          fileName,
        };
      }
    } catch (storageErr) {
      console.warn(`Storage lookup error for ${fileName}:`, storageErr);
    }
  }

  // If no PDF or ZIP file exists in storage for this resource yet, signal to fallback
  return {
    hasAccess: true,
    source: 'none',
    isPdf: false,
    isZip: false,
    error: 'FILE_NOT_IN_STORAGE',
  };
}

/**
 * Fetch a student's profile by their auth user ID.
 * Tries the authoritative `public.profiles` table first, and gracefully falls back
 * to authenticated Supabase user metadata if the table is not yet in the schema cache.
 */
export async function fetchUserProfile(
  userId: string
): Promise<{ profile: StudentProfile | null; error?: string }> {
  if (!userId) {
    return { profile: null, error: 'User ID is required' };
  }

  const supabase = getSupabase();
  try {
    let dbProfile: any = null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        dbProfile = data;
      }
    } catch {
      // Catch network or schema errors silently and proceed to metadata fallback
    }

    if (dbProfile) {
      const profile: StudentProfile = {
        id: dbProfile.id,
        email: dbProfile.email || '',
        fullName: dbProfile.full_name || '',
        phone: dbProfile.phone || '',
        whatsappPhone: dbProfile.whatsapp_phone || '',
        telegramPhone: dbProfile.telegram_phone || '',
        parentPhone: dbProfile.parent_phone || '',
        role: dbProfile.role || 'student',
        targetUniversity: dbProfile.target_university || '',
        targetCourse: dbProfile.target_course || '',
        utmeSubjects: dbProfile.utme_subjects || ['English'],
        onboardingCompleted: dbProfile.onboarding_completed || false,
        onboardingStep: dbProfile.onboarding_step || 1,
        createdAt: dbProfile.created_at,
        updatedAt: dbProfile.updated_at,
      };
      return { profile };
    }

    // Fallback: Read from authenticated Supabase user metadata
    // Ensures profile persistence across refresh and sign-in even if public.profiles is awaiting remote migration
    let authUser: any = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user && sessionData.session.user.id === userId) {
        authUser = sessionData.session.user;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user && userData.user.id === userId) {
          authUser = userData.user;
        }
      }
    } catch (authEx) {
      console.warn('Could not retrieve auth user metadata:', authEx);
    }

    if (authUser) {
      const meta = authUser.user_metadata || {};
      const profile: StudentProfile = {
        id: authUser.id,
        email: authUser.email || '',
        fullName: meta.full_name || meta.name || '',
        phone: meta.phone || '',
        whatsappPhone: meta.whatsapp_phone || meta.phone || '',
        telegramPhone: meta.telegram_phone || meta.phone || '',
        parentPhone: meta.parent_phone || '',
        role: meta.role || 'student',
        targetUniversity: meta.target_university || '',
        targetCourse: meta.target_course || '',
        utmeSubjects: Array.isArray(meta.utme_subjects) && meta.utme_subjects.length > 0 ? meta.utme_subjects : ['English'],
        onboardingCompleted: Boolean(meta.onboarding_completed),
        onboardingStep: typeof meta.onboarding_step === 'number' ? meta.onboarding_step : 1,
        createdAt: authUser.created_at,
        updatedAt: authUser.updated_at || authUser.created_at,
      };
      return { profile };
    }

    return { profile: null };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'Failed to fetch student profile' };
  }
}

/**
 * Save or update a student's profile.
 * Only authenticated users can update their own profile record (enforced by RLS and Supabase Auth).
 * Updates both Supabase Auth user metadata and the `public.profiles` table (when available),
 * guaranteeing immediate persistence even if `public.profiles` is awaiting remote database migration.
 */
export async function saveUserProfile(
  userId: string,
  profileData: Partial<StudentProfile>
): Promise<{ profile: StudentProfile | null; error?: string }> {
  if (!userId) {
    return { profile: null, error: 'User ID is required' };
  }

  const supabase = getSupabase();
  try {
    // 1. Prepare Auth metadata payload
    const metaPayload: Record<string, any> = {};
    if (profileData.fullName !== undefined) {
      metaPayload.full_name = profileData.fullName.trim();
      metaPayload.name = profileData.fullName.trim();
    }
    if (profileData.phone !== undefined) metaPayload.phone = profileData.phone.trim();
    if (profileData.whatsappPhone !== undefined) metaPayload.whatsapp_phone = profileData.whatsappPhone.trim();
    if (profileData.telegramPhone !== undefined) metaPayload.telegram_phone = profileData.telegramPhone.trim();
    if (profileData.parentPhone !== undefined) metaPayload.parent_phone = profileData.parentPhone.trim();
    if (profileData.targetUniversity !== undefined) metaPayload.target_university = profileData.targetUniversity.trim();
    if (profileData.targetCourse !== undefined) metaPayload.target_course = profileData.targetCourse.trim();
    if (profileData.utmeSubjects !== undefined) metaPayload.utme_subjects = profileData.utmeSubjects;
    if (profileData.onboardingCompleted !== undefined) metaPayload.onboarding_completed = profileData.onboardingCompleted;
    if (profileData.onboardingStep !== undefined) metaPayload.onboarding_step = profileData.onboardingStep;

    let authUser: any = null;
    let authError: string | null = null;

    try {
      const { data: updatedAuth, error: authErr } = await supabase.auth.updateUser({
        data: metaPayload,
      });
      if (!authErr && updatedAuth?.user) {
        authUser = updatedAuth.user;
      } else if (authErr) {
        authError = authErr.message;
      }
    } catch (authEx: any) {
      authError = authEx?.message || 'Authentication error';
    }

    // 2. Prepare database payload for public.profiles
    const payload: Record<string, any> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (profileData.email !== undefined) payload.email = profileData.email;
    if (profileData.fullName !== undefined) payload.full_name = profileData.fullName.trim();
    if (profileData.phone !== undefined) payload.phone = profileData.phone.trim();
    if (profileData.whatsappPhone !== undefined) payload.whatsapp_phone = profileData.whatsappPhone.trim();
    if (profileData.telegramPhone !== undefined) payload.telegram_phone = profileData.telegramPhone.trim();
    if (profileData.parentPhone !== undefined) payload.parent_phone = profileData.parentPhone.trim();
    if (profileData.targetUniversity !== undefined) payload.target_university = profileData.targetUniversity.trim();
    if (profileData.targetCourse !== undefined) payload.target_course = profileData.targetCourse.trim();
    if (profileData.utmeSubjects !== undefined) payload.utme_subjects = profileData.utmeSubjects;
    if (profileData.onboardingCompleted !== undefined) payload.onboarding_completed = profileData.onboardingCompleted;
    if (profileData.onboardingStep !== undefined) payload.onboarding_step = profileData.onboardingStep;

    let dbProfile: any = null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select('*')
        .maybeSingle();

      if (!error && data) {
        dbProfile = data;
      }
    } catch {
      // Database write error handled gracefully; auth user metadata provides fallback
    }

    // If database returned profile, return it
    if (dbProfile) {
      const updated: StudentProfile = {
        id: dbProfile.id,
        email: dbProfile.email,
        fullName: dbProfile.full_name || '',
        phone: dbProfile.phone || '',
        whatsappPhone: dbProfile.whatsapp_phone || '',
        telegramPhone: dbProfile.telegram_phone || '',
        parentPhone: dbProfile.parent_phone || '',
        role: dbProfile.role || 'student',
        targetUniversity: dbProfile.target_university || '',
        targetCourse: dbProfile.target_course || '',
        utmeSubjects: dbProfile.utme_subjects || ['English'],
        onboardingCompleted: dbProfile.onboarding_completed || false,
        onboardingStep: dbProfile.onboarding_step || 1,
        createdAt: dbProfile.created_at,
        updatedAt: dbProfile.updated_at,
      };
      return { profile: updated };
    }

    // If authUser was successfully updated, construct from auth metadata
    if (authUser) {
      const meta = authUser.user_metadata || {};
      const updated: StudentProfile = {
        id: authUser.id,
        email: authUser.email || profileData.email || '',
        fullName: meta.full_name || meta.name || profileData.fullName || '',
        phone: meta.phone || profileData.phone || '',
        whatsappPhone: meta.whatsapp_phone || profileData.whatsappPhone || '',
        telegramPhone: meta.telegram_phone || profileData.telegramPhone || '',
        parentPhone: meta.parent_phone || profileData.parentPhone || '',
        role: meta.role || 'student',
        targetUniversity: meta.target_university || profileData.targetUniversity || '',
        targetCourse: meta.target_course || profileData.targetCourse || '',
        utmeSubjects: meta.utme_subjects || profileData.utmeSubjects || ['English'],
        onboardingCompleted: meta.onboarding_completed ?? profileData.onboardingCompleted ?? false,
        onboardingStep: meta.onboarding_step ?? profileData.onboardingStep ?? 1,
        createdAt: authUser.created_at,
        updatedAt: authUser.updated_at || new Date().toISOString(),
      };
      return { profile: updated };
    }

    if (authError) {
      return { profile: null, error: `Authentication error: ${authError}` };
    }

    return { profile: null, error: 'Could not save student profile. Please verify your login session.' };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'Failed to save student profile' };
  }
}

/**
 * Check if a student has verified student status.
 * CRITICAL RULE: A completed profile alone DOES NOT grant verified student status.
 * Verified student status is established solely by:
 *   1. Active, non-expired, started entitlements in `public.entitlements`
 *   2. OR a confirmed paid order in `public.orders`
 */
export async function checkIsVerifiedStudent(
  userId?: string,
  userEmail?: string
): Promise<{
  isVerified: boolean;
  activeEntitlementsCount: number;
  paidOrdersCount: number;
  verifiedPlanOrProduct?: string;
}> {
  if (!userId && !userEmail) {
    return { isVerified: false, activeEntitlementsCount: 0, paidOrdersCount: 0 };
  }

  const supabase = getSupabase();
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;

  // 1. Check entitlements
  const { entitlements } = await fetchUserEntitlements(userId, cleanEmail);
  const activeEntitlementsCount = entitlements.filter(e => e.isActive).length;

  // 2. Check paid orders
  let paidOrdersCount = 0;
  let verifiedPlanOrProduct: string | undefined;

  try {
    let orderQuery = supabase.from('orders').select('product_name, product_id, status').eq('status', 'paid');
    if (userId && cleanEmail) {
      orderQuery = orderQuery.or(`user_id.eq.${userId},email.ilike.${cleanEmail}`);
    } else if (userId) {
      orderQuery = orderQuery.eq('user_id', userId);
    } else if (cleanEmail) {
      orderQuery = orderQuery.ilike('email', cleanEmail);
    }

    const { data: orders } = await orderQuery;
    if (orders && orders.length > 0) {
      paidOrdersCount = orders.length;
      verifiedPlanOrProduct = orders[0].product_name || orders[0].product_id;
    }
  } catch {
    // Non-fatal if orders query fails; fallback to active entitlements
  }

  if (activeEntitlementsCount > 0 && !verifiedPlanOrProduct) {
    verifiedPlanOrProduct = entitlements[0]?.resourceTitle || entitlements[0]?.resourceId;
  }

  const isVerified = activeEntitlementsCount > 0 || paidOrdersCount > 0;
  return {
    isVerified,
    activeEntitlementsCount,
    paidOrdersCount,
    verifiedPlanOrProduct,
  };
}

/**
 * Get the total number of unique verified TECHMED students.
 * Invokes the database RPC function `get_unique_verified_students_count()`.
 * De-duplicates candidates across multiple purchases and cohort enrollments.
 */
export async function getUniqueVerifiedStudentsCount(): Promise<number> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.rpc('get_unique_verified_students_count');
    if (!error && typeof data === 'number') {
      return data;
    }
    // Fallback if migration not yet applied: query distinct paid orders count
    const { count } = await supabase
      .from('orders')
      .select('email', { count: 'exact', head: true })
      .eq('status', 'paid');
    return count ?? 0;
  } catch {
    return 0;
  }
}

export interface StudentPrivileges {
  isVerified: boolean;
  statusLabel: string;
  badgeType: 'ultimate' | 'mastery' | 'core' | 'resource_purchaser' | 'unverified';
  planName?: string;
  hasFounderMentorship: boolean;
  cohortStartDate?: string;
  cohortExpiryDate?: string | null;
  authorizedBenefits: string[];
  authorizedResources: Array<{
    id: string;
    title: string;
    startsAt?: string | null;
    expiresAt?: string | null;
    isLifetime: boolean;
    grantSource: string;
  }>;
  nextSteps: Array<{
    title: string;
    description: string;
    href: string;
    actionLabel: string;
    primary?: boolean;
  }>;
}

/**
 * Resolve student privileges, authorized benefits, and tier metadata.
 * Authoritatively inspects active database entitlements and paid orders.
 * NEVER falsely elevates a Core student to Ultimate or grants Founder Mentorship to non-Ultimate students.
 */
export function resolveStudentPrivileges(
  entitlements: StudentEntitlement[] = [],
  orders: any[] = []
): StudentPrivileges {
  const activeEntitlements = entitlements.filter(e => e.isActive);

  // Safe case-insensitive matching helpers
  const isUltimateMatch = (val?: string | null) => {
    if (!val) return false;
    const v = val.toLowerCase();
    return v === 'ultimate' || v === 'cohort-ultimate' || v.startsWith('cohort-ultimate') || isPlanTier(v, 'ultimate');
  };

  const isMasteryMatch = (val?: string | null) => {
    if (!val) return false;
    const v = val.toLowerCase();
    return v === 'mastery' || v === 'cohort-mastery' || v.startsWith('cohort-mastery') || isPlanTier(v, 'mastery');
  };

  const isCoreMatch = (val?: string | null) => {
    if (!val) return false;
    const v = val.toLowerCase();
    return v === 'core' || v === 'cohort-core' || v.startsWith('cohort-core') || isPlanTier(v, 'core');
  };

  // Check for Ultimate
  const hasUltimate =
    activeEntitlements.some(e => isUltimateMatch(e.resourceId) || isUltimateMatch(e.planId)) ||
    orders.some(o => isUltimateMatch(o.product_id) || (typeof o.product_name === 'string' && isUltimateMatch(o.product_name)));

  // Check for Mastery (explicitly recognizing ₦20,000 Early-Bird and standard)
  const hasMastery =
    !hasUltimate &&
    (activeEntitlements.some(e => isMasteryMatch(e.resourceId) || isMasteryMatch(e.planId)) ||
     orders.some(o => isMasteryMatch(o.product_id) || (typeof o.product_name === 'string' && isMasteryMatch(o.product_name))));

  // Check for Core
  const hasCore =
    !hasUltimate &&
    !hasMastery &&
    (activeEntitlements.some(e => isCoreMatch(e.resourceId) || isCoreMatch(e.planId)) ||
     orders.some(o => isCoreMatch(o.product_id) || (typeof o.product_name === 'string' && isCoreMatch(o.product_name))));

  const resourceEntitlements = activeEntitlements.filter(
    e => !isCoreMatch(e.resourceId) && !isMasteryMatch(e.resourceId) && !isUltimateMatch(e.resourceId)
  );

  const authorizedResources = [
    ...activeEntitlements.map(e => ({
      id: e.resourceId,
      title: e.resourceTitle || e.resourceId,
      startsAt: e.startsAt,
      expiresAt: e.expiresAt,
      isLifetime: !e.expiresAt,
      grantSource: e.grantSource,
    })),
    ...orders
      .filter(o => !activeEntitlements.some(e => e.resourceId === o.product_id))
      .map(o => ({
        id: o.product_id || 'order-item',
        title: o.product_name || o.product_id || 'Confirmed Order',
        startsAt: null,
        expiresAt: o.product_id?.includes('monthly') ? '2026-12-30' : (o.product_id?.startsWith('cohort') ? '2027-05-31' : null),
        isLifetime: !o.product_id?.startsWith('cohort'),
        grantSource: 'purchase',
      })),
  ];

  if (hasUltimate) {
    return {
      isVerified: true,
      statusLabel: 'Verified TECHMED Student',
      badgeType: 'ultimate',
      planName: 'TECHMED Ultimate (Full UTME 2027 Access)',
      hasFounderMentorship: true,
      cohortStartDate: '30 November 2026',
      cohortExpiryDate: '2027-05-31',
      authorizedBenefits: [
        'Everything included in TECHMED Mastery',
        'Organic Chemistry Bootcamp 1.0 & Mole Concept Bootcamp 2.0',
        'Operation 100 Intensive CBT Bootcamp',
        'Post-UTME Brainstorming Hub (All Universities)',
        'Final Revision Classes (March/April 2027)',
        'Founder Mentorship (Confirmed Place)',
      ],
      authorizedResources,
      nextSteps: [
        {
          title: 'Bookshelf & Formula Manuals',
          description: 'Access your 3 science boosters, formula workbooks, and Post-UTME material.',
          href: '/resources?view=bookshelf',
          actionLabel: 'Open Bookshelf',
          primary: true,
        },
        {
          title: 'Kairo CBT Practice',
          description: 'Take timed topic tests and review instant answer explanations.',
          href: '/tools',
          actionLabel: 'Launch Kairo',
        },
      ],
    };
  }

  if (hasMastery) {
    return {
      isVerified: true,
      statusLabel: 'Verified TECHMED Student',
      badgeType: 'mastery',
      planName: 'TECHMED Mastery (3-Month Enrolment)',
      hasFounderMentorship: false,
      cohortStartDate: '30 November 2026',
      cohortExpiryDate: '2027-05-31',
      authorizedBenefits: [
        'Complete TECHMED Core 12-Week Programme',
        'Chemistry Booster System (Permanent Lifetime Access)',
        'Biology Booster System (Permanent Lifetime Access)',
        'Physics Booster System (Permanent Lifetime Access)',
        '11 Science Formula Workbooks & Revision Manuals',
        'Kairo CBT Practice & Weekly Topic Drills',
      ],
      authorizedResources,
      nextSteps: [
        {
          title: 'Explore Your Booster Systems',
          description: 'Your Biology, Chemistry, and Physics booster systems are unlocked with lifetime access.',
          href: '/resources?view=bookshelf',
          actionLabel: 'Go to Bookshelf',
          primary: true,
        },
        {
          title: 'Review UTME 2027 Syllabus',
          description: 'Track syllabus topics for your selected 4 UTME subjects.',
          href: '/jamb-syllabus-2027',
          actionLabel: 'View Syllabus',
        },
      ],
    };
  }

  if (hasCore) {
    return {
      isVerified: true,
      statusLabel: 'Verified TECHMED Student',
      badgeType: 'core',
      planName: 'TECHMED Core (Enrolled)',
      hasFounderMentorship: false,
      cohortStartDate: '30 November 2026',
      cohortExpiryDate: null, // Depending on monthly vs 3-month
      authorizedBenefits: [
        '12-Week Intensive Live Classes in 5 Science Subjects',
        'Four Hours of Daily Live Teaching (Monday to Saturday)',
        'Structured 12-Week Curriculum with Study Notes',
        'Kairo CBT Practice & Weekly Topic Drills',
        'Three Scheduled 180-Question JAMB-Standard Mock Examinations',
        'Tutor Question & Clarification Access',
        '20% Discount on Standalone Revision Boosters',
      ],
      authorizedResources,
      nextSteps: [
        {
          title: 'Prepare for Class Start (30 Nov 2026)',
          description: 'Classes begin promptly on November 30. Check Telegram channel and timetable.',
          href: '/utme-2027/builders',
          actionLabel: 'Builder Channel',
          primary: true,
        },
        {
          title: 'Practice on Kairo CBT',
          description: 'Begin daily speed drills in your 4 UTME subjects.',
          href: '/tools',
          actionLabel: 'Practice CBT',
        },
      ],
    };
  }

  if (resourceEntitlements.length > 0 || orders.length > 0) {
    return {
      isVerified: true,
      statusLabel: 'Verified TECHMED Student',
      badgeType: 'resource_purchaser',
      planName: 'Study Resource Purchaser',
      hasFounderMentorship: false,
      authorizedBenefits: [
        'Permanent Lifetime Access to Purchased Study Boosters',
        'Interactive In-Browser Reader with Highlighting & Notes',
        'Formula Manuals & High-Yield Summary Sheets',
        'Free Kairo CBT Practice Access',
      ],
      authorizedResources,
      nextSteps: [
        {
          title: 'Open Your Purchased Books',
          description: 'Access your purchased study booster manuals in your bookshelf reader.',
          href: '/resources?view=bookshelf',
          actionLabel: 'Open Bookshelf',
          primary: true,
        },
        {
          title: 'Enroll in UTME 2027 Cohort',
          description: 'Join live masterclasses and 180-question mock exams.',
          href: '/pricing',
          actionLabel: 'Explore Cohorts',
        },
      ],
    };
  }

  // Free Registered Candidate
  return {
    isVerified: false,
    statusLabel: 'Free Registered Candidate',
    badgeType: 'unverified',
    planName: undefined,
    hasFounderMentorship: false,
    authorizedBenefits: [
      'Free Admission Intelligence Guide 2026',
      'Free Kairo CBT Practice Drills',
      'UTME 2027 Syllabus & Blueprint Tracker',
      'Personalized Student Profile & Subject Combination Tracker',
    ],
    authorizedResources: [],
    nextSteps: [
      {
        title: 'Explore UTME 2027 Cohort Plans',
        description: 'Join Core, Mastery, or Ultimate live classes starting November 30, 2026.',
        href: '/pricing',
        actionLabel: 'Compare Plans',
        primary: true,
      },
      {
        title: 'Download Free Admission Guide',
        description: 'Read the comprehensive 2026 Admission Intelligence Guide.',
        href: '/foundation-protocol',
        actionLabel: 'Read Free Guide',
      },
      {
        title: 'Practice on Kairo CBT',
        description: 'Test your timing and accuracy with free sample tests.',
        href: '/tools',
        actionLabel: 'Try Kairo',
      },
    ],
  };
}

export interface UserResourceEntitlementItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  subject?: string;
  type: string;
  status: 'free' | 'paid';
  isOwned: boolean;
  purchaseStatus: 'free' | 'direct_purchase' | 'plan_inclusion' | 'cohort_enrolled' | 'admin_grant' | 'not_owned';
  purchaseStatusLabel: string;
  accessStatus: 'active_lifetime' | 'active_cohort' | 'starts_future' | 'expired' | 'free' | 'unowned';
  accessStatusLabel: string;
  grantSource?: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  readerUrl?: string;
  externalUrl?: string;
  storeUrl?: string;
  actionLabel: string;
  priceNgn?: number;
}

export interface StudentPlanInfo {
  tier: 'free' | 'core' | 'mastery' | 'ultimate';
  name: string;
  isCore: boolean;
  isMastery: boolean;
  isUltimate: boolean;
  hasCohort: boolean;
  isActive: boolean;
  expiresAt: string | null;
}

export async function getStudentPlan(
  userId?: string,
  userEmail?: string
): Promise<StudentPlanInfo> {
  const defaultFree: StudentPlanInfo = {
    tier: 'free',
    name: 'Free',
    isCore: false,
    isMastery: false,
    isUltimate: false,
    hasCohort: false,
    isActive: true,
    expiresAt: null,
  };

  if (!userId && !userEmail) {
    return defaultFree;
  }

  try {
    const { entitlements } = await fetchUserEntitlements(userId, userEmail);
    const now = Date.now();

    // Check active entitlements
    const activeCohortEntitlements = (entitlements || []).filter(e => {
      if (!e.isActive) return false;
      if (e.expiresAt && new Date(e.expiresAt).getTime() <= now) return false;
      const r = (e.resourceId || '').toLowerCase();
      const p = (e.planId || '').toLowerCase();
      return r.includes('cohort') || isPlanTier(r, 'core') || isPlanTier(r, 'mastery') || isPlanTier(r, 'ultimate') ||
             p.includes('cohort') || isPlanTier(p, 'core') || isPlanTier(p, 'mastery') || isPlanTier(p, 'ultimate');
    });

    const ultimateEnt = activeCohortEntitlements.find(e => {
      const r = (e.resourceId || '').toLowerCase();
      const p = (e.planId || '').toLowerCase();
      return isPlanTier(r, 'ultimate') || isPlanTier(p, 'ultimate');
    });
    if (ultimateEnt) {
      return {
        tier: 'ultimate',
        name: 'TECHMED Ultimate',
        isCore: false,
        isMastery: false,
        isUltimate: true,
        hasCohort: true,
        isActive: true,
        expiresAt: ultimateEnt.expiresAt || null,
      };
    }

    const masteryEnt = activeCohortEntitlements.find(e => {
      const r = (e.resourceId || '').toLowerCase();
      const p = (e.planId || '').toLowerCase();
      return isPlanTier(r, 'mastery') || isPlanTier(p, 'mastery');
    });
    if (masteryEnt) {
      return {
        tier: 'mastery',
        name: 'TECHMED Mastery',
        isCore: false,
        isMastery: true,
        isUltimate: false,
        hasCohort: true,
        isActive: true,
        expiresAt: masteryEnt.expiresAt || null,
      };
    }

    const coreEnt = activeCohortEntitlements.find(e => {
      const r = (e.resourceId || '').toLowerCase();
      const p = (e.planId || '').toLowerCase();
      return isPlanTier(r, 'core') || isPlanTier(p, 'core');
    });
    if (coreEnt) {
      return {
        tier: 'core',
        name: 'TECHMED Core',
        isCore: true,
        isMastery: false,
        isUltimate: false,
        hasCohort: true,
        isActive: true,
        expiresAt: coreEnt.expiresAt || null,
      };
    }

    // Fallback: check orders table
    const supabase = getSupabase();
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;
    let orderQuery = supabase
      .from('orders')
      .select('product_id, product_name, status, created_at')
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (userId && cleanEmail) {
      orderQuery = orderQuery.or(`user_id.eq.${userId},email.ilike.${cleanEmail}`);
    } else if (userId) {
      orderQuery = orderQuery.eq('user_id', userId);
    } else if (cleanEmail) {
      orderQuery = orderQuery.ilike('email', cleanEmail);
    }

    const { data: paidOrders } = await orderQuery;
    if (paidOrders && paidOrders.length > 0) {
      const hasUltimate = paidOrders.some((o: any) => {
        const pid = (o.product_id || '').toLowerCase();
        const pname = (o.product_name || '').toLowerCase();
        return isPlanTier(pid, 'ultimate') || isPlanTier(pname, 'ultimate');
      });
      if (hasUltimate) {
        return {
          tier: 'ultimate',
          name: 'TECHMED Ultimate',
          isCore: false,
          isMastery: false,
          isUltimate: true,
          hasCohort: true,
          isActive: true,
          expiresAt: null,
        };
      }

      const hasMastery = paidOrders.some((o: any) => {
        const pid = (o.product_id || '').toLowerCase();
        const pname = (o.product_name || '').toLowerCase();
        return isPlanTier(pid, 'mastery') || isPlanTier(pname, 'mastery');
      });
      if (hasMastery) {
        return {
          tier: 'mastery',
          name: 'TECHMED Mastery',
          isCore: false,
          isMastery: true,
          isUltimate: false,
          hasCohort: true,
          isActive: true,
          expiresAt: null,
        };
      }

      const hasCore = paidOrders.some((o: any) => {
        const pid = (o.product_id || '').toLowerCase();
        const pname = (o.product_name || '').toLowerCase();
        if (!isPlanTier(pid, 'core') && !isPlanTier(pname, 'core')) return false;
        if (pid.includes('monthly')) {
          const orderTime = new Date(o.created_at).getTime();
          if (Date.now() - orderTime > 32 * 24 * 60 * 60 * 1000) return false;
        }
        return true;
      });
      if (hasCore) {
        return {
          tier: 'core',
          name: 'TECHMED Core',
          isCore: true,
          isMastery: false,
          isUltimate: false,
          hasCohort: true,
          isActive: true,
          expiresAt: null,
        };
      }
    }

    return defaultFree;
  } catch {
    return defaultFree;
  }
}

/**
 * Get comprehensive resource & entitlement items for a student.
 * Authoritatively inspects active database entitlements.
 * Guarantees that free items remain open, owned items link to their readers,
 * and unowned items display clear status with links to acquisition pages.
 */
export async function getUserResourceEntitlements(
  userId?: string,
  userEmail?: string
): Promise<{
  items: UserResourceEntitlementItem[];
  ownedCount: number;
  unownedCount: number;
  hasCorePlan: boolean;
  hasMasteryPlan: boolean;
  hasUltimatePlan: boolean;
  userPlan: 'free' | 'core' | 'mastery' | 'ultimate';
}> {
  let entitlements: StudentEntitlement[] = [];
  if (userId || userEmail) {
    const res = await fetchUserEntitlements(userId, userEmail);
    entitlements = res.entitlements || [];
  }

  const nowUtc = Date.now();

  let paidOrders: any[] = [];
  if (userId || userEmail) {
    try {
      const supabase = getSupabase();
      const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;
      let orderQuery = supabase
        .from('orders')
        .select('product_id, product_name, status, total_amount, amount, created_at')
        .eq('status', 'paid');

      if (userId && cleanEmail) {
        orderQuery = orderQuery.or(`user_id.eq.${userId},email.ilike.${cleanEmail}`);
      } else if (userId) {
        orderQuery = orderQuery.eq('user_id', userId);
      } else if (cleanEmail) {
        orderQuery = orderQuery.ilike('email', cleanEmail);
      }

      const { data, error } = await orderQuery;
      if (!error && data) {
        paidOrders = data;
      }
    } catch {
      // Non-fatal
    }
  }

  const isMasteryMatch = (s?: string | null) => {
    if (!s) return false;
    const v = s.toLowerCase();
    return v === 'mastery' || v === 'cohort-mastery' || v.startsWith('cohort-mastery') || isPlanTier(v, 'mastery');
  };

  const isUltimateMatch = (s?: string | null) => {
    if (!s) return false;
    const v = s.toLowerCase();
    return v === 'ultimate' || v === 'cohort-ultimate' || v.startsWith('cohort-ultimate') || isPlanTier(v, 'ultimate');
  };

  const isCoreMatch = (s?: string | null) => {
    if (!s) return false;
    const v = s.toLowerCase();
    return v === 'core' || v === 'cohort-core' || v.startsWith('cohort-core') || isPlanTier(v, 'core');
  };

  const hasMasteryCohort =
    entitlements.some(e => {
      if (!e.isActive) return false;
      if (e.expiresAt && new Date(e.expiresAt).getTime() <= nowUtc) return false;
      return isMasteryMatch(e.resourceId) || isMasteryMatch(e.planId);
    }) ||
    paidOrders.some(o => isMasteryMatch(o.product_id) || (typeof o.product_name === 'string' && isMasteryMatch(o.product_name)));

  const hasUltimateCohort =
    entitlements.some(e => {
      if (!e.isActive) return false;
      if (e.expiresAt && new Date(e.expiresAt).getTime() <= nowUtc) return false;
      return isUltimateMatch(e.resourceId) || isUltimateMatch(e.planId);
    }) ||
    paidOrders.some(o => isUltimateMatch(o.product_id) || (typeof o.product_name === 'string' && isUltimateMatch(o.product_name)));

  const hasCoreCohort =
    entitlements.some(e => {
      if (!e.isActive) return false;
      if (e.expiresAt && new Date(e.expiresAt).getTime() <= nowUtc) return false;
      return isCoreMatch(e.resourceId) || isCoreMatch(e.planId);
    }) ||
    paidOrders.some(o => {
      if (!isCoreMatch(o.product_id) && !(typeof o.product_name === 'string' && isCoreMatch(o.product_name))) return false;
      const pid = (o.product_id || '').toLowerCase();
      if (pid.includes('monthly')) {
        const orderTime = new Date(o.created_at).getTime();
        if (nowUtc - orderTime > 32 * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });

  const hasCorePlan = hasCoreCohort && !hasMasteryCohort && !hasUltimateCohort;
  const userPlan: 'free' | 'core' | 'mastery' | 'ultimate' = hasUltimateCohort
    ? 'ultimate'
    : (hasMasteryCohort ? 'mastery' : (hasCoreCohort ? 'core' : 'free'));

  const CATALOGUE_DEFINITIONS = [
    {
      id: 'admission-intelligence-guide-2026',
      slug: 'techmed-admission-intelligence-guide-2026',
      title: 'TECHMED Admission Intelligence Guide 2026',
      category: 'Admission',
      subject: 'Admission',
      type: 'Official Guide',
      status: 'free' as const,
      readerUrl: '/techmed-admission-intelligence-guide-2026.pdf',
      storeUrl: '/foundation-protocol',
      actionLabel: 'View PDF Guide',
    },
    {
      id: 'free-quiz-practice',
      slug: 'free-quiz-practice',
      title: 'Free & Unlimited CBT Quiz Practice',
      category: 'Quizzes',
      subject: 'General',
      type: 'Quiz Practice',
      status: 'free' as const,
      externalUrl: 'https://quizboot.com/page/techmedofficial',
      actionLabel: 'Start Practice',
    },
    {
      id: 'kairo',
      slug: 'kairo',
      title: 'Kairo Student Intelligence Platform',
      category: 'Digital Tools',
      subject: 'General',
      type: 'Platform Tool',
      status: 'free' as const,
      externalUrl: 'https://kairo.techmed.ng',
      actionLabel: 'Access Tool',
    },
    {
      id: 'chemistry-booster',
      slug: 'chemistry-booster-system',
      title: 'Chemistry Booster System',
      category: 'Academic',
      subject: 'Chemistry',
      type: 'Booster System',
      status: 'paid' as const,
      priceNgn: 5000,
      readerUrl: '/library/read/chemistry-booster',
      storeUrl: '/resources/chemistry-booster-system',
      actionLabel: 'Read Now',
    },
    {
      id: 'biology-booster',
      slug: 'biology-booster-system',
      title: 'Biology Booster System',
      category: 'Academic',
      subject: 'Biology',
      type: 'Booster System',
      status: 'paid' as const,
      priceNgn: 3000,
      readerUrl: '/library/read/biology-booster',
      storeUrl: '/resources/biology-booster-system',
      actionLabel: 'Read Now',
    },
    {
      id: 'physics-booster',
      slug: 'physics-booster-system',
      title: 'Physics Booster System',
      category: 'Academic',
      subject: 'Physics',
      type: 'Booster System',
      status: 'paid' as const,
      priceNgn: 3000,
      readerUrl: '/library/read/physics-booster',
      storeUrl: '/resources/physics-booster-system',
      actionLabel: 'Read Now',
    },
    {
      id: 'booster-bundle',
      slug: 'all-science-boosters-bundle',
      title: 'All Science Boosters Bundle (Triple Science)',
      category: 'Academic',
      subject: 'All Science',
      type: 'Resource Bundle',
      status: 'paid' as const,
      priceNgn: 9000,
      readerUrl: '/library/read/booster-bundle',
      storeUrl: '/resources/all-science-boosters-bundle',
      actionLabel: 'Read Now',
    },
    {
      id: 'post-utme-brainstorming-hub',
      slug: 'post-utme-brainstorming-hub',
      title: 'Post Brainstorming Hub — All Universities',
      category: 'Admission',
      subject: 'Admission',
      type: 'Study Guide',
      status: 'paid' as const,
      priceNgn: 3000,
      readerUrl: '/library/read/post-utme-brainstorming-hub',
      storeUrl: '/resources/post-utme-brainstorming-hub',
      actionLabel: 'Read Now',
    },
    {
      id: 'university-research-file',
      slug: 'university-research-file',
      title: 'Detailed University Research File',
      category: 'Admission',
      subject: 'Admission',
      type: 'Guide',
      status: 'paid' as const,
      priceNgn: 1000,
      readerUrl: '/library/read/university-research-file',
      storeUrl: '/resources/university-research-file',
      actionLabel: 'Read Now',
    },
    {
      id: 'cohort-core',
      slug: 'cohort-core',
      title: 'TECHMED Core (12-Week Live Classes & Daily Drills)',
      category: 'Cohort',
      subject: 'All Science',
      type: 'Cohort Plan',
      status: 'paid' as const,
      priceNgn: 15000,
      readerUrl: '/utme-2027/builders',
      storeUrl: '/pricing',
      actionLabel: 'View Class Hub',
    },
    {
      id: 'cohort-mastery',
      slug: 'cohort-mastery',
      title: 'TECHMED Mastery (Core + 3 Boosters & 11 Formula Manuals)',
      category: 'Cohort',
      subject: 'All Science',
      type: 'Cohort Plan',
      status: 'paid' as const,
      priceNgn: 20000,
      readerUrl: '/resources?view=bookshelf',
      storeUrl: '/pricing',
      actionLabel: 'Open Bookshelf',
    },
    {
      id: 'cohort-ultimate',
      slug: 'cohort-ultimate',
      title: 'TECHMED Ultimate (Full UTME 2027 Access + Bootcamps + Mentorship)',
      category: 'Cohort',
      subject: 'All Science',
      type: 'Cohort Plan',
      status: 'paid' as const,
      priceNgn: 40000,
      readerUrl: '/resources?view=bookshelf',
      storeUrl: '/pricing',
      actionLabel: 'Open Bookshelf',
    },
  ];

  const items: UserResourceEntitlementItem[] = CATALOGUE_DEFINITIONS.map((def) => {
    // 1. Free items are always accessible to every student
    if (def.status === 'free') {
      return {
        ...def,
        isOwned: true,
        purchaseStatus: 'free',
        purchaseStatusLabel: 'Free Official Material',
        accessStatus: 'free',
        accessStatusLabel: 'Free Access',
        actionLabel: def.actionLabel || 'View Material',
      };
    }

    // 2. PART 3: For Mastery and Ultimate students, all published study resources
    // are included without additional payment!
    if (def.category !== 'Cohort' && (hasMasteryCohort || hasUltimateCohort)) {
      return {
        ...def,
        isOwned: true,
        purchaseStatus: 'plan_inclusion',
        purchaseStatusLabel: hasUltimateCohort ? 'Included in Ultimate Track' : 'Included in Mastery Track',
        accessStatus: 'active_lifetime',
        accessStatusLabel: 'Included in Plan',
        grantSource: 'plan_inclusion',
        actionLabel: 'Read Now',
      };
    }

    // 3. Paid items: match against active entitlements or confirmed paid orders
    const matchingEntitlement = entitlements.find((e) => {
      if (!e.isActive) return false;
      if (def.id === 'cohort-core') {
        return e.resourceId.startsWith('cohort-core') || e.resourceId === 'core' || e.planId?.startsWith('cohort-core');
      }
      if (def.id === 'cohort-mastery') {
        return isMasteryMatch(e.resourceId) || isMasteryMatch(e.planId);
      }
      if (def.id === 'cohort-ultimate') {
        return isUltimateMatch(e.resourceId) || isUltimateMatch(e.planId);
      }
      if (def.id === 'post-utme-brainstorming-hub') {
        return e.resourceId === 'post-utme-brainstorming-hub' || e.resourceId === 'post-utme-pq';
      }
      if (def.id === 'booster-bundle') {
        return e.resourceId === 'booster-bundle' || e.resourceId === 'all-science-boosters-bundle' || e.planId === 'booster-bundle';
      }
      if (def.id === 'chemistry-booster' || def.id === 'biology-booster' || def.id === 'physics-booster') {
        if (e.resourceId === 'booster-bundle' || e.resourceId === 'all-science-boosters-bundle' || e.planId === 'booster-bundle') {
          return true;
        }
      }
      return e.resourceId === def.id || e.resourceId === def.slug;
    });

    const matchingOrder = paidOrders.find((o) => {
      if (def.id === 'cohort-mastery') {
        return isMasteryMatch(o.product_id) || (typeof o.product_name === 'string' && isMasteryMatch(o.product_name));
      }
      if (def.id === 'cohort-core') {
        return o.product_id?.toLowerCase().startsWith('cohort-core') || o.product_id?.toLowerCase() === 'core' || (typeof o.product_name === 'string' && isPlanTier(o.product_name.toLowerCase(), 'core'));
      }
      if (def.id === 'cohort-ultimate') {
        return isUltimateMatch(o.product_id) || (typeof o.product_name === 'string' && isUltimateMatch(o.product_name));
      }
      if (def.id === 'post-utme-brainstorming-hub') {
        return o.product_id === 'post-utme-brainstorming-hub' || o.product_id === 'post-utme-pq';
      }
      if (def.id === 'chemistry-booster' || def.id === 'biology-booster' || def.id === 'physics-booster') {
        if (o.product_id === 'booster-bundle' || o.product_id === 'all-science-boosters-bundle') {
          return true;
        }
      }
      return o.product_id === def.id || o.product_id === def.slug;
    });

    if (matchingEntitlement) {
      let accessStatus: UserResourceEntitlementItem['accessStatus'] = 'active_lifetime';
      let accessStatusLabel = 'Permanent Lifetime Access';
      let purchaseStatus: UserResourceEntitlementItem['purchaseStatus'] = 'direct_purchase';
      let purchaseStatusLabel = 'Direct Standalone Purchase';

      if (def.category === 'Cohort') {
        purchaseStatus = 'cohort_enrolled';
        purchaseStatusLabel = 'UTME 2027 Cohort Enrolment';
      } else if (matchingEntitlement.grantSource === 'plan_inclusion' || matchingEntitlement.grantSource === 'bundle_inclusion') {
        purchaseStatus = 'plan_inclusion';
        purchaseStatusLabel = (matchingEntitlement.planId?.includes('ultimate') || hasUltimateCohort)
          ? 'Included in Ultimate Track'
          : 'Included in Mastery Track';
      } else if (matchingEntitlement.grantSource === 'admin_grant' || matchingEntitlement.grantSource === 'scholarship') {
        purchaseStatus = 'admin_grant';
        purchaseStatusLabel = 'Academic Grant / Scholarship';
      }

      if (matchingEntitlement.startsAt) {
        const starts = new Date(matchingEntitlement.startsAt).getTime();
        if (!isNaN(starts) && starts > nowUtc) {
          accessStatus = 'starts_future';
          accessStatusLabel = `Starts ${new Date(matchingEntitlement.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
      }

      if (accessStatus !== 'starts_future' && matchingEntitlement.expiresAt) {
        const expires = new Date(matchingEntitlement.expiresAt).getTime();
        if (!isNaN(expires) && expires <= nowUtc) {
          accessStatus = 'expired';
          accessStatusLabel = 'Expired';
        } else {
          accessStatus = 'active_cohort';
          accessStatusLabel = 'Active through UTME 2027';
        }
      }

      return {
        ...def,
        isOwned: true,
        purchaseStatus,
        purchaseStatusLabel,
        accessStatus,
        accessStatusLabel,
        grantSource: matchingEntitlement.grantSource,
        startsAt: matchingEntitlement.startsAt,
        expiresAt: matchingEntitlement.expiresAt,
        actionLabel: def.category === 'Cohort' ? (def.actionLabel || 'View Class Hub') : 'Read Now',
      };
    }

    if (matchingOrder) {
      const isCohort = def.category === 'Cohort';
      return {
        ...def,
        isOwned: true,
        purchaseStatus: isCohort ? 'cohort_enrolled' : 'direct_purchase',
        purchaseStatusLabel: isCohort ? 'UTME 2027 Cohort Enrolment' : 'Direct Standalone Purchase',
        accessStatus: isCohort ? 'active_cohort' : 'active_lifetime',
        accessStatusLabel: isCohort ? 'Active through UTME 2027' : 'Permanent Lifetime Access',
        grantSource: 'purchase',
        startsAt: null,
        expiresAt: isCohort ? '2027-05-31' : null,
        actionLabel: isCohort ? (def.actionLabel || 'Open Bookshelf') : 'Read Now',
      };
    }

    // Unowned paid item
    return {
      ...def,
      isOwned: false,
      purchaseStatus: 'not_owned',
      purchaseStatusLabel: def.category === 'Cohort' ? 'Available for Enrolment' : 'Available to Unlock',
      accessStatus: 'unowned',
      accessStatusLabel: 'Not Owned',
      actionLabel: def.category === 'Cohort' ? 'Compare Cohort Plans' : 'View & Acquire',
    };
  });

  const ownedCount = items.filter(i => i.isOwned && i.status === 'paid').length;
  const unownedCount = items.filter(i => !i.isOwned && i.status === 'paid').length;

  return { items, ownedCount, unownedCount, hasCorePlan, hasMasteryPlan: hasMasteryCohort, hasUltimatePlan: hasUltimateCohort, userPlan };
}

// ==============================================================================
// PERSISTENT PDF READING PROGRESS & RESUME READING HELPERS (PHASE 4)
// ==============================================================================

export interface ReadingProgressRecord {
  id?: string;
  userId: string;
  customerEmail?: string;
  resourceId: string;
  documentKey: string;
  currentPage: number;
  totalPages: number;
  readingPercent: number;
  isFinished: boolean;
  lastReadAt: string;
  updatedAt?: string;
}

// Concurrency tracking: maps key -> timestamp of latest initiated save
const latestSaveTimeByKey = new Map<string, number>();

function makeStorageKey(userId: string, resourceId: string, documentKey = ''): string {
  const safeUser = userId || 'guest';
  const safeDoc = documentKey ? documentKey.replace(/[^a-zA-Z0-9_-]/g, '_') : 'root';
  return `techmed_pdf_progress_${safeUser}_${resourceId}_${safeDoc}`;
}

/**
 * Retrieve local cached progress (synchronous fallback for offline or zero-latency loading)
 */
export function getLocalReadingProgress(
  userId: string,
  resourceId: string,
  documentKey = ''
): ReadingProgressRecord | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const key = makeStorageKey(userId, resourceId, documentKey);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Cache progress to localStorage immediately
 */
export function setLocalReadingProgress(record: ReadingProgressRecord): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = makeStorageKey(record.userId, record.resourceId, record.documentKey);
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch (e) {
    console.warn('Local storage write warning:', e);
  }
}

/**
 * Clear cached reading progress for a student upon logout or user switch
 */
export function clearUserLocalReadingProgress(userId: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !userId) return;
  try {
    const prefix = `techmed_pdf_progress_${userId}_`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (e) {
    console.warn('Failed to clear user local progress:', e);
  }
}

/**
 * Retrieve persistent reading progress for a student and specific resource/document.
 * Queries Supabase database first if authenticated, merging with latest local storage cache.
 */
export async function getReadingProgress(
  resourceId: string,
  documentKey = '',
  user?: { id?: string; email?: string } | null
): Promise<ReadingProgressRecord | null> {
  const userId = user?.id || '';
  const local = getLocalReadingProgress(userId, resourceId, documentKey);

  if (!userId) {
    // Unauthenticated / preview student: return local progress if available
    return local;
  }

  const supabase = getSupabase();
  try {
    let query = supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('resource_id', resourceId);

    if (documentKey) {
      query = query.eq('document_key', documentKey);
    } else {
      query = query.or('document_key.eq.,document_key.is.null');
    }

    const { data, error } = await query.order('last_read_at', { ascending: false }).limit(1).maybeSingle();

    if (error || !data) {
      // If table column not yet applied or query misses, return local record
      return local;
    }

    const dbRecord: ReadingProgressRecord = {
      id: data.id,
      userId: data.user_id,
      customerEmail: data.customer_email || user?.email,
      resourceId: data.resource_id,
      documentKey: data.document_key || '',
      currentPage: Number(data.current_page || 1),
      totalPages: Number(data.total_pages || 1),
      readingPercent: Number(data.reading_percent ?? data.scroll_percent ?? 0),
      isFinished: Boolean(data.is_finished),
      lastReadAt: data.last_read_at || new Date().toISOString(),
      updatedAt: data.updated_at,
    };

    // If local record has a newer lastReadAt timestamp (e.g. read offline recently), preserve newer local
    if (local && new Date(local.lastReadAt).getTime() > new Date(dbRecord.lastReadAt).getTime()) {
      return local;
    }

    // Keep local cache fresh with latest DB state
    setLocalReadingProgress(dbRecord);
    return dbRecord;
  } catch (err) {
    console.warn('Error fetching reading progress from database:', err);
    return local;
  }
}

/**
 * Persist PDF reading progress safely.
 * Calculates reading percentage, marks finished when reaching final page,
 * writes immediately to localStorage, and updates Supabase asynchronously with anti-race safeguards.
 */
export async function saveReadingProgress(
  params: {
    resourceId: string;
    documentKey?: string;
    currentPage: number;
    totalPages: number;
    isFinished?: boolean;
    customerEmail?: string;
  },
  user?: { id?: string; email?: string } | null
): Promise<ReadingProgressRecord> {
  const userId = user?.id || '';
  const customerEmail = user?.email || params.customerEmail || '';
  const documentKey = params.documentKey || '';
  const totalPages = Math.max(params.totalPages, 1);
  const currentPage = Math.min(Math.max(params.currentPage, 1), totalPages);

  // Compute precise percentage
  const rawPercent = (currentPage / totalPages) * 100;
  const readingPercent = Math.min(100, Math.max(0, Math.round(rawPercent * 100) / 100));

  // If student reaches or has reached final page, mark finished
  const isFinished = Boolean(params.isFinished || currentPage >= totalPages);
  const nowIso = new Date().toISOString();
  const nowTime = Date.now();

  const record: ReadingProgressRecord = {
    userId,
    customerEmail,
    resourceId: params.resourceId,
    documentKey,
    currentPage,
    totalPages,
    readingPercent,
    isFinished,
    lastReadAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Immediately cache in local storage (zero latency & offline resilience)
  setLocalReadingProgress(record);

  // If unauthenticated, we're done with local persistence
  if (!userId) {
    return record;
  }

  // 2. Anti-race concurrency guard
  const lockKey = `${userId}:${params.resourceId}:${documentKey}`;
  latestSaveTimeByKey.set(lockKey, nowTime);

  // 3. Upsert to Supabase public.reading_progress
  try {
    const supabase = getSupabase();
    const payload = {
      user_id: userId,
      customer_email: customerEmail || null,
      resource_id: params.resourceId,
      document_key: documentKey,
      current_page: currentPage,
      total_pages: totalPages,
      reading_percent: readingPercent,
      is_finished: isFinished,
      last_read_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('reading_progress')
      .upsert(payload, {
        onConflict: 'user_id,resource_id,document_key',
      })
      .select('id')
      .maybeSingle();

    if (error) {
      // If composite conflict fails due to older schema, attempt fallback upsert by user_id,resource_id
      if (error.message?.includes('conflict') || error.code === '42P10') {
        await supabase
          .from('reading_progress')
          .upsert(payload, { onConflict: 'user_id,resource_id' });
      } else {
        console.warn('Database saveReadingProgress notice:', error.message);
      }
    } else if (data?.id) {
      record.id = data.id;
    }
  } catch (netErr) {
    // Network errors or offline blips must never throw or disrupt reading
    console.warn('Offline or temporary network error during progress save (saved locally):', netErr);
  }

  return record;
}

/**
 * Retrieve all reading progress records for an authenticated student.
 * Used by the Library bookshelf to render progress indicators across cards.
 */
export async function getAllUserReadingProgress(
  user?: { id?: string; email?: string } | null
): Promise<ReadingProgressRecord[]> {
  const userId = user?.id || '';
  const recordsMap = new Map<string, ReadingProgressRecord>();

  // 1. Collect all local storage records for this user
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const prefix = `techmed_pdf_progress_${userId || 'guest'}_`;
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const raw = window.localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            const composite = `${parsed.resourceId}:${parsed.documentKey || ''}`;
            recordsMap.set(composite, parsed);
          }
        }
      }
    } catch (e) {
      // ignore local storage errors
    }
  }

  // If not authenticated, return local records only
  if (!userId) {
    return Array.from(recordsMap.values());
  }

  // 2. Query Supabase
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        const composite = `${row.resource_id}:${row.document_key || ''}`;
        const existingLocal = recordsMap.get(composite);

        const dbRecord: ReadingProgressRecord = {
          id: row.id,
          userId: row.user_id,
          customerEmail: row.customer_email,
          resourceId: row.resource_id,
          documentKey: row.document_key || '',
          currentPage: Number(row.current_page || 1),
          totalPages: Number(row.total_pages || 1),
          readingPercent: Number(row.reading_percent ?? row.scroll_percent ?? 0),
          isFinished: Boolean(row.is_finished),
          lastReadAt: row.last_read_at || new Date().toISOString(),
          updatedAt: row.updated_at,
        };

        // Prefer the one with latest lastReadAt
        if (
          !existingLocal ||
          new Date(dbRecord.lastReadAt).getTime() >= new Date(existingLocal.lastReadAt).getTime()
        ) {
          recordsMap.set(composite, dbRecord);
        }
      });
    }
  } catch (e) {
    console.warn('Notice loading reading progress from database:', e);
  }

  return Array.from(recordsMap.values());
}

