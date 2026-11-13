// TECHMED notification emails (Resend).
// Called only by the database (sign-up trigger and a daily pg_cron job),
// authenticated with a shared secret kept in app_secrets. Not public.
//   POST {type:"welcome", email, name?}  -> welcome email + add to Resend contacts
//   POST {type:"renewals"}               -> plan-ending (3 days) and grace-started reminders
import { createClient } from "jsr:@supabase/supabase-js@2";

const FROM = "TECHMED <hello@auth.techmedng.com>";
const REPLY_TO = "admissions@techmedng.com";
const SITE = "https://techmedng.com";
const WHATSAPP = "https://wa.me/2347044255045";
const PLAN_NAME: Record<string, string> = { "cohort-core": "Core", "cohort-mastery": "Mastery", "cohort-ultimate": "Ultimate" };

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const RESEND = Deno.env.get("RESEND_API_KEY") || "";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const firstName = (n?: string | null) => (n || "").trim().split(/\s+/)[0] || "";

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F8F9FA;font-family:'Source Sans 3',Arial,sans-serif;color:#012748">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#012748;color:#fff;border-radius:12px 12px 0 0;padding:18px 22px;font-family:Montserrat,Arial,sans-serif;font-weight:800;letter-spacing:.5px">TECHMED</div>
<div style="background:#fff;border-radius:0 0 12px 12px;padding:22px;border:1px solid #e3e8ee;border-top:0">
<h1 style="font-family:Montserrat,Arial,sans-serif;font-size:20px;margin:0 0 12px">${title}</h1>${body}
<p style="font-size:13px;color:#6C87A0;margin-top:24px">Questions? Reply to this email or <a href="${WHATSAPP}" style="color:#09476E">chat with us on WhatsApp</a>.</p>
</div></div></body></html>`;
}
const btn = (href: string, label: string) =>
  `<p style="margin:18px 0"><a href="${href}" style="background:#C9A227;color:#012748;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;display:inline-block">${label}</a></p>`;

async function send(to: string, subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject, html }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
}

async function welcome(email: string, name?: string) {
  const fn = firstName(name);
  const html = shell(`Welcome to TECHMED${fn ? `, ${esc(fn)}` : ""}!`, `
<p>Your free TECHMED account is ready. Here's how to get the most from it:</p>
<ul style="padding-left:18px;line-height:1.7">
<li><a href="${SITE}/quizzes" style="color:#09476E"><b>Take today's free quiz</b></a>: new practice quizzes drop regularly.</li>
<li><b>Turn on notifications</b> in your <a href="${SITE}/dashboard" style="color:#09476E">dashboard</a> so you never miss a new quiz, live class or mock exam.</li>
<li><a href="${SITE}/resources" style="color:#09476E"><b>Browse study resources</b></a> made for JAMB, WAEC and NECO.</li>
</ul>${btn(`${SITE}/dashboard`, "Open my dashboard")}`);
  await send(email, "Welcome to TECHMED 🎓", html);
  // Add to Resend contacts so announcements can be broadcast. Non-fatal.
  await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, first_name: fn || undefined, unsubscribed: false }),
  }).catch(() => {});
}

async function renewals() {
  const now = Date.now();
  const day = 86_400_000;
  const { data, error } = await admin
    .from("entitlements")
    .select("customer_email, user_id, resource_id, expires_at")
    .in("resource_id", Object.keys(PLAN_NAME))
    .eq("is_active", true)
    .is("revoked_at", null)
    .not("expires_at", "is", null)
    .gte("expires_at", new Date(now - day).toISOString())
    .lt("expires_at", new Date(now + 3 * day).toISOString());
  if (error) throw error;

  // One email per student: their furthest-reaching plan decides.
  const best = new Map<string, { email: string; plan: string; end: number }>();
  for (const e of data || []) {
    if (!e.customer_email) continue;
    const key = e.customer_email.toLowerCase();
    const end = new Date(e.expires_at).getTime();
    const cur = best.get(key);
    if (!cur || end > cur.end) best.set(key, { email: e.customer_email, plan: PLAN_NAME[e.resource_id], end });
  }
  // Skip anyone who still has a plan running beyond this window.
  const { data: later } = await admin
    .from("entitlements")
    .select("customer_email, expires_at")
    .in("resource_id", Object.keys(PLAN_NAME))
    .eq("is_active", true)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gte.${new Date(now + 3 * day).toISOString()}`);
  for (const l of later || []) if (l.customer_email) best.delete(l.customer_email.toLowerCase());

  let ending = 0, grace = 0;
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  for (const s of best.values()) {
    if (s.end > now + 2 * day && s.end <= now + 3 * day) {
      await send(s.email, `Your TECHMED ${s.plan} plan ends in 3 days`, shell(`Your ${s.plan} plan ends on ${fmt(s.end)}`, `
<p>Renew before then to keep your live classes, class links and plan quizzes without a break.</p>${btn(`${SITE}/pricing`, "Renew my plan")}`));
      ending++;
    } else if (s.end > now - day && s.end <= now) {
      await send(s.email, `Your TECHMED ${s.plan} plan has ended: 3 days left to renew`, shell(`Your ${s.plan} plan ended on ${fmt(s.end)}`, `
<p>You still have <b>3 days of access</b> to your classes and quizzes. Renew now so you don't lose access when this grace period ends on ${fmt(s.end + 3 * day)}.</p>${btn(`${SITE}/pricing`, "Renew my plan")}`));
      grace++;
    }
  }
  return { ending, grace };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const { data: secret } = await admin.from("app_secrets").select("value").eq("name", "notify_hook_secret").maybeSingle();
  if (!secret?.value || req.headers.get("x-techmed-notify") !== secret.value) return json({ error: "forbidden" }, 403);
  if (!RESEND) return json({ error: "no_resend_key" }, 500);
  try {
    const body = await req.json();
    if (body.type === "welcome" && typeof body.email === "string") {
      await welcome(body.email, body.name);
      return json({ ok: true });
    }
    if (body.type === "renewals") return json({ ok: true, ...(await renewals()) });
    return json({ error: "bad_request" }, 400);
  } catch (err) {
    console.error("[notify-email]", err);
    return json({ error: "send_failed", detail: String((err as Error).message).slice(0, 300) }, 502);
  }
});
