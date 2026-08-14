// Study Planner persistence -- localStorage only, no account/backend for
// V1 (the site is fully static; see plannerEngine.ts for why). Deliberately
// thin: this file only knows how to read/write JSON, not how a plan is
// built or interpreted -- that's plannerEngine.ts's job.
import { toLocalIso, type PlannerInput, type PlannerPlan, type PlanSnapshot, type WeekPlan } from './plannerEngine';

const PLAN_KEY = 'techmed-study-planner:plan';
const COMPLETED_KEY = 'techmed-study-planner:completed';
// One short optional note per topic key -- "what's one thing you'd say
// about this?", offered only after a topic is checked off. Never
// required, never analyzed; a student who skips it loses nothing.
const NOTES_KEY = 'techmed-study-planner:notes';
// Only ever written right before a replan (see savePlanSnapshot's call
// site) -- a student who builds one plan and never returns never gets
// this key at all, so "what changed" costs the one-and-done majority
// nothing while still being there for students who come back.
const SNAPSHOT_KEY = 'techmed-study-planner:previous-snapshot';
// buildPlan() recomputes the entire schedule from scratch on every call,
// including a plain page reload -- removing a newly-completed topic from
// the queue shifts every later topic one slot earlier, which can pull a
// *different* topic into today's already-shown slot. This holds the
// current week's assignment steady across passive reloads (see
// reconcileCurrentWeek in study-planner.astro); a deliberate action
// (Adjust, Start Over, a fresh build) intentionally overwrites it with a
// new baseline instead of reconciling against the old one.
const CURRENT_WEEK_KEY = 'techmed-study-planner:current-week';

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function saveInput(input: PlannerInput): void {
  if (!hasStorage()) return;
  localStorage.setItem(PLAN_KEY, JSON.stringify(input));
}

export function loadInput(): PlannerInput | null {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(PLAN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlannerInput;
  } catch {
    return null;
  }
}

export function clearInput(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(PLAN_KEY);
}

export function loadCompletedKeys(): Set<string> {
  if (!hasStorage()) return new Set();
  const raw = localStorage.getItem(COMPLETED_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveCompletedKeys(keys: Set<string>): void {
  if (!hasStorage()) return;
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...keys]));
}

export function markTopicComplete(key: string, done: boolean): Set<string> {
  const keys = loadCompletedKeys();
  if (done) keys.add(key);
  else keys.delete(key);
  saveCompletedKeys(keys);
  return keys;
}

export function clearProgress(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(COMPLETED_KEY);
}

export function todayIso(): string {
  return toLocalIso(new Date());
}

export function savePlanSnapshot(snapshot: PlanSnapshot): void {
  if (!hasStorage()) return;
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function loadPlanSnapshot(): PlanSnapshot | null {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlanSnapshot;
  } catch {
    return null;
  }
}

export function clearPlanSnapshot(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(SNAPSHOT_KEY);
}

export function loadNotes(): Record<string, string> {
  if (!hasStorage()) return {};
  const raw = localStorage.getItem(NOTES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveNote(key: string, note: string): void {
  if (!hasStorage()) return;
  const notes = loadNotes();
  const trimmed = note.trim();
  if (trimmed) notes[key] = trimmed;
  else delete notes[key];
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function clearNotes(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(NOTES_KEY);
}

export function saveCurrentWeekSnapshot(week: WeekPlan): void {
  if (!hasStorage()) return;
  localStorage.setItem(CURRENT_WEEK_KEY, JSON.stringify(week));
}

export function loadCurrentWeekSnapshot(): WeekPlan | null {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(CURRENT_WEEK_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WeekPlan;
  } catch {
    return null;
  }
}

export function clearCurrentWeekSnapshot(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(CURRENT_WEEK_KEY);
}
