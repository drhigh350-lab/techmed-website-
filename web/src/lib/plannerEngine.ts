// Study Planner engine — pure, framework-agnostic functions. No DOM, no
// localStorage, no fetch: every function here takes plain data in and
// returns plain data out, so it's testable on its own and reusable from
// both the initial plan-build step and the "recover"/replan step.
//
// Architecture (as specified): calculate available study capacity ->
// distribute subject attention -> sequence topics using the TECHMED
// Blueprint where available -> insert practice/review periods -> preserve
// weaker areas -> create realistic weekly targets.
//
// Topic sequencing reads directly from the real Blueprint data in
// syllabus.ts (Subject.stages[].topics[]) -- nothing here invents a
// syllabus structure of its own.
import type { Subject, SubjectStage } from './syllabus';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface PlannerSubjectInput {
  slug: string;
  /** Self-reported confidence -- lower confidence gets more weekly attention and more review coverage. */
  confidence: ConfidenceLevel;
  /** Index into the subject's (order-sorted) stages array to start from. 0 = the very first stage. Lets a student who's already covered some ground skip what they know. */
  startingStageIndex: number;
}

export interface PlannerInput {
  /** ISO date (yyyy-mm-dd) of the exam / target date. */
  targetDate: string;
  /** 0 (Sunday) - 6 (Saturday): which days of the week the student can realistically study. */
  availableDays: number[];
  /** Realistic hours on a normal available day -- not an aspirational number. */
  hoursPerAvailableDay: number;
  subjects: PlannerSubjectInput[];
  /** ISO date the plan was generated from. Kept explicit (rather than always "now") so a stored plan can be re-evaluated consistently and a replan can pass "today" as the new starting point. */
  createdAt: string;
}

export interface PlannedTopic {
  subjectSlug: string;
  subjectName: string;
  stageOrder: number;
  stageName: string;
  topicTitle: string;
  topicSlug?: string;
  /** Stable key for tracking completion in storage, independent of array position. */
  key: string;
  /** From the Blueprint's yield badge, where documented -- drives topicHours() below. Absent for topics the Blueprint hasn't detailed yet. */
  examWeight?: { min: number; max: number; tier: 'foundational' | 'low' | 'medium' | 'high' };
  /** Titles (within the same subject) this topic depends on, from the Blueprint's "Before You Start" guidance. Used to keep sequencing dependency-aware instead of pure stage-array order. */
  prerequisites?: string[];
}

export interface WeekPlan {
  weekNumber: number;
  startDate: string;
  endDate: string;
  isReviewWeek: boolean;
  subjectHours: Record<string, number>;
  /** New topics scheduled for first coverage this week. */
  topics: PlannedTopic[];
  /** Previously-covered topics brought back for spaced review this week. */
  reviewTopics: PlannedTopic[];
}

export interface SubjectCoverageWarning {
  subjectSlug: string;
  subjectName: string;
  topicCount: number;
  topicsThatFit: number;
}

export interface PlannerPlan {
  input: PlannerInput;
  totalWeeks: number;
  buildWeeks: number;
  reviewWeeks: number;
  weeklyCapacityHours: number;
  subjectWeeklyHours: Record<string, number>;
  weeks: WeekPlan[];
  /** Non-empty when the available time genuinely can't cover a subject's full topic list at a realistic pace -- surfaced rather than silently compressed, so "realistic" is actually true. */
  warnings: SubjectCoverageWarning[];
  /** Total topics each subject is responsible for from its chosen starting stage onward (i.e. excluding whatever the student said they'd already covered) -- the denominator for a "Blueprint coverage" progress figure. Not the same as topicCount on a warning, which only exists for subjects currently short on time. */
  subjectTopicTotals: Record<string, number>;
}

// A first-pass heuristic, not a measured constant -- deliberately simple
// for V1 (per the brief). Once real per-topic timing data exists
// (e.g. from Kairo attempt history), this can become topic-specific
// instead of a flat average.
const HOURS_PER_TOPIC_FIRST_PASS = 2.5;
const HOURS_PER_TOPIC_REVIEW = 1;

const CONFIDENCE_WEIGHT: Record<ConfidenceLevel, number> = { low: 3, medium: 2, high: 1 };

// Higher-yield topics get proportionally more study time out of a
// subject's weekly budget; lower-yield ones move faster. A topic with no
// Blueprint yield data yet (see the Fluids/Heat/Magnetism gap in
// syllabus.ts) falls back to the 'medium' multiplier -- i.e. behaves
// exactly like the flat HOURS_PER_TOPIC_FIRST_PASS constant did before
// this weighting existed.
const YIELD_HOUR_MULTIPLIER: Record<'foundational' | 'low' | 'medium' | 'high', number> = {
  foundational: 0.7,
  low: 0.75,
  medium: 1,
  high: 1.35,
};

export function topicHours(topic: Pick<PlannedTopic, 'examWeight'>): number {
  const tier = topic.examWeight?.tier ?? 'medium';
  return HOURS_PER_TOPIC_FIRST_PASS * YIELD_HOUR_MULTIPLIER[tier];
}

/** How many topics (walked in order) a given total hour budget covers, at each topic's own yield-weighted cost -- the coverage-warning counterpart to the weekly assignment loop's accumulator. */
function topicsFittingBudget(topics: PlannedTopic[], totalHours: number): number {
  let budget = totalHours;
  let count = 0;
  for (const topic of topics) {
    const cost = topicHours(topic);
    if (budget < cost) break;
    budget -= cost;
    count++;
  }
  return count;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Formats a Date's own LOCAL calendar date as YYYY-MM-DD -- never
 * `.toISOString().slice(0, 10)`, which converts to UTC first. For anyone
 * in a positive UTC offset (Nigeria is UTC+1; plenty of other timezones
 * are further ahead), local midnight -- or even local 5am -- can land on
 * the *previous* UTC calendar day, so that pattern silently returns
 * yesterday's date. That was the exact bug behind "week 1 started
 * 2026-08-13 when today is 2026-08-14": addDays() below builds each
 * week's start/end date this way, so every date in every plan was
 * quietly off by a day for anyone east of Greenwich.
 */
export function toLocalIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toLocalIso(d);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso + 'T00:00:00').getTime() - new Date(fromIso + 'T00:00:00').getTime()) / DAY_MS);
}

export function calculateWeeklyCapacity(input: Pick<PlannerInput, 'availableDays' | 'hoursPerAvailableDay'>): number {
  return input.availableDays.length * input.hoursPerAvailableDay;
}

export function calculateTotalWeeks(createdAt: string, targetDate: string): number {
  const days = daysBetween(createdAt, targetDate);
  return Math.max(1, Math.ceil(days / 7));
}

/** Lower confidence -> proportionally more weekly hours, with every subject still guaranteed a floor share. */
export function distributeSubjectAttention(
  subjects: PlannerSubjectInput[],
  weeklyCapacityHours: number,
): Record<string, number> {
  const totalWeight = subjects.reduce((sum, s) => sum + CONFIDENCE_WEIGHT[s.confidence], 0);
  const result: Record<string, number> = {};
  for (const s of subjects) {
    result[s.slug] = totalWeight > 0 ? (CONFIDENCE_WEIGHT[s.confidence] / totalWeight) * weeklyCapacityHours : 0;
  }
  return result;
}

/**
 * Moves weekly hours from subjects that have more allocated than their
 * remaining topics actually cost, toward subjects that don't have enough --
 * run once, before deciding whether a subject's coverage warning is real.
 * A donor never gives up more than half its own allocation (so a subject
 * with genuine slack doesn't get starved down to nothing itself), and
 * hours only move if there's an actual deficit to fill.
 */
export function rebalanceSubjectHours(
  subjects: PlannerSubjectInput[],
  baselineWeeklyHours: Record<string, number>,
  buildWeeks: number,
  requiredHoursBySlug: Record<string, number>,
): Record<string, number> {
  const adjusted = { ...baselineWeeklyHours };
  if (buildWeeks <= 0) return adjusted;

  let pool = 0;
  for (const s of subjects) {
    const weekly = adjusted[s.slug] ?? 0;
    const surplus = weekly * buildWeeks - (requiredHoursBySlug[s.slug] ?? 0);
    if (surplus <= 0) continue;
    const maxGiveableWeekly = weekly * 0.5; // never take more than half from any one subject
    const giveWeekly = Math.min(surplus / buildWeeks, maxGiveableWeekly);
    adjusted[s.slug] = weekly - giveWeekly;
    pool += giveWeekly * buildWeeks;
  }

  const deficits = subjects
    .map((s) => ({
      slug: s.slug,
      deficitTotal: Math.max(0, (requiredHoursBySlug[s.slug] ?? 0) - (adjusted[s.slug] ?? 0) * buildWeeks),
    }))
    .filter((d) => d.deficitTotal > 0)
    .sort((a, b) => b.deficitTotal - a.deficitTotal); // most-short subject filled first

  for (const d of deficits) {
    if (pool <= 0) break;
    const fillTotal = Math.min(pool, d.deficitTotal);
    adjusted[d.slug] = (adjusted[d.slug] ?? 0) + fillTotal / buildWeeks;
    pool -= fillTotal;
  }

  return adjusted;
}

/** Reserve a trailing slice of the timeline as review-only, sized to the timeline itself rather than any fixed calendar date -- a student's own target date drives this, nothing is hard-coded to a specific month. */
export function splitBuildAndReviewWeeks(totalWeeks: number): { buildWeeks: number; reviewWeeks: number } {
  const reviewWeeks = totalWeeks <= 2 ? (totalWeeks > 1 ? 1 : 0) : Math.max(1, Math.round(totalWeeks * 0.2));
  const buildWeeks = Math.max(1, totalWeeks - reviewWeeks);
  return { buildWeeks, reviewWeeks };
}

export function topicKey(subjectSlug: string, stageOrder: number, topicTitle: string): string {
  return `${subjectSlug}::${stageOrder}::${topicTitle}`;
}

function flattenSubjectTopics(subject: Subject, startingStageIndex: number): PlannedTopic[] {
  const stages = [...subject.stages].sort((a, b) => a.order - b.order).slice(startingStageIndex);
  const out: PlannedTopic[] = [];
  for (const stage of stages as SubjectStage[]) {
    for (const topic of stage.topics) {
      out.push({
        subjectSlug: subject.slug,
        subjectName: subject.name,
        stageOrder: stage.order,
        stageName: stage.name,
        topicTitle: topic.title,
        topicSlug: topic.slug,
        key: topicKey(subject.slug, stage.order, topic.title),
        examWeight: topic.examWeight,
        prerequisites: topic.prerequisites,
      });
    }
  }
  return orderByPrerequisites(out);
}

/**
 * Stable topological sort: keeps the Blueprint's own stage/array order as
 * the tie-break, but pulls a topic later whenever one of its stated
 * prerequisites (from the *same* subject) hasn't been placed yet -- e.g.
 * Physics's Waves depends on Motion from an earlier stage, and Biology's
 * Foundations stage has two independent valid starting points rather than
 * one strict chain. A prerequisite title that isn't present in this list
 * at all (already covered via startingStageIndex, or a title that doesn't
 * match anything -- bad data should never crash sequencing) is treated as
 * already satisfied, not as a block.
 */
function orderByPrerequisites(topics: PlannedTopic[]): PlannedTopic[] {
  const titlesInList = new Set(topics.map((t) => t.topicTitle));
  const placed = new Set<string>();
  const remaining = [...topics];
  const ordered: PlannedTopic[] = [];

  while (remaining.length > 0) {
    const readyIndex = remaining.findIndex((t) =>
      (t.prerequisites ?? []).every((p) => !titlesInList.has(p) || placed.has(p)),
    );
    // readyIndex === -1 only happens on a prerequisite cycle (bad data) --
    // fall back to the next topic in original order rather than stalling.
    const [topic] = remaining.splice(readyIndex === -1 ? 0 : readyIndex, 1);
    ordered.push(topic);
    placed.add(topic.topicTitle);
  }
  return ordered;
}

export interface BuildPlanOptions {
  input: PlannerInput;
  /** Real Blueprint subjects, e.g. from getSubjects(). Only subjects referenced in input.subjects are used. */
  allSubjects: Subject[];
  /** Topic keys to exclude from first-pass coverage -- used by the recovery/replan path to skip what's already been marked done. */
  alreadyCompletedKeys?: Set<string>;
}

export function buildPlan({ input, allSubjects, alreadyCompletedKeys }: BuildPlanOptions): PlannerPlan {
  const weeklyCapacityHours = calculateWeeklyCapacity(input);
  const totalWeeks = calculateTotalWeeks(input.createdAt, input.targetDate);
  const { buildWeeks, reviewWeeks } = splitBuildAndReviewWeeks(totalWeeks);
  const baselineWeeklyHours = distributeSubjectAttention(input.subjects, weeklyCapacityHours);
  const completed = alreadyCompletedKeys ?? new Set<string>();

  // Per-subject queue of not-yet-completed topics, in Blueprint order.
  const queues = new Map<string, PlannedTopic[]>();
  const subjectBySlug = new Map(allSubjects.map((s) => [s.slug, s]));
  const requiredHoursBySlug: Record<string, number> = {};
  const subjectTopicTotals: Record<string, number> = {};
  for (const subjectInput of input.subjects) {
    const subject = subjectBySlug.get(subjectInput.slug);
    if (!subject) continue;
    const all = flattenSubjectTopics(subject, subjectInput.startingStageIndex);
    const remaining = all.filter((t) => !completed.has(t.key));
    queues.set(subjectInput.slug, remaining);
    requiredHoursBySlug[subjectInput.slug] = remaining.reduce((sum, t) => sum + topicHours(t), 0);
    subjectTopicTotals[subjectInput.slug] = all.length;
  }

  // Try to actually fix a tight schedule before telling the student it's
  // tight: a subject with more allocated time than its remaining topics
  // need gives some of that surplus to a subject running short, rather
  // than the two subjects just sitting side by side, one wasted, one
  // squeezed. Only a subject still short *after* this gets a warning.
  const subjectWeeklyHours = rebalanceSubjectHours(input.subjects, baselineWeeklyHours, buildWeeks, requiredHoursBySlug);

  const warnings: SubjectCoverageWarning[] = [];
  for (const subjectInput of input.subjects) {
    const subject = subjectBySlug.get(subjectInput.slug);
    if (!subject) continue;
    const remaining = queues.get(subjectInput.slug) ?? [];
    // Total budget across the whole build phase, divided once -- not a
    // per-week floor multiplied out. A subject getting 2.7 hrs/week over
    // 8 weeks has 21.6 hrs total, which is a meaningfully different
    // (and correct) topic budget from flooring 2.7/2.5 to "0 extra topics
    // a week" and multiplying that by 8. The per-week assignment loop
    // below uses the same accumulator logic, walking topics in the same
    // (now prerequisite-aware, yield-weighted) order, so this number is
    // honest about what will actually get scheduled.
    const weeklyHours = subjectWeeklyHours[subjectInput.slug] ?? 0;
    const topicsThatFit = topicsFittingBudget(remaining, weeklyHours * buildWeeks);
    if (topicsThatFit < remaining.length) {
      warnings.push({
        subjectSlug: subjectInput.slug,
        subjectName: subject.name,
        topicCount: remaining.length,
        topicsThatFit,
      });
    }
  }

  const covered: PlannedTopic[] = []; // grows as build weeks consume topics, feeds the review pool
  const weeks: WeekPlan[] = [];

  // Fractional hour budget per subject, carried across weeks -- a subject
  // with less than one topic's worth of hours in a given week still gets
  // topics on the weeks the accumulated balance clears the threshold,
  // rather than silently getting zero topics forever (Math.floor's
  // failure mode when weeklyHours < HOURS_PER_TOPIC_FIRST_PASS) or one
  // guaranteed topic every week regardless of how little time it was
  // actually allotted (Math.max(1, ...)'s failure mode the other way).
  const hourBudget = new Map(input.subjects.map((s) => [s.slug, 0]));

  for (let w = 1; w <= buildWeeks; w++) {
    const startDate = addDays(input.createdAt, (w - 1) * 7);
    const endDate = addDays(startDate, 6);
    const topics: PlannedTopic[] = [];
    // Review must only draw from topics covered in *previous* weeks --
    // snapshotted here, before this week's new topics are pushed into
    // `covered` below. Without this, a topic introduced this week is
    // already sitting in `covered` by the time pickReviewTopics runs a
    // few lines down, so it could get picked to "review" the very week
    // it was first taught -- which read as the same topic bizarrely
    // showing up twice under two different tags in one week.
    const coveredBeforeThisWeek = [...covered];

    for (const subjectInput of input.subjects) {
      const weeklyHours = subjectWeeklyHours[subjectInput.slug] ?? 0;
      const queue = queues.get(subjectInput.slug) ?? [];
      let budget = (hourBudget.get(subjectInput.slug) ?? 0) + weeklyHours;

      while (queue.length > 0 && budget >= topicHours(queue[0])) {
        const [topic] = queue.splice(0, 1);
        topics.push(topic);
        covered.push(topic);
        budget -= topicHours(topic);
      }
      hourBudget.set(subjectInput.slug, budget);
    }

    // Light spaced review inside build weeks: a small slice of hours goes
    // back over recently covered ground rather than 100% new material,
    // even before the dedicated review phase.
    const reviewTopics = pickReviewTopics(coveredBeforeThisWeek, input.subjects, weeklyCapacityHours * 0.15, HOURS_PER_TOPIC_REVIEW, w);

    weeks.push({ weekNumber: w, startDate, endDate, isReviewWeek: false, subjectHours: subjectWeeklyHours, topics, reviewTopics });
  }

  for (let r = 1; r <= reviewWeeks; r++) {
    const weekNumber = buildWeeks + r;
    const startDate = addDays(input.createdAt, (weekNumber - 1) * 7);
    const endDate = addDays(startDate, 6);
    // Full review weeks weight coverage toward low-confidence subjects,
    // preserving TECHMED's "preserve weaker areas" requirement through
    // to the end of the plan rather than treating review as generic.
    const reviewTopics = pickReviewTopics(covered, input.subjects, weeklyCapacityHours, HOURS_PER_TOPIC_REVIEW, weekNumber, true);
    weeks.push({
      weekNumber,
      startDate,
      endDate,
      isReviewWeek: true,
      subjectHours: subjectWeeklyHours,
      topics: [],
      reviewTopics,
    });
  }

  return { input, totalWeeks, buildWeeks, reviewWeeks, weeklyCapacityHours, subjectWeeklyHours, weeks, warnings, subjectTopicTotals };
}

/**
 * Rotates through already-covered topics, biased toward low-confidence
 * subjects, to fill a review-hours budget for one week.
 *
 * `weekSeed` (pass the week number) rotates *which* slice of the pool this
 * particular week draws from. Without it, a small slot count (e.g. the
 * single light-review slot most build weeks get) always lands on index 0
 * -- when `slots` is 1, `step` equals the whole pool length, so the loop
 * below only ever runs once at i=0 and "spaced review" silently becomes
 * "review the same first topic forever." Rotating the starting offset by
 * week keeps it actually spaced.
 */
function pickReviewTopics(
  covered: PlannedTopic[],
  subjects: PlannerSubjectInput[],
  hoursBudget: number,
  hoursPerTopic: number,
  weekSeed: number,
  weightByConfidence = false,
): PlannedTopic[] {
  if (covered.length === 0 || hoursBudget <= 0) return [];
  const slots = Math.max(1, Math.floor(hoursBudget / hoursPerTopic));

  const confidenceBySlug = new Map(subjects.map((s) => [s.slug, s.confidence]));
  const pool = weightByConfidence
    ? [...covered].sort((a, b) => {
        const wa = CONFIDENCE_WEIGHT[confidenceBySlug.get(a.subjectSlug) ?? 'medium'];
        const wb = CONFIDENCE_WEIGHT[confidenceBySlug.get(b.subjectSlug) ?? 'medium'];
        return wb - wa; // higher weight (lower confidence) first
      })
    : covered;

  const step = Math.max(1, Math.floor(pool.length / slots));
  // weekSeed alone, NOT multiplied by step: when slots is 1 (the common
  // case for the light in-build-week review), step equals pool.length,
  // and weekSeed * step is then always an exact multiple of pool.length
  // -- collapsing the modulo back to 0 on every week regardless of
  // weekSeed. Left un-multiplied, weekSeed % pool.length actually varies.
  const offset = weekSeed % pool.length;
  const picked: PlannedTopic[] = [];
  for (let i = 0; i < slots; i++) {
    picked.push(pool[(offset + i * step) % pool.length]);
  }
  return picked;
}

export interface SubjectPhase {
  subjectSlug: string;
  subjectName: string;
  /** The Blueprint's own TECHMED stage name (e.g. "03 — Reactions & Energy") -- never a phase label invented on top of it. */
  stageName: string;
}

export interface CurrentPhase {
  /** True during a full review week, where no subject has new material -- per-subject Blueprint stage names stop being meaningful context at that point, so the caller should show one plain "revision" indicator instead. */
  isReviewPhase: boolean;
  subjectPhases: SubjectPhase[];
}

/**
 * What stage of its own Blueprint each subject is currently in, as of a
 * given week -- the "current phase" the student sees is literally the
 * Blueprint's own stage names, not a separate label layered on top.
 *
 * `allSubjects` is optional and only used as a fallback: a subject whose
 * first topic hasn't been reached yet this early in the plan (e.g. its
 * weekly hours are small enough that week 1 doesn't unlock anything) has
 * no scheduled topic to read a stage name off of, but it still has a
 * stage -- its own first one. Without this fallback that subject would
 * just silently vanish from the phase list instead of correctly reading
 * "not started yet."
 */
export function getCurrentPhase(plan: PlannerPlan, week: WeekPlan, allSubjects?: Subject[]): CurrentPhase {
  if (week.isReviewWeek) return { isReviewPhase: true, subjectPhases: [] };

  const latestBySlug = new Map<string, SubjectPhase>();
  for (const w of plan.weeks) {
    for (const topic of w.topics) {
      latestBySlug.set(topic.subjectSlug, {
        subjectSlug: topic.subjectSlug,
        subjectName: topic.subjectName,
        stageName: topic.stageName,
      });
    }
    if (w.weekNumber === week.weekNumber) break;
  }

  if (allSubjects) {
    const subjectBySlug = new Map(allSubjects.map((s) => [s.slug, s]));
    for (const subjectInput of plan.input.subjects) {
      if (latestBySlug.has(subjectInput.slug)) continue;
      const subject = subjectBySlug.get(subjectInput.slug);
      const firstStage = subject ? [...subject.stages].sort((a, b) => a.order - b.order)[subjectInput.startingStageIndex] : undefined;
      if (subject && firstStage) {
        latestBySlug.set(subjectInput.slug, { subjectSlug: subject.slug, subjectName: subject.name, stageName: firstStage.name });
      }
    }
  }

  return { isReviewPhase: false, subjectPhases: [...latestBySlug.values()] };
}

/** topicKey -> the week number it was scheduled for first-pass coverage in a given plan. Deliberately excludes review topics, which rotate by design (see pickReviewTopics) and would just add noise to a "did this move" comparison. */
export type PlanSnapshot = Record<string, number>;

export function snapshotPlan(plan: PlannerPlan): PlanSnapshot {
  const snapshot: PlanSnapshot = {};
  for (const week of plan.weeks) {
    for (const topic of week.topics) {
      snapshot[topic.key] = week.weekNumber;
    }
  }
  return snapshot;
}

export interface SubjectPlanChange {
  subjectSlug: string;
  subjectName: string;
  status: 'on-track' | 'moved-later' | 'moved-earlier';
}

/**
 * Compares a saved snapshot against a freshly rebuilt plan and summarises,
 * per subject, whether its topics landed roughly where they were before or
 * shifted -- the data behind "Chemistry stayed on track, Physics moved
 * slightly later" after a replan. A half-week average shift is the
 * threshold for calling it a real move, so one topic sliding by a single
 * week among many doesn't read as "moved." Topics with no entry in the old
 * snapshot (e.g. a newly added subject) aren't counted as a move either
 * way -- there's nothing to compare them against.
 */
export function diffPlans(previous: PlanSnapshot, plan: PlannerPlan): SubjectPlanChange[] {
  const deltasBySlug = new Map<string, { subjectName: string; deltas: number[] }>();
  for (const week of plan.weeks) {
    for (const topic of week.topics) {
      const prevWeek = previous[topic.key];
      if (prevWeek === undefined) continue;
      if (!deltasBySlug.has(topic.subjectSlug)) {
        deltasBySlug.set(topic.subjectSlug, { subjectName: topic.subjectName, deltas: [] });
      }
      deltasBySlug.get(topic.subjectSlug)!.deltas.push(week.weekNumber - prevWeek);
    }
  }

  const changes: SubjectPlanChange[] = [];
  for (const [subjectSlug, { subjectName, deltas }] of deltasBySlug) {
    const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const status: SubjectPlanChange['status'] = avgDelta > 0.5 ? 'moved-later' : avgDelta < -0.5 ? 'moved-earlier' : 'on-track';
    changes.push({ subjectSlug, subjectName, status });
  }
  return changes;
}

export function getWeekForDate(plan: PlannerPlan, dateIso: string): WeekPlan | undefined {
  return plan.weeks.find((w) => dateIso >= w.startDate && dateIso <= w.endDate)
    ?? (dateIso > (plan.weeks.at(-1)?.endDate ?? '') ? plan.weeks.at(-1) : plan.weeks[0]);
}

export interface DayTask {
  subjectSlug: string;
  subjectName: string;
  topicTitle: string;
  topicSlug?: string;
  key: string;
  kind: 'first-pass' | 'review';
  /** The Blueprint stage this topic belongs to -- e.g. "This comes from your Chemistry Reactions & Energy stage." */
  stageName: string;
  /** Required topics (same subject) this one follows, where the Blueprint documents it -- the data behind "why this is next." Empty/absent for a topic that's a valid starting point. */
  prerequisites?: string[];
  /** Carried through so the UI can estimate hours spent via topicHours() -- e.g. a "time completed this week" figure that reflects the same yield-weighted cost the scheduler itself used, not a flat guess. */
  examWeight?: { min: number; max: number; tier: 'foundational' | 'low' | 'medium' | 'high' };
}

/** Distributes a week's topics + review topics across that week's available days, round-robin by subject so no single day is overloaded with one subject, then returns just the slice for one specific day. */
export function getTasksForDate(plan: PlannerPlan, dateIso: string): DayTask[] {
  const week = getWeekForDate(plan, dateIso);
  if (!week) return [];

  const weekday = new Date(dateIso + 'T00:00:00').getDay();
  if (!plan.input.availableDays.includes(weekday)) return [];

  const toTask = (t: PlannedTopic, kind: DayTask['kind']): DayTask => ({
    subjectSlug: t.subjectSlug,
    subjectName: t.subjectName,
    topicTitle: t.topicTitle,
    topicSlug: t.topicSlug,
    key: t.key,
    kind,
    stageName: t.stageName,
    prerequisites: t.prerequisites,
    examWeight: t.examWeight,
  });

  const allItems: DayTask[] = [
    ...week.topics.map((t) => toTask(t, 'first-pass')),
    ...week.reviewTopics.map((t) => toTask(t, 'review')),
  ];
  if (allItems.length === 0) return [];

  const availableDaysThisWeek = Array.from({ length: 7 }, (_, i) => addDays(week.startDate, i))
    .filter((d) => plan.input.availableDays.includes(new Date(d + 'T00:00:00').getDay()));
  const dayIndex = availableDaysThisWeek.indexOf(dateIso);
  if (dayIndex === -1) return [];

  return allItems.filter((_, i) => i % availableDaysThisWeek.length === dayIndex);
}
