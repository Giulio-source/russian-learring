/**
 * Minimal, dependency-free .xlsx reader: unzips the workbook with the browser's
 * DecompressionStream and extracts every sheet as a grid of strings (cell text,
 * shared strings resolved). Formatting, formulas and dates are ignored.
 */

export interface Sheet {
  name: string;
  rows: string[][];
}

// ---------- zip ----------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Reads every file of a zip archive (stored or deflated entries; no zip64). */
export async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Non è un file .xlsx valido");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const files = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("Archivio .xlsx danneggiato");
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + size);
    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, await inflateRaw(raw));
    // other compression methods: skip the entry
  }
  return files;
}

// ---------- XML helpers ----------

export function decodeXml(s: string): string {
  return s
    .replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-fA-F]+);/g, (_, e: string) => {
      switch (e) {
        case "lt": return "<";
        case "gt": return ">";
        case "quot": return '"';
        case "apos": return "'";
        case "amp": return "&";
        default:
          return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      }
    })
    // OOXML escapes control characters as _xHHHH_
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
  return m ? decodeXml(m[1]!) : undefined;
}

/** Concatenated text of all `<t>` runs, ignoring phonetic hints (`<rPh>`). */
function textRuns(xml: string): string {
  let out = "";
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  for (const m of clean.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)) out += decodeXml(m[1] ?? "");
  return out;
}

export function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)].map(m => textRuns(m[1] ?? ""));
}

/** "A" → 0, "N" → 13, "AA" → 26. */
export function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[^A-Z]/gi, "").toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Sheet XML → rows of cell text. Fully empty rows are dropped; gaps inside a row become "". */
export function parseSheetXml(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row: string[] = [];
    let next = 0;
    for (const cm of (rm[1] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1] ?? "";
      const body = cm[2] ?? "";
      const ref = attr(attrs, "r");
      const col = ref ? colIndex(ref) : next;
      next = col + 1;
      const type = attr(attrs, "t");
      const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let text = "";
      if (type === "s") text = shared[Number(v)] ?? "";
      else if (type === "inlineStr") text = textRuns(body);
      else if (type === "b") text = v === "1" ? "TRUE" : v === undefined ? "" : "FALSE";
      else if (v !== undefined) text = decodeXml(v);
      while (row.length < col) row.push("");
      row[col] = text;
    }
    if (row.some(c => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

/** Resolves a relationship target (relative to `xl/` or absolute) to a zip path. */
function resolveTarget(target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = ("xl/" + target).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "..") out.pop();
    else if (part !== "." && part !== "") out.push(part);
  }
  return out.join("/");
}

/** Reads all sheets of an .xlsx file, in workbook order. */
export async function readXlsx(buf: ArrayBuffer): Promise<Sheet[]> {
  const files = await unzip(buf);
  const dec = new TextDecoder();
  const text = (path: string): string => {
    const f = files.get(path);
    return f ? dec.decode(f) : "";
  };
  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new Error("Non è un file .xlsx valido");
  const shared = parseSharedStrings(text("xl/sharedStrings.xml"));

  const rels = new Map<string, string>();
  for (const m of text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const id = attr(m[1] ?? "", "Id");
    const target = attr(m[1] ?? "", "Target");
    if (id && target) rels.set(id, resolveTarget(target));
  }

  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const attrs = m[1] ?? "";
    const name = attr(attrs, "name") ?? "";
    const rid = attr(attrs, "r:id");
    const path = rid ? rels.get(rid) : undefined;
    if (!path || !files.has(path)) continue;
    sheets.push({ name, rows: parseSheetXml(text(path), shared) });
  }
  return sheets;
}
