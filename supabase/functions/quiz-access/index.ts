// supabase/functions/quiz-access/index.ts
// TECHMED Quiz Hub + Easy Access Zone server.
//
// GET ?action=public-key   -> the public half of the sealing key (for the Studio)
// GET ?action=quizzes      -> every visible quiz with its state for THIS student
// GET ?action=classes      -> class links this student's plan covers
//
// Quiz and class content lives in Sanity (public dataset, free plan). Links and
// passcodes of locked items are SEALED in the Studio with RSA-OAEP using the
// public key below; only this server holds the private key (public.app_secrets,
// service-role only) and unseals them, and only for entitled students.
// Logged-out visitors are allowed (they get free quizzes and locked previews).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SANITY_PROJECT = "kxoz58eb";
const SANITY_DATASET = "production";
const SEAL_PREFIX = "sealed:v1:";
const KEY_NAME = "sanity_seal_rsa_oaep_v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": cache },
  });
}

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Website resource slugs -> product ids used by the access rules.
const RESOURCE_SLUG_TO_PRODUCT: Record<string, string> = {
  "chemistry-booster-system": "chemistry-booster",
  "biology-booster-system": "biology-booster",
  "physics-booster-system": "physics-booster",
  "post-utme-brainstorming-hub": "post-utme-pq",
  "university-research-file": "research-file",
  "techmed-admission-intelligence-guide-2026": "admission-intelligence-guide-2026",
};

const PLAN_LEVEL: Record<string, number> = { free: 0, core: 1, mastery: 2, ultimate: 3 };
const PLAN_NAME: Record<string, string> = { core: "Core", mastery: "Mastery", ultimate: "Ultimate" };

// ---------------------------------------------------------------- keys
let cachedPrivate: CryptoKey | null = null;
let cachedPublicB64: string | null = null;

async function loadOrCreateKeys(admin: ReturnType<typeof createClient>) {
  if (cachedPrivate && cachedPublicB64) return { priv: cachedPrivate, pub: cachedPublicB64 };
  const { data } = await admin.from("app_secrets").select("value").eq("name", KEY_NAME).maybeSingle();
  let stored: { pkcs8: string; spki: string } | null = data?.value ? JSON.parse(data.value) : null;
  if (!stored) {
    const pair = await crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["encrypt", "decrypt"],
    );
    stored = {
      pkcs8: b64(await crypto.subtle.exportKey("pkcs8", pair.privateKey)),
      spki: b64(await crypto.subtle.exportKey("spki", pair.publicKey)),
    };
    // insert-only: if another request created it first, use theirs
    const { error } = await admin.from("app_secrets").insert({ name: KEY_NAME, value: JSON.stringify(stored) });
    if (error) {
      const { data: again } = await admin.from("app_secrets").select("value").eq("name", KEY_NAME).single();
      stored = JSON.parse(again!.value);
    }
  }
  cachedPrivate = await crypto.subtle.importKey("pkcs8", unb64(stored!.pkcs8), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  cachedPublicB64 = stored!.spki;
  return { priv: cachedPrivate, pub: cachedPublicB64 };
}

async function unseal(value: string | null | undefined, priv: CryptoKey): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith(SEAL_PREFIX)) return value; // plain value (e.g. typed before sealing existed)
  try {
    const plain = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, priv, unb64(value.slice(SEAL_PREFIX.length)));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- sanity
async function sanity<T>(query: string): Promise<T> {
  const url = `https://${SANITY_PROJECT}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
  // The dataset is public (secrets are sealed), so no token is needed. If a
  // read token is configured but rejected, fall back to the public read.
  const token = Deno.env.get("SANITY_READ_TOKEN");
  let res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (token && (res.status === 401 || res.status === 403)) res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity ${res.status}`);
  return (await res.json()).result as T;
}

type QuizDoc = {
  _id: string;
  _createdAt: string;
  title: string;
  slug?: string;
  shortDescription?: string;
  subject?: string;
  topic?: string;
  programme?: string;
  questionCount?: number;
  durationMinutes?: number;
  coverImage?: string;
  tags?: string[];
  featured?: boolean;
  sortOrder?: number;
  category: "free" | "paid" | "book" | "programme" | "hidden";
  minimumPlan?: "core" | "mastery" | "ultimate";
  linkedResourceSlug?: string;
  linkedResourceTitle?: string;
  platform?: string;
  quizUrl?: string;
  sealedQuizUrl?: string;
  sealedPasscode?: string;
  status: "Draft" | "Live" | "Closed" | "Archived";
  opensAt?: string;
  closesAt?: string;
  comingSoonText?: string;
  waitlistMessage?: string;
};

const QUIZ_QUERY = `*[_type == "quiz" && !(_id in path("drafts.**")) && category != "hidden" && status in ["Live", "Closed"]]{
  _id, _createdAt, title, "slug": slug.current, shortDescription, subject, topic, programme,
  questionCount, durationMinutes, "coverImage": coverImage.asset->url, tags, featured, sortOrder,
  category, minimumPlan, "linkedResourceSlug": linkedResource->slug.current, "linkedResourceTitle": linkedResource->title,
  platform, quizUrl, sealedQuizUrl, sealedPasscode, status, opensAt, closesAt, comingSoonText, waitlistMessage
}`;

const CLASS_QUERY = `*[_type == "classLink" && !(_id in path("drafts.**")) && active != false]{
  _id, title, subject, topic, kind, startsAt, platform, url, sealedUrl, minimumPlan, notes
} | order(kind asc, startsAt asc, subject asc)`;

// ---------------------------------------------------------------- handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "quizzes";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    if (action === "public-key") {
      const { pub } = await loadOrCreateKeys(admin);
      return json({ alg: "RSA-OAEP-256", format: "spki-base64", prefix: SEAL_PREFIX, key: pub }, 200, "public, max-age=300");
    }

    // Who is asking? (optional)
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let user: { id: string; email?: string | null; name?: string | null } | null = null;
    if (token && token.split(".").length === 3) {
      const { data } = await admin.auth.getUser(token);
      if (data?.user) {
        const md = (data.user.user_metadata || {}) as Record<string, string>;
        user = { id: data.user.id, email: data.user.email, name: md.full_name || md.name || null };
      }
    }

    let planLevel = 0;
    let plan: { plan: string; coverage_ends_at: string | null; access_ends_at: string | null; in_grace: boolean } | null = null;
    if (user) {
      const { data } = await admin.rpc("plan_status_for", { p_user_id: user.id, p_email: user.email ?? null });
      const row = Array.isArray(data) ? data[0] : null;
      if (row) {
        plan = row;
        planLevel = row.plan_level ?? 0;
      }
    }
    const planInfo = plan
      ? {
          name: PLAN_NAME[(plan.plan || "").replace("cohort-", "")] ?? null,
          level: planLevel,
          coverageEndsAt: plan.coverage_ends_at,
          accessEndsAt: plan.access_ends_at,
          inGrace: plan.in_grace,
        }
      : null;

    const { priv } = await loadOrCreateKeys(admin);

    if (action === "classes") {
      const docs = await sanity<Array<Record<string, any>>>(CLASS_QUERY);
      const out = [];
      for (const d of docs) {
        const need = PLAN_LEVEL[d.minimumPlan || "core"] ?? 1;
        const open = need === 0 || planLevel >= need;
        out.push({
          id: d._id,
          title: d.title,
          subject: d.subject,
          topic: d.topic ?? null,
          kind: d.kind ?? "classroom",
          startsAt: d.startsAt ?? null,
          platform: d.platform ?? null,
          notes: d.notes ?? null,
          minimumPlan: d.minimumPlan || "core",
          state: open ? "open" : "locked",
          url: open ? await unseal(d.sealedUrl || d.url, priv) : null,
        });
      }
      return json({ signedIn: !!user, plan: planInfo, classes: out });
    }

    if (action !== "quizzes") return json({ error: "unknown_action" }, 400);

    const docs = await sanity<QuizDoc[]>(QUIZ_QUERY);
    const now = Date.now();
    const ownCache = new Map<string, boolean>();
    const owns = async (resourceSlug?: string) => {
      if (!user || !resourceSlug) return false;
      const productId = RESOURCE_SLUG_TO_PRODUCT[resourceSlug] ?? resourceSlug;
      if (!ownCache.has(productId)) {
        const { data } = await admin.rpc("resource_access_for", {
          p_user_id: user.id,
          p_email: user.email ?? null,
          p_resource_id: productId,
        });
        ownCache.set(productId, data === true);
      }
      return ownCache.get(productId)!;
    };

    const quizzes = [];
    for (const q of docs) {
      const opensAt = q.opensAt ? Date.parse(q.opensAt) : null;
      const closesAt = q.closesAt ? Date.parse(q.closesAt) : null;
      const notYetOpen = opensAt !== null && opensAt > now;
      const closed = q.status === "Closed" || (closesAt !== null && closesAt <= now);

      let entitled = false;
      let lockReason: "plan" | "book" | null = null;
      if (q.category === "free") entitled = true;
      else if (q.category === "paid") {
        entitled = planLevel >= (PLAN_LEVEL[q.minimumPlan || "core"] ?? 1);
        if (!entitled) lockReason = "plan";
      } else if (q.category === "book") {
        entitled = await owns(q.linkedResourceSlug);
        if (!entitled) lockReason = "book";
      } else if (q.category === "programme") {
        const need = q.minimumPlan ? PLAN_LEVEL[q.minimumPlan] : 0;
        entitled = planLevel >= need;
        if (!entitled) lockReason = "plan";
      }

      const state = notYetOpen ? "coming_soon" : closed ? "closed" : entitled ? "open" : "locked";
      const canOpen = state === "open";
      const closesSoon = canOpen && closesAt !== null && closesAt - now < 3 * 24 * 3600 * 1000;
      const isNew = Date.now() - Date.parse(q._createdAt) < 7 * 24 * 3600 * 1000;

      const waitlist = notYetOpen && q.waitlistMessage
        ? q.waitlistMessage.replace(/\{\s*name\s*\}/gi, user?.name || "______")
        : null;

      quizzes.push({
        id: q._id,
        slug: q.slug ?? null,
        title: q.title,
        shortDescription: q.shortDescription ?? null,
        subject: q.subject ?? null,
        topic: q.topic ?? null,
        programme: q.programme ?? null,
        questionCount: q.questionCount ?? null,
        durationMinutes: q.durationMinutes ?? null,
        coverImage: q.coverImage ?? null,
        tags: q.tags ?? [],
        featured: !!q.featured,
        sortOrder: q.sortOrder ?? null,
        createdAt: q._createdAt,
        category: q.category,
        minimumPlan: q.minimumPlan ?? null,
        book: q.category === "book" ? { slug: q.linkedResourceSlug ?? null, title: q.linkedResourceTitle ?? null } : null,
        platform: q.platform ?? "QuizBoot",
        opensAt: q.opensAt ?? null,
        closesAt: q.closesAt ?? null,
        state,
        lockReason: state === "locked" ? lockReason : null,
        badge: state === "coming_soon" ? "Coming soon" : state === "closed" ? "Closed" : state === "locked" ? "Locked" : closesSoon ? "Closes soon" : isNew ? "New" : "Live",
        comingSoonText: notYetOpen ? q.comingSoonText ?? null : null,
        waitlistMessage: waitlist,
        // Only for students who can open it right now:
        quizUrl: canOpen ? await unseal(q.sealedQuizUrl || q.quizUrl, priv) : null,
        passcode: canOpen ? await unseal(q.sealedPasscode, priv) : null,
      });
    }

    quizzes.sort((a, b) =>
      (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
    return json({ signedIn: !!user, plan: planInfo, quizzes });
  } catch (err) {
    console.error("quiz-access error", err);
    return json({ error: "server_error" }, 500);
  }
});
