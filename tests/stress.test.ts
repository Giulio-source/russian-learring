import { describe, expect, it } from "vitest";
import { normalizeStress, stressParts, stripStress } from "../src/stress";
import { rowsToCards } from "../src/words";
import { blankForm, rowsToVerbs } from "../src/verbs";
import { quizOptions } from "../src/session";

const A = "́";

describe("stress marks", () => {
  it("normalises apostrophes and Latin look-alikes to U+0301", () => {
    expect(normalizeStress("говорю'")).toBe("говорю" + A);
    expect(normalizeStress("хо’чет")).toBe("хо" + A + "чет");
    expect(normalizeStress("дéлать")).toBe("де" + A + "лать");
    expect(normalizeStress("éду")).toBe("е" + A + "ду");
    // Not touched: apostrophes after consonants, Latin text.
    expect(normalizeStress("Znat'")).toBe("Znat'");
    expect(normalizeStress("Che cos'è?")).toBe("Che cos'è?");
  });

  it("strips and splits stressed vowels", () => {
    const s = "Я говорю" + A + " по-ру" + A + "сски";
    expect(stripStress(s)).toBe("Я говорю по-русски");
    expect(stressParts(s)).toEqual([
      { text: "Я говор", stressed: false },
      { text: "ю" + A, stressed: true },
      { text: " по-р", stressed: false },
      { text: "у" + A, stressed: true },
      { text: "сски", stressed: false },
    ]);
    expect(stressParts("Да")).toEqual([{ text: "Да", stressed: false }]);
  });

  it("ignores accents in ids, so progress survives adding them", () => {
    const [plain] = rowsToCards([["h"], ["Привет", "Ciao"]]);
    const [marked] = rowsToCards([["h"], ["Приве'т", "Ciao"]]);
    expect(marked!.id).toBe(plain!.id);
    expect(marked!.ru).toBe("Приве" + A + "т");
    const header = ["Inf", "Trad", "Pron", "Я", "Ты", "Он", "Мы", "Вы", "Они", "Esempio 1", "Traduzione 1", "Note"];
    const [v1] = rowsToVerbs([header, ["Писать", "Scrivere"]]);
    const [v2] = rowsToVerbs([header, ["Писа́ть", "Scrivere"]]);
    expect(v2!.id).toBe(v1!.id);
  });

  it("finds accented forms in example sentences", () => {
    const header = ["Inf", "Trad", "Pron", "Я", "Ты", "Он", "Мы", "Вы", "Они", "Esempio 1", "Traduzione 1", "Note"];
    const [v] = rowsToVerbs([header, ["Писать", "Scrivere", "", "пишу'", "пи'шешь", "пи'шет", "пи'шем", "пи'шете", "пи'шут", "Вы пи'шете письмо'.", "Scrivete."]]);
    expect(blankForm(v!.examples[0]!.ru, v!)).toEqual({ person: 4, text: "Вы ___ письмо" + A + "." });
    // Plain sentence, accented forms.
    expect(blankForm("Ты пишешь медленно.", v!)?.person).toBe(1);
  });

  it("never offers the same word twice with and without accent", () => {
    const cards = rowsToCards([["h"], ["Да", "Sì"], ["Да'", "Sì "], ["Нет", "No"]]);
    const { options } = quizOptions(cards[0]!, cards, "it-ru", () => 0.3);
    expect(new Set(options.map(stripStress)).size).toBe(options.length);
  });
});
