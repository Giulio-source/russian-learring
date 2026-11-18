import { normalizeStress, stripStress } from "./stress";
import type { Card } from "./types";

/**
 * Rows of a vocabulary sheet (Cyrillic, Italian, pronunciation) → cards.
 * Skips the header row, drops rows missing Russian or Italian, dedupes by id.
 * The id ignores stress marks, so adding an accent keeps the saved progress.
 */
export function rowsToCards(rows: string[][]): Card[] {
  const out: Card[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(1)) {
    const ru = normalizeStress((r[0] ?? "").trim());
    const it = (r[1] ?? "").trim();
    const pron = (r[2] ?? "").trim();
    if (!ru || !it) continue;
    const id = stripStress(ru) + "␟" + it;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, ru, it, pron });
  }
  return out;
}
