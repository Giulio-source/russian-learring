import type { Prefs, Progress } from "./types";

export const KEY_PROGRESS = "ruapp.progress";
export const KEY_PREFS = "ruapp.prefs";
/** Keys of older versions, which stored the loaded deck; now the deck comes from the bundled Excel. */
const LEGACY_KEYS = ["ruapp.cards", "ruapp.verbs"];

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

/** Drops the deck copies saved by older versions (progress and prefs are kept). */
export function removeLegacyKeys(): void {
  try {
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
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
    stress: p.stress !== false,
  };
}
