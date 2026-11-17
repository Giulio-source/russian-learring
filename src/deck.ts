import { rowsToCards } from "./words";
import type { Card, Verb } from "./types";
import { rowsToVerbs } from "./verbs";
import type { Sheet } from "./xlsx";

/** A verb sheet is named like "Verbi"/"Verbs", or has the 6 conjugation columns (≥ 9 columns). */
export function isVerbSheet(sheet: Sheet): boolean {
  if (/verb/i.test(sheet.name)) return true;
  const header = sheet.rows[0] ?? [];
  return header.filter(h => h.trim()).length >= 9;
}

/** Splits workbook sheets into vocabulary cards (all non-verb sheets, merged) and verbs. */
export function sheetsToDeck(sheets: Sheet[]): { cards: Card[]; verbs: Verb[] } {
  const cards: Card[] = [];
  const verbs: Verb[] = [];
  const seenCards = new Set<string>();
  const seenVerbs = new Set<string>();
  for (const sheet of sheets) {
    if (isVerbSheet(sheet)) {
      for (const v of rowsToVerbs(sheet.rows)) if (!seenVerbs.has(v.id)) { seenVerbs.add(v.id); verbs.push(v); }
    } else {
      for (const c of rowsToCards(sheet.rows)) if (!seenCards.has(c.id)) { seenCards.add(c.id); cards.push(c); }
    }
  }
  return { cards, verbs };
}
