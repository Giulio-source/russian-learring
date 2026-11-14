export type Dir = "ru-it" | "it-ru";
export type Screen = "load" | "menu" | "session" | "summary";
/** Which part of the deck the menu/session works on. */
export type Section = "words" | "verbs";
/**
 * What is being tested for a card: its meaning in a direction, or (verbs only)
 * its present-tense conjugation.
 */
export type Slot = Dir | "conj";

export interface Card {
  /** `ru + "␟" + it` — editing either text in the file creates a new card. */
  id: string;
  ru: string;
  it: string;
  pron: string;
}

export interface Example {
  ru: string;
  it: string;
}

/** A verb from the "Verbi" sheet. `ru` is the infinitive; id is `"verb␟" + ru + "␟" + it`. */
export interface Verb extends Card {
  /** Present tense: я, ты, он/она/оно, мы, вы, они (may contain empty strings). */
  forms: string[];
  examples: Example[];
  note: string;
}

/** Leitner box (1–5) and next due timestamp (ms). */
export interface BoxState {
  box: number;
  due: number;
}

/** Progress is tracked separately per card and per slot (direction / conjugation). */
export type Progress = Record<string, Partial<Record<Slot, BoxState>>>;

export interface Prefs {
  dir: Dir;
  section: Section;
}

/** One thing to review: a card (word or verb) tested in a given slot. */
export interface StudyItem {
  card: Card;
  slot: Slot;
}

export interface QueueItem extends StudyItem {
  /** True for a re-queued copy after a wrong answer; doesn't count toward the score. */
  retry: boolean;
}

export interface Session {
  section: Section;
  queue: QueueItem[];
  total: number;
  done: number;
  correct: number;
  missed: Map<string, Card>;
  current: QueueItem | null;
  answered: boolean;
}

export interface PromptText {
  q: string;
  qPron: string;
  a: string;
  aPron: string;
}

/** A rendered multiple-choice question. */
export interface Exercise {
  /** Small line above the prompt (e.g. the verb being conjugated); may be empty. */
  label: string;
  q: string;
  qPron: string;
  options: string[];
  correct: string;
  /** For conjugation exercises: index (0–5) of the person asked. */
  person?: number;
  /** Russian text the audio buttons read before answering ("" = nothing, it would give the answer away). */
  speakBefore: string;
  /** Russian text read after answering (the word, "pronoun + form", or the full example sentence). */
  speakAfter: string;
}
