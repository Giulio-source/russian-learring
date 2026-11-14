import type { BoxState, Progress, Slot, StudyItem } from "./types";

/** Anything with an id: a Card or Verb. */
type HasId = { id: string };

export const DAY = 86_400_000;
export const NEW_PER_SESSION = 10;
/** Days until next review, indexed by box (1..5). Every box waits at least until tomorrow. */
export const INTERVALS = [0, 1, 3, 7, 14, 30] as const;
export const MAX_BOX = 5;
/** Box 3 = answered correctly on three separate review days. */
export const LEARNED_BOX = 3;

export function startOfToday(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getState(progress: Progress, card: HasId, dir: Slot): BoxState | undefined {
  return progress[card.id]?.[dir];
}

export function isDue(progress: Progress, card: HasId, dir: Slot, now: number = Date.now()): boolean {
  const s = getState(progress, card, dir);
  return !!s && s.due <= now;
}

export function isNew(progress: Progress, card: HasId, dir: Slot): boolean {
  return !getState(progress, card, dir);
}

export function isLearned(progress: Progress, card: HasId, dir: Slot): boolean {
  const s = getState(progress, card, dir);
  return !!s && s.box >= LEARNED_BOX;
}

/**
 * Correct → up one box (max 5); wrong → back to box 1. The next review is
 * INTERVALS[box] days from the start of today, so a card is never due again the
 * same day. A correct answer on a card that isn't due yet (extra practice with
 * "Ripassa tutto") leaves it unchanged, so cramming can't skip boxes; a wrong
 * answer always demotes. Returns a new Progress object.
 */
export function grade(
  progress: Progress,
  card: HasId,
  dir: Slot,
  correct: boolean,
  now: number = Date.now(),
): Progress {
  const s = getState(progress, card, dir);
  if (correct && s && s.due > now) return progress;
  const box = correct ? Math.min(MAX_BOX, (s?.box ?? 0) + 1) : 1;
  const due = startOfToday(now) + (INTERVALS[box] ?? 1) * DAY;
  return { ...progress, [card.id]: { ...progress[card.id], [dir]: { box, due } } };
}

export interface MenuStats {
  due: number;
  fresh: number;
  learned: number;
  total: number;
  /** New cards the next normal session will include (at most NEW_PER_SESSION). */
  newInSession: number;
  /** Size of the next normal session: all due + newInSession. */
  inSession: number;
}

export function computeStats(items: StudyItem[], progress: Progress, now: number = Date.now()): MenuStats {
  const due = items.filter(i => isDue(progress, i.card, i.slot, now)).length;
  const fresh = items.filter(i => isNew(progress, i.card, i.slot)).length;
  const learned = items.filter(i => isLearned(progress, i.card, i.slot)).length;
  const newInSession = Math.min(NEW_PER_SESSION, fresh);
  return { due, fresh, learned, total: items.length, newInSession, inSession: due + newInSession };
}
