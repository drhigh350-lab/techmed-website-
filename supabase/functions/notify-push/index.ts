// TECHMED automatic push notifications (OneSignal "Techmed app").
// Called only by the database (pg_cron + order trigger) with the shared secret.
//   {action:"tick"}      every 5 min: class reminders (timetable + Studio "Scheduled live class"),
//                        new quizzes, mock exams opening/closing
//   {action:"midday"}    daily 12:07 Lagos: renewal pushes + enrol campaign
//   {action:"evening"}   daily 20:07 Lagos: inactivity nudges + "classes start tomorrow"
//   {action:"payment", user_id}  payment verified
// Every send is recorded in notify_log, so nothing is ever sent twice.
import { createClient } from "jsr:@supabase/supabase-js@2";

const APP_ID = "25f06ed1-29ab-4da8-871a-2fb9f0aa35b5";
const KEY = Deno.env.get("ONESIGNAL_REST_KEY") || "";
const SITE = "https://techmedng.com";
const SANITY = "https://kxoz58eb.apicdn.sanity.io/v2024-01-01/data/query/production";
const CLASSES_START = "2026-11-30"; // first live class day (Lagos)
const HOUR = 3_600_000, MIN = 60_000, DAY = 86_400_000;

// Weekly timetable (Lagos time). Keep in sync with web/src/lib/dashboard-data.ts.
const TIMETABLE: Record<number, Array<{ at: string; subject: string }>> = {
  1: [{ at: "19:00", subject: "Biology / Mathematics" }, { at: "21:10", subject: "Chemistry" }],
  2: [{ at: "19:00", subject: "English Language" }, { at: "21:10", subject: "Physics" }],
  3: [{ at: "19:00", subject: "Mathematics / Biology" }, { at: "21:10", subject: "Chemistry" }],
  4: [{ at: "19:00", subject: "English Language" }, { at: "21:10", subject: "Physics" }],
  5: [{ at: "19:00", subject: "Chemistry" }, { at: "21:10", subject: "Biology / Mathematics" }],
  6: [{ at: "19:00", subject: "English Language" }, { at: "21:10", subject: "Physics" }],
};

// OneSignal templates (created in the dashboard) used for personal messages.
const T = {
  PAYMENT_VERIFIED: "240dfbb9-cea7-44ae-8b25-1093e041526b",
  RENEWAL_7D: "52b5b954-519f-453c-b3a1-1604f14c8ba8",
  RENEWAL_3D: "098c2968-53d1-4c96-b8f9-47ea9dfdfa40",
  EXPIRES_TODAY: "3b3a3007-cc1b-4406-8924-b92e6b80f460",
  GRACE_ENDING: "7cf56ee6-1d8e-4194-9404-c2cc71393c74",
  INACTIVE_3D: "6d3f0096-f338-4fda-9b1b-9f04abc9220a",
  INACTIVE_7D: "0610bb69-b1b7-49f0-94ac-5a17480a4da8",
  INACTIVE_14D: "c718047f-80a8-41c4-a154-94ceee1a307e",
};

type Filter = Record<string, string>;
const ALL: Filter[] = [{ field: "session_count", relation: ">", value: "0" }];
const FREE: Filter[] = [{ field: "tag", key: "plan", relation: "=", value: "free" }];
const PAID: Filter[] = [
  { field: "tag", key: "plan", relation: "=", value: "core" }, { operator: "OR" } as Filter,
  { field: "tag", key: "plan", relation: "=", value: "mastery" }, { operator: "OR" } as Filter,
  { field: "tag", key: "plan", relation: "=", value: "ultimate" },
];
const inactive = (fromH: number, toH: number): Filter[] => [
  { field: "last_session", relation: ">", hours_ago: String(fromH) },
  { field: "last_session", relation: "<", hours_ago: String(toH) },
];

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

// ---- helpers ----
async function once(key: string): Promise<boolean> {
  const { error } = await admin.from("notify_log").insert({ key });
  return !error; // false = already sent
}
async function push(body: Record<string, unknown>) {
  const r = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${KEY}` },
    body: JSON.stringify({ app_id: APP_ID, target_channel: "push", ...body }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || (out as { errors?: unknown }).errors) console.error("[notify-push]", JSON.stringify(out).slice(0, 400));
  return out;
}
const msg = (filters: Filter[], title: string, text: string, path = "/dashboard") =>
  push({ filters, headings: { en: title }, contents: { en: text }, url: SITE + path });
const toUser = (userId: string, template: string) =>
  push({ template_id: template, include_aliases: { external_id: [userId] } });

async function sanity<T>(query: string): Promise<T> {
  const r = await fetch(`${SANITY}?query=${encodeURIComponent(query)}`);
  return (await r.json()).result as T;
}
// Lagos is UTC+1 all year.
const lagos = (t = Date.now()) => new Date(t + HOUR);
const lagosDate = (t = Date.now()) => lagos(t).toISOString().slice(0, 10);
const atLagos = (date: string, hhmm: string) => Date.parse(`${date}T${hhmm}:00+01:00`);

// ---- class reminders: 30 min before (paid), live now (paid), live-now upsell (free) ----
async function classAlerts(id: string, start: number, subject: string, audience: "paid" | "all", now: number) {
  const pct = audience === "all" ? ALL : PAID;
  if (now >= start - 30 * MIN && now < start - 20 * MIN && (await once(`c30:${id}`)))
    await msg(pct, `⏰ ${subject} class starts in 30 minutes`, "Get ready! Your class link is in your dashboard.");
  if (now >= start && now < start + 10 * MIN && (await once(`live:${id}`)))
    await msg(pct, `🔴 ${subject} class is LIVE now`, "Join now from your dashboard. Don't miss a minute.");
  if (audience === "paid" && now >= start + 5 * MIN && now < start + 20 * MIN && (await once(`up:${id}`)))
    await msg(FREE, `🔴 ${subject} class is going on right now`, "TECHMED students are in class. Enrol today and join the next one.", "/pricing");
}

async function tick() {
  const now = Date.now();
  const today = lagosDate(now);
  // 1) Timetable classes (from the first class day, Monday–Saturday)
  if (today >= CLASSES_START) {
    for (const s of TIMETABLE[lagos(now).getUTCDay()] || []) {
      await classAlerts(`tt:${today}:${s.at}`, atLagos(today, s.at), s.subject, "paid", now);
    }
  }
  // 2) One-off classes scheduled in Studio (Class Link → "Scheduled live class")
  const sessions = await sanity<Array<{ _id: string; title: string; startsAt: string; minimumPlan?: string }>>(
    `*[_type=="classLink" && kind=="session" && active!=false && defined(startsAt) && !(_id in path("drafts.**")) && dateTime(startsAt) > dateTime(now()) - 3600 && dateTime(startsAt) < dateTime(now()) + 7200]{_id,title,startsAt,minimumPlan}`,
  ).catch(() => []);
  for (const s of sessions || []) {
    await classAlerts(`s:${s._id}:${s.startsAt}`, Date.parse(s.startsAt), s.title, s.minimumPlan === "free" ? "all" : "paid", now);
  }
  // 3) New quizzes and mock exams
  const quizzes = await sanity<Array<{ _id: string; title: string; slug: string; category: string; programme?: string; comingSoon?: boolean; opensAt?: string; closesAt?: string }>>(
    `*[_type=="quiz" && status=="Live" && category!="hidden" && !(_id in path("drafts.**")) && !(title match "TEST*")]{_id,title,"slug":slug.current,category,programme,comingSoon,opensAt,closesAt}`,
  ).catch(() => []);
  // First run: remember what already exists so old quizzes are not announced.
  if (await once("bootstrap:quizzes")) {
    for (const q of quizzes || []) await once(`quiz:${q._id}`);
    return { bootstrapped: (quizzes || []).length };
  }
  for (const q of quizzes || []) {
    const open = !q.comingSoon && (!q.opensAt || Date.parse(q.opensAt) <= now);
    const closed = q.closesAt && Date.parse(q.closesAt) <= now;
    if (!open || closed) continue;
    const isMock = q.programme === "Mock Exam";
    const who = q.category === "paid" ? PAID : ALL;
    if (await once(`quiz:${q._id}`)) {
      await msg(who, isMock ? `📝 Mock exam is OPEN: ${q.title}` : `🔥 New quiz dropped`, isMock ? "Sit it now under real exam conditions." : q.title, `/quizzes/${q.slug}`);
    }
    if (isMock && q.closesAt && Date.parse(q.closesAt) - now <= 2 * HOUR && (await once(`mockclose:${q._id}`))) {
      await msg(who, `⏳ Mock exam closes in 2 hours`, `${q.title}: last chance to take it.`, `/quizzes/${q.slug}`);
    }
  }
  return { ok: true };
}

// ---- renewals (personal, by account id) ----
async function renewals() {
  const now = Date.now();
  const { data } = await admin
    .from("entitlements")
    .select("user_id, resource_id, expires_at")
    .in("resource_id", ["cohort-core", "cohort-mastery", "cohort-ultimate"])
    .eq("is_active", true).is("revoked_at", null).not("expires_at", "is", null).not("user_id", "is", null)
    .gte("expires_at", new Date(now - 3 * DAY).toISOString())
    .lt("expires_at", new Date(now + 8 * DAY).toISOString());
  const { data: later } = await admin
    .from("entitlements").select("user_id")
    .in("resource_id", ["cohort-core", "cohort-mastery", "cohort-ultimate"])
    .eq("is_active", true).is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gte.${new Date(now + 8 * DAY).toISOString()}`);
  const keep = new Set((later || []).map((l) => l.user_id));
  const best = new Map<string, number>();
  for (const e of data || []) {
    if (keep.has(e.user_id)) continue;
    const end = Date.parse(e.expires_at);
    if (end > (best.get(e.user_id) ?? 0)) best.set(e.user_id, end);
  }
  let sent = 0;
  for (const [uid, end] of best) {
    const days = Math.round((Date.parse(lagosDate(end)) - Date.parse(lagosDate(now))) / DAY);
    const t = days === 7 ? T.RENEWAL_7D : days === 3 ? T.RENEWAL_3D : days === 0 ? T.EXPIRES_TODAY : days === -2 ? T.GRACE_ENDING : null;
    if (t && (await once(`renew:${uid}:${lagosDate(end)}:${days}`))) { await toUser(uid, t); sent++; }
  }
  return sent;
}

// ---- enrol campaign (free students), daily ----
const BEFORE = [
  ["⏳ {n} days to go", "Live UTME 2027 classes start Monday, 30 November. Secure your seat today."],
  ["Your 2027 score starts now", "Live classes in English, Maths, Physics, Chemistry and Biology, Monday to Saturday, from 30 November."],
  ["Don't prepare alone", "Live teaching, class quizzes and mock exams. Enrol before classes start on 30 November."],
  ["Pick your plan", "Core, Mastery or Ultimate: choose the plan that fits you and start on 30 November."],
  ["Evening classes that fit school", "Classes run from 7 PM, Monday to Saturday, starting 30 November. Enrol now."],
  ["Study with a plan", "A 12-week core programme, then intensive revision until UTME 2027. Enrol today."],
  ["Think smart. Perform elite.", "Be ready on day one. Enrol in TECHMED live classes before 30 November."],
];
const AFTER = [
  ["Classes are ongoing 🔴", "TECHMED live classes run Monday to Saturday from 7 PM. It's not too late to join."],
  ["You can still join", "Enrol today and get your class links straight away in your dashboard."],
  ["Catch up and keep up", "Live classes, class quizzes and mock exams are happening now. Join your classmates."],
];
async function enrolCampaign() {
  const today = lagosDate();
  if (!(await once(`enrol:${today}`))) return "already";
  const dayN = Math.round((Date.parse(CLASSES_START) - Date.parse(today)) / DAY);
  if (dayN === 0) {
    await msg(FREE, "Classes start TODAY at 7 PM 🎉", "Last chance to be in class from day one. Enrol now.", "/pricing");
    await msg(PAID, "Today's the day! 🎉", "Your first live class is at 7 PM. Your class links are in your dashboard.");
    return "start-day";
  }
  const list = dayN > 0 ? BEFORE : AFTER;
  const idx = Math.abs(Math.round(Date.parse(today) / DAY)) % list.length;
  const [title, text] = list[idx];
  await msg(FREE, title.replace("{n}", String(dayN)), text, "/pricing");
  return "sent";
}

async function evening() {
  // Inactivity nudges: each band is one day wide, so each student gets each nudge once.
  const today = lagosDate();
  if (await once(`inactive:${today}`)) {
    await push({ template_id: T.INACTIVE_3D, filters: inactive(72, 96) });
    await push({ template_id: T.INACTIVE_7D, filters: inactive(168, 192) });
    await push({ template_id: T.INACTIVE_14D, filters: inactive(336, 360) });
  }
  // Night before the first class
  const tomorrow = lagosDate(Date.now() + DAY);
  if (tomorrow === CLASSES_START && (await once(`eve:${CLASSES_START}`))) {
    await msg(PAID, "Classes start tomorrow! 🎉", "Your first live class is tomorrow at 7 PM. Your class links are ready in your dashboard.");
    await msg(FREE, "TECHMED classes start tomorrow", "Live UTME 2027 classes begin tomorrow at 7 PM. Enrol tonight to be in class from day one.", "/pricing");
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const { data: secret } = await admin.from("app_secrets").select("value").eq("name", "notify_hook_secret").maybeSingle();
  if (!secret?.value || req.headers.get("x-techmed-notify") !== secret.value) return json({ error: "forbidden" }, 403);
  if (!KEY) return json({ error: "no_onesignal_key" }, 500);
  try {
    const b = await req.json();
    if (b.action === "tick") return json(await tick());
    if (b.action === "midday") return json({ renewals: await renewals(), enrol: await enrolCampaign() });
    if (b.action === "evening") return json(await evening());
    if (b.action === "payment" && typeof b.user_id === "string") {
      if (await once(`paid:${b.reference || b.user_id}`)) await toUser(b.user_id, T.PAYMENT_VERIFIED);
      return json({ ok: true });
    }
    return json({ error: "bad_request" }, 400);
  } catch (err) {
    console.error("[notify-push]", err);
    return json({ error: "failed", detail: String((err as Error).message).slice(0, 300) }, 502);
  }
});
