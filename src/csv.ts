import type { Card } from "./types";

/** RFC-4180-ish parser: quotes, `""` escapes, CRLF/CR/LF, BOM stripping. */
export function parseCSV(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Skips the header row, drops rows missing Russian or Italian, dedupes by id. */
export function rowsToCards(rows: string[][]): Card[] {
  const out: Card[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(1)) {
    const ru = (r[0] ?? "").trim();
    const it = (r[1] ?? "").trim();
    const pron = (r[2] ?? "").trim();
    if (!ru || !it) continue;
    const id = ru + "␟" + it;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, ru, it, pron });
  }
  return out;
}
