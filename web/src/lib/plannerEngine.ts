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

function topicHours(topic: Pick<PlannedTopic, 'examWeight'>): number {
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

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
  const subjectWeeklyHours = distributeSubjectAttention(input.subjects, weeklyCapacityHours);
  const completed = alreadyCompletedKeys ?? new Set<string>();

  const warnings: SubjectCoverageWarning[] = [];

  // Per-subject queue of not-yet-completed topics, in Blueprint order.
  const queues = new Map<string, PlannedTopic[]>();
  const subjectBySlug = new Map(allSubjects.map((s) => [s.slug, s]));
  for (const subjectInput of input.subjects) {
    const subject = subjectBySlug.get(subjectInput.slug);
    if (!subject) continue;
    const all = flattenSubjectTopics(subject, subjectInput.startingStageIndex);
    const remaining = all.filter((t) => !completed.has(t.key));
    queues.set(subjectInput.slug, remaining);

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
    const reviewTopics = pickReviewTopics(covered, input.subjects, weeklyCapacityHours * 0.15, HOURS_PER_TOPIC_REVIEW, w);

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

  return { input, totalWeeks, buildWeeks, reviewWeeks, weeklyCapacityHours, subjectWeeklyHours, weeks, warnings };
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
}

/** Distributes a week's topics + review topics across that week's available days, round-robin by subject so no single day is overloaded with one subject, then returns just the slice for one specific day. */
export function getTasksForDate(plan: PlannerPlan, dateIso: string): DayTask[] {
  const week = getWeekForDate(plan, dateIso);
  if (!week) return [];

  const weekday = new Date(dateIso + 'T00:00:00').getDay();
  if (!plan.input.availableDays.includes(weekday)) return [];

  const allItems: DayTask[] = [
    ...week.topics.map((t) => ({ subjectSlug: t.subjectSlug, subjectName: t.subjectName, topicTitle: t.topicTitle, topicSlug: t.topicSlug, key: t.key, kind: 'first-pass' as const })),
    ...week.reviewTopics.map((t) => ({ subjectSlug: t.subjectSlug, subjectName: t.subjectName, topicTitle: t.topicTitle, topicSlug: t.topicSlug, key: t.key, kind: 'review' as const })),
  ];
  if (allItems.length === 0) return [];

  const availableDaysThisWeek = Array.from({ length: 7 }, (_, i) => addDays(week.startDate, i))
    .filter((d) => plan.input.availableDays.includes(new Date(d + 'T00:00:00').getDay()));
  const dayIndex = availableDaysThisWeek.indexOf(dateIso);
  if (dayIndex === -1) return [];

  return allItems.filter((_, i) => i % availableDaysThisWeek.length === dayIndex);
}
