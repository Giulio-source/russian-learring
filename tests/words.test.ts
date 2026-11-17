import { describe, expect, it } from "vitest";
import { rowsToCards } from "../src/words";

describe("rowsToCards", () => {
  it("skips header, trims, builds ids", () => {
    const cards = rowsToCards([["Cirillico", "Traduzione", "Pronuncia"], [" Привет ", " Ciao ", "Pri-viét"]]);
    expect(cards).toEqual([{ id: "Привет␟Ciao", ru: "Привет", it: "Ciao", pron: "Pri-viét" }]);
  });
  it("drops rows missing Russian or Italian, allows missing pronunciation", () => {
    const cards = rowsToCards([["h"], ["", "x", "p"], ["y", "", "p"], ["Да", "Sì"]]);
    expect(cards).toEqual([{ id: "Да␟Sì", ru: "Да", it: "Sì", pron: "" }]);
  });
  it("dedupes by ru+it", () => {
    const cards = rowsToCards([["h"], ["Да", "Sì", "a"], ["Да", "Sì", "b"], ["Да", "Certo", ""]]);
    expect(cards.map(c => c.id)).toEqual(["Да␟Sì", "Да␟Certo"]);
    expect(cards[0]!.pron).toBe("a");
  });
});
