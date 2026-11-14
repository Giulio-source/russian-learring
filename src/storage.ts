import type { Card, Prefs, Progress, Verb } from "./types";

export const KEY_CARDS = "ruapp.cards";
export const KEY_PROGRESS = "ruapp.progress";
export const KEY_PREFS = "ruapp.prefs";
export const KEY_VERBS = "ruapp.verbs";

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore (private mode, quota, …) */
  }
}

export function loadCards(): Card[] {
  const v = load<unknown>(KEY_CARDS, []);
  return Array.isArray(v) ? (v as Card[]) : [];
}

export function loadVerbs(): Verb[] {
  const v = load<unknown>(KEY_VERBS, []);
  return Array.isArray(v) ? (v as Verb[]).filter(x => x && Array.isArray(x.forms)) : [];
}

export function loadProgress(): Progress {
  const v = load<unknown>(KEY_PROGRESS, {});
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Progress) : {};
}

export function loadPrefs(): Prefs {
  const p = load<Partial<Prefs> | null>(KEY_PREFS, {}) ?? {};
  return {
    dir: p.dir === "it-ru" ? "it-ru" : "ru-it",
    section: p.section === "verbs" ? "verbs" : "words",
  };
}
