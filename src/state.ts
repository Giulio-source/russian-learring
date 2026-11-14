import { KEY_CARDS, KEY_PREFS, KEY_PROGRESS, KEY_VERBS, loadCards, loadPrefs, loadProgress, loadVerbs, save } from "./storage";
import type { Card, Prefs, Progress, Session, Verb } from "./types";

/** Mutable app state shared by the UI modules. Persist through the setters. */
export const state = {
  cards: loadCards(),
  verbs: loadVerbs(),
  progress: loadProgress(),
  prefs: loadPrefs(),
  session: null as Session | null,
};

export function setCards(cards: Card[]): void {
  state.cards = cards;
  save(KEY_CARDS, cards);
}

export function setVerbs(verbs: Verb[]): void {
  state.verbs = verbs;
  save(KEY_VERBS, verbs);
}

export function setProgress(progress: Progress): void {
  state.progress = progress;
  save(KEY_PROGRESS, progress);
}

export function setPrefs(prefs: Prefs): void {
  state.prefs = prefs;
  save(KEY_PREFS, prefs);
}
