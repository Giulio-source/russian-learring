import { advance, applyAnswer, buildSessionList, createSession, studyItems } from "../session";
import { grade } from "../srs";
import { setProgress, state } from "../state";
import type { Session } from "../types";
import { stopSpeaking } from "../speech";
import { $ } from "../util";
import { openMenu } from "./menu";
import { renderQuiz } from "./quiz";
import { show } from "./screens";
import { showSummary } from "./summary";

export function startSession(all: boolean): void {
  const { dir, section } = state.prefs;
  const items = studyItems(section, state.cards, state.verbs, dir);
  const list = buildSessionList(items, state.progress, all, Date.now(), Math.random, section === "verbs");
  if (!list.length) return;
  state.session = createSession(list, section);
  show("session");
  next();
}

export function updateProgress(s: Session): void {
  $("progress-text").textContent = s.done + " / " + s.total + "  ·  ✓ " + s.correct;
  $("progress-bar").style.width = (100 * s.done) / s.total + "%";
}

export function next(): void {
  const s = state.session;
  if (!s) return;
  if (!advance(s)) {
    updateProgress(s);
    state.session = null;
    showSummary(s);
    return;
  }
  updateProgress(s);
  renderQuiz(s);
}

/**
 * Updates the session; only the first attempt at a card moves it between boxes
 * (re-queued retries after a mistake don't touch the saved progress).
 */
export function answer(s: Session, correct: boolean): void {
  if (!s.current) return;
  if (!s.current.retry) setProgress(grade(state.progress, s.current.card, s.current.slot, correct));
  applyAnswer(s, correct);
  updateProgress(s);
}

export function quitSession(): void {
  stopSpeaking();
  state.session = null;
  openMenu();
}

export function initSession(): void {
  $("quit").onclick = quitSession;
}
