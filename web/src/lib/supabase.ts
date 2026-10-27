import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';

// Browser-safe Supabase configuration using public anon key only.
// Never import or expose SUPABASE_SERVICE_ROLE_KEY or private secrets.
export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) ||
  'https://unbgborbhxzsotaieiun.supabase.co';

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
  expiresAt: string | null; // null = permanent lifetime access
  isActive: boolean;
  resourceTitle?: string;
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

      // 2. starts_at must not be in the future (consistent UTC comparison)
      if (row.starts_at) {
        const startsUtc = new Date(row.starts_at).getTime();
        if (!isNaN(startsUtc) && startsUtc > nowUtc) {
          return false;
        }
      }

      // 3. expires_at must not be in the past (consistent UTC comparison)
      if (row.expires_at) {
        const expiresUtc = new Date(row.expires_at).getTime();
        if (!isNaN(expiresUtc) && expiresUtc <= nowUtc) {
          return false;
        }
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
      expiresAt: row.expires_at || null,
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


export async function hasActiveResourceAccess(
  resourceId: string,
  user?: { id?: string; email?: string } | null
): Promise<boolean> {
  // Free resources and study tools are open to all candidates without restriction
  if (
    resourceId === 'admission-intelligence-guide-2026' ||
    resourceId === 'free-quiz-practice' ||
    resourceId === 'kairo'
  ) {
    return true;
  }

  // Paid resources require an authenticated student with active verified entitlements
  if (!user?.id && !user?.email) {
    return false;
  }

  const { entitlements } = await fetchUserEntitlements(user.id, user.email);
  const now = new Date();

  return entitlements.some(e => {
    const matchesId =
      e.resourceId === resourceId ||
      e.resourceId === resourceId.replace('-system', '') ||
      (resourceId === 'post-utme-brainstorming-hub' && e.resourceId === 'post-utme-pq') ||
      (resourceId === 'post-utme-pq' && e.resourceId === 'post-utme-brainstorming-hub');

    // Bundled inclusions: Mastery includes Chemistry, Biology, and Physics boosters
    const isMasteryBooster =
      (resourceId === 'chemistry-booster' || resourceId === 'biology-booster' || resourceId === 'physics-booster') &&
      (e.resourceId.startsWith('cohort-mastery') || e.resourceId === 'mastery' || e.planId?.startsWith('cohort-mastery') ||
       e.resourceId.startsWith('cohort-ultimate') || e.resourceId === 'ultimate' || e.planId?.startsWith('cohort-ultimate'));

    // Ultimate includes Post-UTME Brainstorming Hub in addition to all 3 boosters
    const isUltimateResource =
      (resourceId === 'post-utme-brainstorming-hub' || resourceId === 'post-utme-pq') &&
      (e.resourceId.startsWith('cohort-ultimate') || e.resourceId === 'ultimate' || e.planId?.startsWith('cohort-ultimate'));

    if (!matchesId && !isMasteryBooster && !isUltimateResource) return false;
    if (!e.isActive) return false;

    // Check starts_at: cannot access resource before its designated activation date
    // Note: For booster materials bundled in cohort plans, students have immediate book access
    if (e.startsAt && !isMasteryBooster && !isUltimateResource) {
      const starts = new Date(e.startsAt);
      if (starts.getTime() > now.getTime()) {
        return false;
      }
    }

    // Check expires_at: cannot access resource after its expiration date
    // Boosters in Mastery & Ultimate have permanent lifetime access
    if (e.expiresAt && !isMasteryBooster && !isUltimateResource) {
      const expires = new Date(e.expiresAt);
      if (expires.getTime() <= now.getTime()) {
        return false;
      }
    }

    if (!e.expiresAt) return true; // Lifetime access
    return true;
  });
}

/**
 * Fetch a student's profile by their auth user ID.
 * Returns null if no profile exists yet.
 */
export async function fetchUserProfile(
  userId: string
): Promise<{ profile: StudentProfile | null; error?: string }> {
  if (!userId) {
    return { profile: null, error: 'User ID is required' };
  }

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { profile: null, error: error.message };
    }

    if (!data) {
      return { profile: null };
    }

    const profile: StudentProfile = {
      id: data.id,
      email: data.email,
      fullName: data.full_name || '',
      phone: data.phone || '',
      whatsappPhone: data.whatsapp_phone || '',
      telegramPhone: data.telegram_phone || '',
      parentPhone: data.parent_phone || '',
      role: data.role || 'student',
      targetUniversity: data.target_university || '',
      targetCourse: data.target_course || '',
      utmeSubjects: data.utme_subjects || ['English'],
      onboardingCompleted: data.onboarding_completed || false,
      onboardingStep: data.onboarding_step || 1,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { profile };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'Failed to fetch student profile' };
  }
}

/**
 * Save or update a student's profile.
 * Only authenticated users can update their own profile record (enforced by RLS).
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

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select('*')
      .single();

    if (error) {
      return { profile: null, error: error.message };
    }

    const updated: StudentProfile = {
      id: data.id,
      email: data.email,
      fullName: data.full_name || '',
      phone: data.phone || '',
      whatsappPhone: data.whatsapp_phone || '',
      telegramPhone: data.telegram_phone || '',
      parentPhone: data.parent_phone || '',
      role: data.role || 'student',
      targetUniversity: data.target_university || '',
      targetCourse: data.target_course || '',
      utmeSubjects: data.utme_subjects || ['English'],
      onboardingCompleted: data.onboarding_completed || false,
      onboardingStep: data.onboarding_step || 1,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { profile: updated };
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

  // Check for Ultimate
  const hasUltimate =
    activeEntitlements.some(e => e.resourceId === 'cohort-ultimate' || e.resourceId === 'ultimate' || e.planId === 'cohort-ultimate') ||
    orders.some(o => o.product_id === 'cohort-ultimate' || o.product_id === 'ultimate');

  // Check for Mastery
  const hasMastery =
    !hasUltimate &&
    (activeEntitlements.some(e => e.resourceId.startsWith('cohort-mastery') || e.resourceId === 'mastery' || e.planId === 'cohort-mastery') ||
     orders.some(o => o.product_id?.startsWith('cohort-mastery') || o.product_id === 'mastery'));

  // Check for Core
  const hasCore =
    !hasUltimate &&
    !hasMastery &&
    (activeEntitlements.some(e => e.resourceId.startsWith('cohort-core') || e.resourceId === 'core' || e.planId === 'cohort-core') ||
     orders.some(o => o.product_id?.startsWith('cohort-core') || o.product_id === 'core'));

  const resourceEntitlements = activeEntitlements.filter(
    e => !e.resourceId.startsWith('cohort-') && e.resourceId !== 'core' && e.resourceId !== 'mastery' && e.resourceId !== 'ultimate'
  );

  const authorizedResources = activeEntitlements.map(e => ({
    id: e.resourceId,
    title: e.resourceTitle || e.resourceId,
    startsAt: e.startsAt,
    expiresAt: e.expiresAt,
    isLifetime: !e.expiresAt,
    grantSource: e.grantSource,
  }));

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
          href: '/library',
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
          href: '/library',
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
          href: '/library',
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
}> {
  let entitlements: StudentEntitlement[] = [];
  if (userId || userEmail) {
    const res = await fetchUserEntitlements(userId, userEmail);
    entitlements = res.entitlements || [];
  }

  const nowUtc = Date.now();

  const hasMasteryCohort = entitlements.some(
    e => e.isActive && (e.resourceId.startsWith('cohort-mastery') || e.resourceId === 'mastery' || e.planId?.startsWith('cohort-mastery'))
  );
  const hasUltimateCohort = entitlements.some(
    e => e.isActive && (e.resourceId.startsWith('cohort-ultimate') || e.resourceId === 'ultimate' || e.planId?.startsWith('cohort-ultimate'))
  );

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
      actionLabel: 'Open in Reader',
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
      actionLabel: 'Open in Reader',
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
      actionLabel: 'Open in Reader',
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
      actionLabel: 'Open in Reader',
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
      readerUrl: '/library',
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
      readerUrl: '/library',
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

    // 2. Paid items: match against active entitlements
    const matchingEntitlement = entitlements.find((e) => {
      if (!e.isActive) return false;
      if (def.id === 'cohort-core') {
        return e.resourceId.startsWith('cohort-core') || e.resourceId === 'core' || e.planId?.startsWith('cohort-core');
      }
      if (def.id === 'cohort-mastery') {
        return e.resourceId.startsWith('cohort-mastery') || e.resourceId === 'mastery' || e.planId?.startsWith('cohort-mastery');
      }
      if (def.id === 'cohort-ultimate') {
        return e.resourceId.startsWith('cohort-ultimate') || e.resourceId === 'ultimate' || e.planId?.startsWith('cohort-ultimate');
      }
      if (def.id === 'post-utme-brainstorming-hub') {
        return e.resourceId === 'post-utme-brainstorming-hub' || e.resourceId === 'post-utme-pq';
      }
      return e.resourceId === def.id || e.resourceId === def.slug;
    });

    // Check cohort inclusions for science boosters and Post-UTME hub
    const isBundledInMastery =
      (def.id === 'chemistry-booster' || def.id === 'biology-booster' || def.id === 'physics-booster') &&
      (hasMasteryCohort || hasUltimateCohort);

    const isBundledInUltimate =
      (def.id === 'post-utme-brainstorming-hub') && hasUltimateCohort;

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
        actionLabel: def.actionLabel || 'Open Reader',
      };
    }

    // Handled via plan inclusion if not individual row
    if (isBundledInMastery) {
      return {
        ...def,
        isOwned: true,
        purchaseStatus: 'plan_inclusion',
        purchaseStatusLabel: hasUltimateCohort ? 'Included in Ultimate Track' : 'Included in Mastery Track',
        accessStatus: 'active_lifetime',
        accessStatusLabel: 'Permanent Lifetime Access',
        grantSource: 'plan_inclusion',
        actionLabel: 'Open in Reader',
      };
    }

    if (isBundledInUltimate) {
      return {
        ...def,
        isOwned: true,
        purchaseStatus: 'plan_inclusion',
        purchaseStatusLabel: 'Included in Ultimate Track',
        accessStatus: 'active_lifetime',
        accessStatusLabel: 'Permanent Lifetime Access',
        grantSource: 'plan_inclusion',
        actionLabel: 'Open in Reader',
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

  return { items, ownedCount, unownedCount };
}
