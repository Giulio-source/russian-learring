import type { Card, Example, Exercise, Verb } from "./types";
import { normalizeStress, stripStress } from "./stress";
import { shuffle, type Rng } from "./util";

/** Persons of the present tense, in sheet column order (D–I). */
export const PERSONS_RU = ["Я", "Ты", "Он / Она", "Мы", "Вы", "Они"] as const;
export const PERSONS_IT = ["io", "tu", "lui / lei", "noi", "voi", "loro"] as const;
/** Pronoun read aloud before a form (one per person, no slashes). */
export const PERSONS_SPOKEN = ["я", "ты", "он", "мы", "вы", "они"] as const;

/** "pronoun + form" to read aloud, e.g. "мы хотим"; "" if the form is missing. */
export function spokenForm(verb: Verb, person: number): string {
  const f = verb.forms[person];
  return f ? PERSONS_SPOKEN[person] + " " + f : "";
}

/** Column index (0-based) of the first conjugated form and of the first example. */
const FORMS_COL = 3;
const EXAMPLES_COL = 9;

export function isVerb(card: Card): card is Verb {
  return Array.isArray((card as Partial<Verb>).forms);
}

/** Stress marks are ignored, so adding an accent keeps the saved progress. */
export function verbId(ru: string, it: string): string {
  return "verb␟" + stripStress(ru) + "␟" + it;
}

/**
 * Rows of the "Verbi" sheet → verbs. Columns: infinitive, translation,
 * pronunciation, 6 present-tense forms, then (Example, Translation) pairs and an
 * optional "Note" column (found by its header). Skips the header row, drops rows
 * missing infinitive or translation, dedupes.
 */
export function rowsToVerbs(rows: string[][]): Verb[] {
  const header = (rows[0] ?? []).map(h => h.trim().toLowerCase());
  const noteCol = header.findIndex((h, i) => i >= EXAMPLES_COL && h.startsWith("not"));

  const out: Verb[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(1)) {
    const cell = (i: number): string => (r[i] ?? "").trim();
    /** Russian cells: stress marks normalised to U+0301. */
    const ruCell = (i: number): string => normalizeStress(cell(i));
    const ru = ruCell(0);
    const it = cell(1);
    if (!ru || !it) continue;
    const id = verbId(ru, it);
    if (seen.has(id)) continue;
    seen.add(id);

    const forms = Array.from({ length: 6 }, (_, i) => ruCell(FORMS_COL + i));
    const examples: Example[] = [];
    const end = noteCol >= 0 ? noteCol : r.length;
    for (let i = EXAMPLES_COL; i < end; i += 2) {
      const ex = { ru: ruCell(i), it: cell(i + 1) };
      if (ex.ru) examples.push(ex);
    }
    out.push({ id, ru, it, pron: cell(2), forms, examples, note: noteCol >= 0 ? cell(noteCol) : "" });
  }
  return out;
}

const norm = (s: string): string => stripStress(s).toLowerCase().replace(/ё/g, "е");

/**
 * Finds a conjugated form of `verb` inside `sentence`. Returns the person index
 * and the sentence with that word blanked out, or null if no form occurs.
 */
export function blankForm(sentence: string, verb: Verb): { person: number; text: string } | null {
  for (const m of sentence.matchAll(/[\p{L}\u0301-]+/gu)) {
    const person = verb.forms.findIndex(f => f && norm(f) === norm(m[0]));
    if (person >= 0) {
      const start = m.index ?? 0;
      return { person, text: sentence.slice(0, start) + "___" + sentence.slice(start + m[0].length) };
    }
  }
  return null;
}

/** Correct form + up to 3 other distinct forms of the same verb, shuffled. */
function formOptions(verb: Verb, correct: string, rng: Rng): string[] {
  const others = [...new Set(verb.forms.filter(f => f && norm(f) !== norm(correct)))];
  return shuffle([correct, ...shuffle(others, rng).slice(0, 3)], rng);
}

/**
 * A conjugation question for `verb`. Half of the time (when one of its examples
 * contains a conjugated form) it is a fill-in-the-blank on the example sentence;
 * otherwise "pronoun + ___" for a random person. Options are always forms of the
 * same verb, so the choice hinges on the ending, not on recognising the verb.
 */
export function conjExercise(verb: Verb, rng: Rng = Math.random): Exercise | null {
  const label = verb.ru + " · " + verb.it;
  const clozes = verb.examples
    .map(ex => ({ ex, b: blankForm(ex.ru, verb) }))
    .filter((c): c is { ex: Example; b: { person: number; text: string } } => !!c.b);
  if (clozes.length && rng() < 0.5) {
    const c = clozes[Math.floor(rng() * clozes.length)]!;
    const correct = verb.forms[c.b.person]!;
    return {
      label, q: c.b.text, qPron: c.ex.it, options: formOptions(verb, correct, rng), correct, person: c.b.person,
      speakBefore: "", speakAfter: c.ex.ru,
    };
  }
  const persons = verb.forms.map((f, i) => (f ? i : -1)).filter(i => i >= 0);
  if (!persons.length) return null;
  const person = persons[Math.floor(rng() * persons.length)]!;
  const correct = verb.forms[person]!;
  return {
    label,
    q: PERSONS_RU[person] + " ___",
    qPron: PERSONS_IT[person] ?? "",
    options: formOptions(verb, correct, rng),
    correct,
    person,
    speakBefore: "",
    speakAfter: spokenForm(verb, person),
  };
}
