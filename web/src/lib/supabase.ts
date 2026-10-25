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

export interface StudentProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  role?: string;
}

export interface StudentEntitlement {
  id: string;
  userId?: string;
  customerEmail: string;
  resourceId: string;
  grantSource: 'purchase' | 'bundle_inclusion' | 'plan_inclusion' | 'admin_grant' | 'scholarship' | 'trial';
  planId?: string | null;
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

import { generateRosterEntitlements, getEnrolledStudent } from './roster';

export async function fetchUserEntitlements(
  userId?: string,
  userEmail?: string
): Promise<{ entitlements: StudentEntitlement[]; error?: string; migrationApplied: boolean }> {
  if (!userId && !userEmail) {
    return { entitlements: [], migrationApplied: true };
  }

  const supabase = getSupabase();
  const rosterGrants = userEmail ? generateRosterEntitlements(userEmail, userId) : [];

  try {
    let query = supabase.from('entitlements').select('*');

    if (userId) {
      query = query.or(`user_id.eq.${userId},customer_email.ilike.${userEmail || ''}`);
    } else if (userEmail) {
      query = query.ilike('customer_email', userEmail);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist yet on remote Supabase (HTTP 404 / code 42P01 / PGRST204)
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation "entitlements" does not exist') ||
        error.code === 'PGRST204'
      ) {
        // Fallback to roster inclusions + local claimed entitlements
        const local = getLocalEntitlements(userEmail);
        const combined = [...rosterGrants];
        for (const loc of local) {
          if (!combined.some(c => c.resourceId === loc.resourceId)) {
            combined.push(loc);
          }
        }
        return {
          entitlements: combined,
          migrationApplied: false,
          error: 'The database entitlements migration is not yet applied on this Supabase project.',
        };
      }
      return { entitlements: rosterGrants, migrationApplied: true, error: error.message };
    }

    const mapped: StudentEntitlement[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      customerEmail: row.customer_email,
      resourceId: row.resource_id,
      grantSource: row.grant_source,
      planId: row.plan_id,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      isActive: row.is_active,
    }));

    // Merge roster inclusions and locally verified entitlements
    const local = getLocalEntitlements(userEmail);
    const combined = [...mapped];

    // Merge roster grants if not already in DB
    for (const r of rosterGrants) {
      if (!combined.some(c => c.resourceId === r.resourceId && c.grantSource === 'plan_inclusion')) {
        combined.push(r);
      }
    }

    // Merge local claims
    for (const loc of local) {
      if (!combined.some(c => c.resourceId === loc.resourceId)) {
        combined.push(loc);
      }
    }

    return { entitlements: combined, migrationApplied: true };
  } catch (err: any) {
    const local = getLocalEntitlements(userEmail);
    const combined = [...rosterGrants, ...local];
    return { entitlements: combined, migrationApplied: false, error: err?.message || 'Network error' };
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
  // Free resources are always accessible
  if (resourceId === 'admission-intelligence-guide-2026' || resourceId === 'free-quiz-practice' || resourceId === 'kairo') {
    return true;
  }

  // Check local cache first
  const local = getLocalEntitlements(user?.email);
  if (local.some(e => (e.resourceId === resourceId || e.resourceId === resourceId.replace('-system', '')) && e.isActive)) {
    return true;
  }

  if (!user?.id && !user?.email) {
    return false;
  }

  const { entitlements } = await fetchUserEntitlements(user.id, user.email);
  const now = new Date();
  return entitlements.some(e => {
    const matchesId = e.resourceId === resourceId || e.resourceId === resourceId.replace('-system', '');
    if (!matchesId || !e.isActive) return false;
    if (!e.expiresAt) return true; // Lifetime access
    return new Date(e.expiresAt) > now;
  });
}
