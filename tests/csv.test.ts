import { describe, expect, it } from "vitest";
import { parseCSV, rowsToCards } from "../src/csv";

describe("parseCSV", () => {
  it("parses simple rows", () => {
    expect(parseCSV("a,b,c\nd,e,f")).toEqual([["a", "b", "c"], ["d", "e", "f"]]);
  });
  it("strips BOM", () => {
    expect(parseCSV("﻿a,b")).toEqual([["a", "b"]]);
  });
  it("handles CRLF and lone CR", () => {
    expect(parseCSV("a,b\r\nc,d\re,f")).toEqual([["a", "b"], ["c", "d"], ["e", "f"]]);
  });
  it("handles quoted fields with commas, newlines and escaped quotes", () => {
    expect(parseCSV('"x, y","say ""hi""","line\nbreak"')).toEqual([["x, y", 'say "hi"', "line\nbreak"]]);
  });
  it("does not add an empty row for a trailing newline", () => {
    expect(parseCSV("a,b\n")).toEqual([["a", "b"]]);
  });
  it("keeps empty fields", () => {
    expect(parseCSV("a,,c")).toEqual([["a", "", "c"]]);
  });
});

describe("rowsToCards", () => {
  it("skips header, trims, builds ids", () => {
    const cards = rowsToCards(parseCSV("Cirillico,Traduzione,Pronuncia\n Привет , Ciao ,Pri-viét"));
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
