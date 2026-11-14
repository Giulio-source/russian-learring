import { isDue, isNew, NEW_PER_SESSION } from "./srs";
import type { Card, Dir, Exercise, Progress, PromptText, Section, Session, StudyItem, Verb } from "./types";
import { shuffle, type Rng } from "./util";
import { conjExercise, isVerb } from "./verbs";

/** Positions after the current card at which a wrong answer is re-queued. */
export const RETRY_OFFSET = 3;

/**
 * Everything reviewable in a section. Words: one item per card in the chosen
 * direction. Verbs: per verb, its meaning (in the chosen direction) followed by
 * its conjugation (if the sheet has any forms for it), in sheet order.
 */
export function studyItems(section: Section, cards: Card[], verbs: Verb[], dir: Dir): StudyItem[] {
  if (section === "words") return cards.map(card => ({ card, slot: dir }));
  return verbs.flatMap(v => {
    const items: StudyItem[] = [{ card: v, slot: dir }];
    if (v.forms.some(f => f)) items.push({ card: v, slot: "conj" });
    return items;
  });
}

/**
 * Normal session = all due + up to NEW_PER_SESSION new items; `all` = every item.
 * New items are picked at random, or in list order with `orderedNew` (verbs are
 * introduced in the order of the sheet, meaning before conjugation).
 */
export function buildSessionList(
  items: StudyItem[],
  progress: Progress,
  all: boolean,
  now: number = Date.now(),
  rng: Rng = Math.random,
  orderedNew = false,
): StudyItem[] {
  if (all) return shuffle(items.slice(), rng);
  const due = items.filter(i => isDue(progress, i.card, i.slot, now));
  const newOnes = items.filter(i => isNew(progress, i.card, i.slot));
  const fresh = (orderedNew ? newOnes : shuffle(newOnes, rng)).slice(0, NEW_PER_SESSION);
  return shuffle(due.concat(fresh), rng);
}

export function createSession(list: StudyItem[], section: Section): Session {
  return {
    section,
    queue: list.map(i => ({ ...i, retry: false })),
    total: list.length,
    done: 0, correct: 0,
    missed: new Map(),
    current: null, answered: false,
  };
}

/** Pops the next item; returns false when the queue is empty. */
export function advance(s: Session): boolean {
  const item = s.queue.shift();
  s.current = item ?? null;
  s.answered = false;
  return !!item;
}

/**
 * Records an answer for the current item. Only first attempts count toward the
 * score; wrong items are re-queued a few positions later until answered correctly.
 */
export function applyAnswer(s: Session, correct: boolean): void {
  const item = s.current;
  if (!item) return;
  s.answered = true;
  if (correct) {
    if (!item.retry) s.correct++;
    s.done++;
  } else {
    s.missed.set(item.card.id, item.card);
    s.queue.splice(Math.min(RETRY_OFFSET, s.queue.length), 0, { card: item.card, slot: item.slot, retry: true });
  }
}

export function promptOf(card: Card, dir: Dir): PromptText {
  return dir === "ru-it"
    ? { q: card.ru, qPron: card.pron, a: card.it, aPron: "" }
    : { q: card.it, qPron: "", a: card.ru, aPron: card.pron };
}

export function answerText(card: Card, dir: Dir): string {
  return dir === "ru-it" ? card.it : card.ru;
}

/** Correct answer + up to 3 distinct distractors from other cards, shuffled. */
export function quizOptions(card: Card, cards: Card[], dir: Dir, rng: Rng = Math.random): { options: string[]; correct: string } {
  const correct = answerText(card, dir);
  const used = new Set([correct]);
  const distractors: string[] = [];
  for (const o of shuffle(cards.slice(), rng)) {
    const t = answerText(o, dir);
    if (used.has(t)) continue;
    used.add(t);
    distractors.push(t);
    if (distractors.length === 3) break;
  }
  return { options: shuffle([correct, ...distractors], rng), correct };
}

/** Builds the multiple-choice question for an item; `pool` supplies meaning distractors. */
export function exerciseFor(item: StudyItem, pool: Card[], rng: Rng = Math.random): Exercise {
  if (item.slot === "conj" && isVerb(item.card)) {
    const ex = conjExercise(item.card, rng);
    if (ex) return ex;
  }
  const dir: Dir = item.slot === "conj" ? "ru-it" : item.slot;
  const p = promptOf(item.card, dir);
  const { options, correct } = quizOptions(item.card, pool, dir, rng);
  // Russian → Italian: the prompt is Russian, so it can be heard right away.
  // Italian → Russian: hearing it before answering would give the answer away.
  const speakBefore = dir === "ru-it" ? item.card.ru : "";
  return { label: "", q: p.q, qPron: p.qPron, options, correct, speakBefore, speakAfter: item.card.ru };
}
