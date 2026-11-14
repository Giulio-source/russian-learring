import { describe, expect, it } from "vitest";
import { advance, applyAnswer, buildSessionList, createSession, promptOf, quizOptions } from "../src/session";
import { NEW_PER_SESSION } from "../src/srs";
import type { Card, Progress, StudyItem } from "../src/types";

const mk = (i: number): Card => ({ id: `r${i}␟i${i}`, ru: `r${i}`, it: `i${i}`, pron: `p${i}` });
const cards = Array.from({ length: 15 }, (_, i) => mk(i));
const items: StudyItem[] = cards.map(card => ({ card, slot: "ru-it" }));
const now = 1_000_000;

describe("buildSessionList", () => {
  it("takes all due cards plus at most NEW_PER_SESSION new ones", () => {
    const p: Progress = {
      [cards[0]!.id]: { "ru-it": { box: 2, due: now - 1 } },
      [cards[1]!.id]: { "ru-it": { box: 2, due: now + 1 } }, // not due
    };
    const list = buildSessionList(items, p, false, now);
    expect(list).toHaveLength(1 + NEW_PER_SESSION);
    expect(list).toContain(items[0]);
    expect(list).not.toContain(items[1]);
  });
  it("uses every card when `all` is set", () => {
    expect(buildSessionList(items, {}, true, now)).toHaveLength(cards.length);
  });
  it("picks new items in list order with orderedNew", () => {
    const list = buildSessionList(items, {}, false, now, Math.random, true);
    expect(new Set(list)).toEqual(new Set(items.slice(0, NEW_PER_SESSION)));
  });
});

describe("session flow", () => {
  it("re-queues wrong answers and counts only first attempts", () => {
    const s = createSession(items.slice(0, 5), "words");
    advance(s);
    const first = s.current!.card;
    applyAnswer(s, false);
    expect(s.correct).toBe(0);
    expect(s.done).toBe(0);
    expect(s.missed.get(first.id)).toBe(first);
    expect(s.queue[3]).toEqual({ card: first, slot: "ru-it", retry: true });

    // answer the 3 cards before the retry correctly, then the retry
    for (let i = 0; i < 3; i++) { advance(s); applyAnswer(s, true); }
    advance(s);
    expect(s.current).toEqual({ card: first, slot: "ru-it", retry: true });
    applyAnswer(s, true);
    expect(s.correct).toBe(3);
    expect(s.done).toBe(4);

    advance(s); applyAnswer(s, true);
    expect(advance(s)).toBe(false);
    expect(s.done).toBe(s.total);
    expect(s.correct).toBe(4);
  });
  it("inserts the retry at the end of a short queue", () => {
    const s = createSession(items.slice(0, 2), "words");
    advance(s);
    applyAnswer(s, false);
    expect(s.queue.map(q => q.retry)).toEqual([false, true]);
  });
});

describe("prompts and quiz options", () => {
  it("maps direction to question/answer", () => {
    expect(promptOf(cards[0]!, "ru-it")).toEqual({ q: "r0", qPron: "p0", a: "i0", aPron: "" });
    expect(promptOf(cards[0]!, "it-ru")).toEqual({ q: "i0", qPron: "", a: "r0", aPron: "p0" });
  });
  it("returns the correct answer plus 3 distinct distractors", () => {
    const { options, correct } = quizOptions(cards[0]!, cards, "ru-it");
    expect(correct).toBe("i0");
    expect(options).toHaveLength(4);
    expect(new Set(options).size).toBe(4);
    expect(options).toContain("i0");
  });
  it("handles decks with fewer than 4 cards", () => {
    expect(quizOptions(cards[0]!, cards.slice(0, 2), "it-ru").options.sort()).toEqual(["r0", "r1"]);
  });
});
