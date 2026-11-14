import { exerciseFor } from "../session";
import { state } from "../state";
import type { Card, Exercise, Session } from "../types";
import { $, replayAnim } from "../util";
import { speak, stopSpeaking } from "../speech";
import { isVerb, PERSONS_RU, spokenForm } from "../verbs";
import { answer, next } from "./session";

let currentExercise: Exercise | null = null;

export function renderQuiz(s: Session): void {
  if (!s.current) return;
  const pool = s.section === "verbs" ? state.verbs : state.cards;
  const ex = exerciseFor(s.current, pool);
  currentExercise = ex;
  $("q-label").textContent = ex.label;
  const prompt = $("q-prompt");
  prompt.textContent = ex.q;
  prompt.classList.toggle("long", ex.q.length > 18);
  $("q-pron").textContent = ex.qPron;

  const box = $("q-opts");
  box.replaceChildren();
  ex.options.forEach((t, i) => {
    const b = document.createElement("button");
    const k = document.createElement("kbd");
    k.textContent = i + 1 + ".";
    b.append(k, t);
    b.dataset.correct = t === ex.correct ? "1" : "";
    b.onclick = () => choose(b);
    box.appendChild(b);
  });
  $("q-feedback").classList.add("hidden");
  $("q-next-row").classList.add("hidden");
  stopSpeaking();
  updateSpeak(false);
  replayAnim($("quiz-card"));
}

/** What the audio buttons read now: before answering only if it doesn't give the answer away. */
function speechText(answered: boolean): string {
  if (!currentExercise) return "";
  return answered ? currentExercise.speakAfter : currentExercise.speakBefore;
}

function updateSpeak(answered: boolean): void {
  $("q-speak").classList.toggle("hidden", !speechText(answered));
}

/** Plays the current question/answer (keyboard A / L and the 🔊 / 🐢 buttons). */
export function sayCurrent(slow: boolean): void {
  speak(speechText(!!state.session?.answered), slow);
}

/** After answering: the word with its pronunciation, or for a verb its full conjugation table. */
function renderFeedback(card: Card, ex: Exercise | null): void {
  const fb = $("q-feedback");
  fb.replaceChildren();
  const head = document.createElement("div");
  head.className = "pron";
  if (!isVerb(card)) {
    head.textContent = card.ru + (card.pron ? "  —  " + card.pron : "");
    fb.append(head);
    return;
  }
  head.textContent = card.ru + " — " + card.it + (card.pron ? "  (" + card.pron + ")" : "");
  fb.append(head);
  if (card.forms.some(f => f)) {
    const grid = document.createElement("div");
    grid.className = "conj";
    // Two columns: singular (я, ты, он) on the left, plural (мы, вы, они) on the right.
    for (const i of [0, 3, 1, 4, 2, 5]) {
      // Each cell is a button: tapping it reads "pronoun + form" (slowly, to hear the stress).
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = ex?.person === i ? "hl" : "";
      const spoken = spokenForm(card, i);
      cell.disabled = !spoken;
      cell.title = "Ascolta";
      cell.onclick = () => speak(spoken, true);
      const p = document.createElement("span");
      p.textContent = PERSONS_RU[i] ?? "";
      const f = document.createElement("b");
      f.textContent = card.forms[i] || "—";
      cell.append(p, f);
      grid.append(cell);
    }
    fb.append(grid);
  }
  if (card.note) {
    const note = document.createElement("div");
    note.className = "note";
    note.textContent = card.note;
    fb.append(note);
  }
}

export function choose(btn: HTMLButtonElement): void {
  const s = state.session;
  if (!s || s.answered || !s.current) return;
  const correct = btn.dataset.correct === "1";
  $("q-opts").querySelectorAll<HTMLButtonElement>("button").forEach(b => {
    b.disabled = true;
    if (b.dataset.correct) b.classList.add("good");
  });
  if (!correct) btn.classList.add("bad");
  renderFeedback(s.current.card, currentExercise);
  $("q-feedback").classList.remove("hidden");
  $("q-next-row").classList.remove("hidden");
  updateSpeak(true);
  answer(s, correct);
}

/** Selects the n-th option (1-based), used by the keyboard handler. */
export function chooseIndex(n: number): void {
  const b = $("q-opts").querySelectorAll<HTMLButtonElement>("button")[n - 1];
  if (b) choose(b);
}

export function quizNext(): void {
  if (state.session?.answered) next();
}

export function initQuiz(): void {
  $("q-next").onclick = quizNext;
  $("q-say").onclick = () => sayCurrent(false);
  $("q-say-slow").onclick = () => sayCurrent(true);
}
