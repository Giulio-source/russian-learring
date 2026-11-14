import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isVerbSheet, sheetsToDeck } from "../src/deck";
import { exerciseFor, studyItems } from "../src/session";
import type { Verb } from "../src/types";
import { blankForm, conjExercise, rowsToVerbs, verbId } from "../src/verbs";
import { colIndex, decodeXml, parseSharedStrings, parseSheetXml, readXlsx } from "../src/xlsx";

const header = ["Infinito", "Traduzione", "Pronuncia", "Я", "Ты", "Он", "Мы", "Вы", "Они",
  "Esempio 1", "Traduzione 1", "Esempio 2", "Traduzione 2", "Note"];
const row = ["Хотеть", "Volere", "Ha-tiét'", "хочу", "хочешь", "хочет", "хотим", "хотите", "хотят",
  "Я хочу чай.", "Voglio un tè.", "Скажи!", "Dimmi!", "Avere un desiderio"];
const verb: Verb = rowsToVerbs([header, row])[0]!;

/** Deterministic RNG cycling through the given values. */
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]!; };

describe("rowsToVerbs", () => {
  it("reads forms, example pairs and the note column", () => {
    expect(verb).toEqual({
      id: verbId("Хотеть", "Volere"), ru: "Хотеть", it: "Volere", pron: "Ha-tiét'",
      forms: ["хочу", "хочешь", "хочет", "хотим", "хотите", "хотят"],
      examples: [{ ru: "Я хочу чай.", it: "Voglio un tè." }, { ru: "Скажи!", it: "Dimmi!" }],
      note: "Avere un desiderio",
    });
  });
  it("drops incomplete rows and tolerates missing trailing cells", () => {
    const v = rowsToVerbs([header, ["", "x"], ["Мочь", "Potere", "", "могу"]]);
    expect(v).toHaveLength(1);
    expect(v[0]!.forms).toEqual(["могу", "", "", "", "", ""]);
    expect(v[0]!.examples).toEqual([]);
    expect(v[0]!.note).toBe("");
  });
});

describe("conjugation exercises", () => {
  it("blanks the conjugated form inside an example", () => {
    expect(blankForm("Я хочу чай.", verb)).toEqual({ person: 0, text: "Я ___ чай." });
    expect(blankForm("Скажи!", verb)).toBeNull();
  });
  it("builds a sentence cloze with options from the same verb", () => {
    const ex = conjExercise(verb, seq(0.1, 0, 0.5, 0.3, 0.7, 0.2))!;
    expect(ex.q).toBe("Я ___ чай.");
    expect(ex.qPron).toBe("Voglio un tè.");
    expect(ex.correct).toBe("хочу");
    expect(ex.person).toBe(0);
    expect(ex.speakBefore).toBe("");
    expect(ex.speakAfter).toBe("Я хочу чай.");
    expect(ex.options).toHaveLength(4);
    expect(new Set(ex.options).size).toBe(4);
    for (const o of ex.options) expect(verb.forms).toContain(o);
  });
  it("builds a pronoun prompt otherwise", () => {
    const ex = conjExercise(verb, seq(0.9, 0.55))!; // no cloze, person index 3
    expect(ex.q).toBe("Мы ___");
    expect(ex.correct).toBe("хотим");
    expect(ex.options).toContain("хотим");
    expect([ex.speakBefore, ex.speakAfter]).toEqual(["", "мы хотим"]);
  });
  it("only creates a conjugation item for verbs with forms", () => {
    const noForms: Verb = { ...verb, id: "x", forms: ["", "", "", "", "", ""] };
    expect(studyItems("verbs", [], [verb, noForms], "it-ru").map(i => [i.card.id, i.slot]))
      .toEqual([[verb.id, "it-ru"], [verb.id, "conj"], ["x", "it-ru"]]);
  });
  it("exerciseFor dispatches meaning vs conjugation", () => {
    const ruIt = exerciseFor({ card: verb, slot: "ru-it" }, [verb]);
    expect([ruIt.correct, ruIt.speakBefore, ruIt.speakAfter]).toEqual(["Volere", "Хотеть", "Хотеть"]);
    const itRu = exerciseFor({ card: verb, slot: "it-ru" }, [verb]);
    expect([itRu.correct, itRu.speakBefore, itRu.speakAfter]).toEqual(["Хотеть", "", "Хотеть"]);
    expect(verb.forms).toContain(exerciseFor({ card: verb, slot: "conj" }, [verb]).correct);
  });
});

describe("xlsx parsing", () => {
  it("decodes entities and column refs", () => {
    expect(decodeXml("a &amp; b &lt;c&gt; &#1071; _x000D_")).toBe("a & b <c> Я \r");
    expect([colIndex("A1"), colIndex("N5"), colIndex("AA3")]).toEqual([0, 13, 26]);
  });
  it("parses shared strings (incl. rich text) and sheet cells with gaps", () => {
    const shared = parseSharedStrings('<sst><si><t>Привет</t></si><si><r><t>Ci</t></r><r><t xml:space="preserve">ao</t></r></si></sst>');
    expect(shared).toEqual(["Привет", "Ciao"]);
    const xml = '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>x</t></is></c></row>'
      + '<row r="2"><c r="A2" s="1"/></row><row r="3"><c r="B3"><v>42</v></c></row></sheetData>';
    expect(parseSheetXml(xml, shared)).toEqual([["Привет", "", "x"], ["", "42"]]);
  });
  it("reads the real workbook into vocabulary and verbs", async () => {
    const buf = readFileSync(new URL("./fixtures/vocabulary.xlsx", import.meta.url));
    const sheets = await readXlsx(buf.slice().buffer as ArrayBuffer);
    expect(sheets.map(s => s.name)).toEqual(["Frasi e vocaboli", "Verbi"]);
    expect(sheets.map(isVerbSheet)).toEqual([false, true]);
    const { cards, verbs } = sheetsToDeck(sheets);
    expect(cards.length).toBeGreaterThan(50);
    expect(cards[0]).toMatchObject({ ru: "До завтра", it: "Ci vediamo domani" });
    const delat = verbs.find(v => v.ru === "Делать")!;
    expect(delat.forms).toEqual(["делаю", "делаешь", "делает", "делаем", "делаете", "делают"]);
    expect(delat.examples).toHaveLength(2);
    expect(delat.note).toBe("Compiere un'azione");
  });
});
