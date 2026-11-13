// TECHMED notification emails (Resend).
// Called only by the database (sign-up trigger and a daily pg_cron job),
// authenticated with a shared secret kept in app_secrets. Not public.
//   POST {type:"welcome", email, name?}  -> welcome email + add to Resend contacts
//   POST {type:"receipt", reference}     -> TECHMED receipt with the next step
//   POST {type:"renewals"}               -> 7 and 3 days before a plan ends, each grace day
import { createClient } from "jsr:@supabase/supabase-js@2";

const FROM = "TECHMED <hello@auth.techmedng.com>";
const REPLY_TO = "admissions@techmedng.com";
const SITE = "https://techmedng.com";
const WHATSAPP = "https://wa.me/2347044255045";
const CHANNEL = "https://whatsapp.com/channel/0029Vb8nzXH545v4f8EF103D";
const READER_BOOKS = ["mole-concept-cure", "organic-chemistry-mastery"];
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

const step = (n: number, href: string, title: string, text: string) =>
  `<tr><td style="vertical-align:top;padding:10px 12px 10px 0"><div style="width:28px;height:28px;border-radius:50%;background:#012748;color:#fff;font-weight:800;text-align:center;line-height:28px;font-family:Montserrat,Arial,sans-serif">${n}</div></td><td style="padding:10px 0;border-bottom:1px solid #eef2f6"><a href="${href}" style="color:#012748;font-weight:700;text-decoration:none">${title} &rarr;</a><div style="font-size:14px;color:#3d5a73;margin-top:2px">${text}</div></td></tr>`;

async function welcome(email: string, name?: string) {
  const fn = firstName(name);
  const steps = [
    step(1, `${SITE}/account/onboarding`, "Complete your student profile", "Takes 2 minutes. Tell us your UTME subjects and goals so your dashboard fits you."),
    step(2, `${SITE}/dashboard`, "Turn on notifications", "Be the first to know when a new quiz, live class or mock exam drops."),
    step(3, `${SITE}/quizzes`, "Take today&#39;s free quiz", "See where you stand today. Every attempt makes you sharper."),
    step(4, CHANNEL, "Join our free WhatsApp channel", "Daily tips, syllabus alerts and admission guidance."),
    step(5, `${SITE}/resources`, "Explore your study resources", "E-books and boosters built for JAMB, WAEC and NECO."),
  ].join("");
  const html = shell(`Welcome to the TECHMED family${fn ? `, ${esc(fn)}` : ""}! 💙`, `
<p>We're truly glad you're here. Whether you're aiming for JAMB, WAEC or NECO, you've just taken a real step towards the score you want, and we'll walk with you every step of the way.</p>
<p style="font-family:Montserrat,Arial,sans-serif;font-weight:800;margin:20px 0 4px">Your welcome package: 5 quick steps</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${steps}</table>
${btn(`${SITE}/account/onboarding`, "Start with step 1")}
<p>Think smart. Perform elite. We believe in you.</p>
<p style="margin-bottom:0">Warmly,<br><b>Wisdom &amp; the TECHMED team</b></p>`);
  await send(email, `Welcome to TECHMED${fn ? `, ${fn}` : ""}! Your welcome package is inside 🎓`, html);
  // Add to Resend contacts so announcements can be broadcast. Non-fatal.
  await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, first_name: fn || undefined, unsubscribed: false }),
  }).catch(() => {});
}

async function receipt(reference: string) {
  const { data: o } = await admin
    .from("orders")
    .select("reference, product_id, product_name, amount, email, customer_name, paid_at, status")
    .eq("reference", reference)
    .maybeSingle();
  if (!o || o.status !== "paid" || !o.email) return { skipped: true };
  const fn = firstName(o.customer_name);
  const isPlan = String(o.product_id || "").startsWith("cohort-");
  const item = esc(o.product_name || o.product_id || "Your purchase");
  const amount = `₦${Number(o.amount || 0).toLocaleString("en-NG")}`;
  const date = new Date(o.paid_at || Date.now()).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  const row = (k: string, v: string) => `<tr><td style="padding:8px 0;color:#6C87A0;font-size:14px">${k}</td><td style="padding:8px 0;text-align:right;font-weight:600">${v}</td></tr>`;
  const next = isPlan
    ? `<p>You're now part of the TECHMED <b>${item}</b> family. Your live classes, class links and plan quizzes are waiting for you in your dashboard.</p>${btn(`${SITE}/dashboard`, "Continue to my dashboard")}`
    : `<p>Your e-book is in your library and ready to read right now. Tap <b>Save offline</b> once and you'll never spend data on it again.</p>${btn(
        READER_BOOKS.includes(String(o.product_id)) ? `${SITE}/library/read/${o.product_id}` : `${SITE}/resources?view=library`,
        "Read my e-book",
      )}`;
  const html = shell(`Thank you${fn ? `, ${esc(fn)}` : ""}! Your payment is confirmed 🎉`, `
<p>We've received your payment, and we're grateful you chose TECHMED for your preparation. Here is your receipt:</p>
<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #eef2f6;border-bottom:1px solid #eef2f6;margin:8px 0 16px">
${row("Item", item)}${row("Amount paid", amount)}${row("Date", date)}${row("Reference", esc(o.reference))}
</table>
<p style="font-family:Montserrat,Arial,sans-serif;font-weight:800;margin:0 0 4px">Your next step</p>${next}
<p style="font-size:13px;color:#6C87A0">Paystack will also send you their own payment receipt. Keep this email for your records.</p>`);
  await send(o.email, `Receipt: ${o.product_name || "your TECHMED purchase"} · ${amount}`, html);
  return { sent: true };
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
    .gte("expires_at", new Date(now - 3 * day).toISOString())
    .lt("expires_at", new Date(now + 7 * day).toISOString());
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
    .or(`expires_at.is.null,expires_at.gte.${new Date(now + 7 * day).toISOString()}`);
  for (const l of later || []) if (l.customer_email) best.delete(l.customer_email.toLowerCase());

  let sent = 0;
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  const renew = btn(`${SITE}/pricing`, "Renew my plan");
  const auto = `<p style="font-size:14px;color:#3d5a73">Access is managed automatically by our system: when your access ends, your live classes, class links and plan quizzes switch off on their own. Renewing brings everything back instantly.</p>`;
  for (const s of best.values()) {
    const dt = (s.end - now) / day; // days until the plan ends (negative = in grace)
    const graceEnd = fmt(s.end + 3 * day);
    let subject = "", title = "", body = "";
    if (dt > 6 && dt <= 7) {
      subject = `Your TECHMED ${s.plan} plan ends in 7 days`;
      title = `Your ${s.plan} plan is active until ${fmt(s.end)}`;
      body = `<p>Just a friendly heads-up: you have <b>7 days</b> left on your current plan. Renew early so your classes continue without a break.</p>${renew}`;
    } else if (dt > 2 && dt <= 3) {
      subject = `Your TECHMED ${s.plan} plan ends in 3 days`;
      title = `3 days left on your ${s.plan} plan`;
      body = `<p>Your plan ends on <b>${fmt(s.end)}</b>. Renew now to keep your live classes, class links and plan quizzes without interruption.</p>${renew}`;
    } else if (dt > -1 && dt <= 0) {
      subject = `Your ${s.plan} plan has ended: you're in your 3-day grace period`;
      title = `Grace period started: 3 days left`;
      body = `<p>Your ${s.plan} plan ended on ${fmt(s.end)}. This is not a glitch: you are now in your <b>3-day grace period</b>, so you still have full access until <b>${graceEnd}</b>.</p><p>Renew before then to keep learning without losing a single class.</p>${renew}${auto}`;
    } else if (dt > -2 && dt <= -1) {
      subject = `Grace period: 2 days left to renew your ${s.plan} plan`;
      title = `2 days left in your grace period`;
      body = `<p>You still have access until <b>${graceEnd}</b>. Renew today so you don't miss what's coming next.</p>${renew}${auto}`;
    } else if (dt > -3 && dt <= -2) {
      subject = `Last day: your TECHMED access ends today`;
      title = `Today is the last day of your grace period`;
      body = `<p>Your access ends on <b>${graceEnd}</b>. Renew now to keep your classes, class links and quizzes, and stay on track for your exam.</p>${renew}${auto}`;
    }
    if (!subject) continue;
    await send(s.email, subject, shell(title, body));
    sent++;
  }
  return { sent };
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
    if (body.type === "receipt" && typeof body.reference === "string") return json({ ok: true, ...(await receipt(body.reference)) });
    if (body.type === "renewals") return json({ ok: true, ...(await renewals()) });
    return json({ error: "bad_request" }, 400);
  } catch (err) {
    console.error("[notify-email]", err);
    return json({ error: "send_failed", detail: String((err as Error).message).slice(0, 300) }, 502);
  }
});
