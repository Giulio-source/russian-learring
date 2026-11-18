/**
 * Stress (accent) marks in Russian text. In the Excel a stressed vowel carries
 * a combining acute accent (U+0301), as in textbooks: говорю́, пи́шешь.
 * When typing by hand, an apostrophe right after a Cyrillic vowel (говорю')
 * is accepted too, as are the Latin look-alikes é/á/ó copied from PDFs
 * (дéлать); `normalizeStress` turns them all into U+0301.
 *
 * Accents are for display only: ids, comparisons and speech use `stripStress`,
 * so adding or fixing an accent in the file never orphans saved progress.
 */

export const ACUTE = "́";
const VOWELS = "аеёиоуыэюяАЕЁИОУЫЭЮЯ";
const LOOKALIKE: Record<string, string> = { "é": "е", "É": "Е", "á": "а", "Á": "А", "ó": "о", "Ó": "О" };

/** Canonical form: every stress mark written as vowel + U+0301. */
export function normalizeStress(s: string): string {
  return s
    // Latin é/á/ó next to a Cyrillic letter → Cyrillic vowel + accent.
    .replace(/[éÉáÁóÓ](?=\p{Script=Cyrillic})|(?<=\p{Script=Cyrillic})[éÉáÁóÓ]/gu, m => LOOKALIKE[m]! + ACUTE)
    // Apostrophe-like mark after a Cyrillic vowel → accent.
    .replace(new RegExp(`([${VOWELS}])['’´ˊ]`, "g"), "$1" + ACUTE);
}

/** The text without stress marks (for ids, comparisons and speech). */
export function stripStress(s: string): string {
  return s.replace(/́/g, "");
}

/** Splits text into plain runs and stressed vowels (each including its accent), for rendering. */
export function stressParts(s: string): { text: string; stressed: boolean }[] {
  const out: { text: string; stressed: boolean }[] = [];
  let last = 0;
  for (const m of s.matchAll(/[^́]́/gu)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: s.slice(last, i), stressed: false });
    out.push({ text: m[0], stressed: true });
    last = i + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), stressed: false });
  return out;
}
