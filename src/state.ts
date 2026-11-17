import { KEY_PREFS, KEY_PROGRESS, loadPrefs, loadProgress, save } from "./storage";
import type { Card, Prefs, Progress, Session, Verb } from "./types";

/**
 * Mutable app state shared by the UI modules. The deck (cards, verbs) is read
 * from the bundled Excel at startup and never saved; progress and prefs are
 * persisted through their setters.
 */
export const state = {
  cards: [] as Card[],
  verbs: [] as Verb[],
  progress: loadProgress(),
  prefs: loadPrefs(),
  session: null as Session | null,
};

export function setDeck(cards: Card[], verbs: Verb[]): void {
  state.cards = cards;
  state.verbs = verbs;
}

export function setProgress(progress: Progress): void {
  state.progress = progress;
  save(KEY_PROGRESS, progress);
}

export function setPrefs(prefs: Prefs): void {
  state.prefs = prefs;
  save(KEY_PREFS, prefs);
}
