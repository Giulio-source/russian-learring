import { describe, expect, it } from "vitest";
import { computeStats, DAY, getState, grade, isDue, isNew, startOfToday } from "../src/srs";
import type { Card, Progress } from "../src/types";

const card: Card = { id: "a␟b", ru: "a", it: "b", pron: "" };
const now = new Date(2026, 10, 12, 15, 30).getTime();
const today = startOfToday(now);

describe("grade", () => {
  it("moves a new card to box 1, due tomorrow (not due again today)", () => {
    const p = grade({}, card, "ru-it", true, now);
    expect(getState(p, card, "ru-it")).toEqual({ box: 1, due: today + DAY });
    expect(isDue(p, card, "ru-it", now)).toBe(false);
  });
  it("follows INTERVALS on each due review and caps at box 5", () => {
    let p: Progress = {};
    let t = now;
    for (const [box, days] of [[1, 1], [2, 3], [3, 7], [4, 14], [5, 30], [5, 30]] as const) {
      p = grade(p, card, "ru-it", true, t);
      expect(getState(p, card, "ru-it")).toEqual({ box, due: startOfToday(t) + days * DAY });
      t = getState(p, card, "ru-it")!.due + 3_600_000; // review an hour after it becomes due
    }
  });
  it("does not promote a card answered correctly before it is due", () => {
    const p1 = grade({}, card, "ru-it", true, now);
    expect(grade(p1, card, "ru-it", true, now)).toBe(p1);
  });
  it("sends wrong answers back to box 1, due tomorrow, even when not due", () => {
    const p: Progress = { [card.id]: { "ru-it": { box: 4, due: now + 5 * DAY } } };
    expect(getState(grade(p, card, "ru-it", false, now), card, "ru-it")).toEqual({ box: 1, due: today + DAY });
  });
  it("tracks directions separately and does not mutate input", () => {
    const p0: Progress = {};
    const p1 = grade(p0, card, "ru-it", true, now);
    const p2 = grade(p1, card, "it-ru", false, now);
    expect(p0).toEqual({});
    expect(p2[card.id]).toEqual({ "ru-it": { box: 1, due: today + DAY }, "it-ru": { box: 1, due: today + DAY } });
  });
});

describe("isDue / isNew / computeStats", () => {
  it("classifies cards", () => {
    const other: Card = { id: "c␟d", ru: "c", it: "d", pron: "" };
    const p: Progress = {
      [card.id]: { "ru-it": { box: 3, due: now - 1 } },
      [other.id]: { "ru-it": { box: 2, due: now + DAY } },
    };
    expect(isNew(p, card, "ru-it")).toBe(false);
    expect(isNew(p, card, "it-ru")).toBe(true);
    expect(isDue(p, card, "ru-it", now)).toBe(true);
    expect(isDue(p, other, "ru-it", now)).toBe(false);
    expect(computeStats([card, other].map(c => ({ card: c, slot: "ru-it" as const })), p, now)).toEqual({ due: 1, fresh: 0, learned: 1, total: 2, newInSession: 0, inSession: 1 });
    expect(computeStats([card, other].map(c => ({ card: c, slot: "it-ru" as const })), p, now)).toEqual({ due: 0, fresh: 2, learned: 0, total: 2, newInSession: 2, inSession: 2 });
  });
});
