import { studyItems } from "../session";
import { computeStats } from "../srs";
import { setPrefs, setProgress, state } from "../state";
import type { Prefs, Progress } from "../types";
import { $ } from "../util";
import { show } from "./screens";
import { startSession } from "./session";

function setSeg(segId: string, value: string): void {
  $(segId).querySelectorAll<HTMLButtonElement>("button").forEach(b =>
    b.classList.toggle("on", b.dataset.v === value));
}

function bindSeg<K extends keyof Prefs>(segId: string, key: K): void {
  $(segId).querySelectorAll<HTMLButtonElement>("button").forEach(b => {
    b.onclick = () => {
      setPrefs({ ...state.prefs, [key]: b.dataset.v as Prefs[K] });
      renderMenu();
    };
  });
}

const plural = (n: number, one: string, many: string): string => n + " " + (n === 1 ? one : many);

export function renderMenu(): void {
  const { cards, verbs, progress, prefs } = state;
  const verbsMode = prefs.section === "verbs";
  setSeg("seg-section", prefs.section);
  setSeg("seg-dir", prefs.dir);
  const st = computeStats(studyItems(prefs.section, cards, verbs, prefs.dir), progress);
  $("st-due").textContent = String(st.due);
  $("st-new").textContent = String(st.fresh);
  $("st-learned").textContent = String(st.learned);
  $("st-total").textContent = String(st.total);
  $("subtitle").textContent = plural(cards.length, "parola", "parole") + " · " + plural(verbs.length, "verbo", "verbi");
  $("verbs-hint").classList.toggle("hidden", !verbsMode || !verbs.length);
  $<HTMLButtonElement>("start").disabled = st.inSession === 0;
  $<HTMLButtonElement>("start-all").disabled = st.total === 0;

  const unit = verbsMode ? ["esercizio", "esercizi"] as const : ["parola", "parole"] as const;
  const fresh = verbsMode ? "nuovi" : "nuove";
  $("menu-hint").textContent = st.total === 0
    ? (verbsMode
      ? "Nessun verbo caricato: carica il file Excel con il foglio «Verbi»."
      : "Nessuna parola caricata.")
    : st.inSession === 0
      ? "Niente da ripassare oggi 🎉 Usa “Ripassa tutto” per esercitarti comunque."
      : "Prossima sessione: " + plural(st.inSession, unit[0], unit[1]) +
        " (" + st.due + " da ripassare + " + st.newInSession + " " + fresh + ")";
}

export function openMenu(): void {
  renderMenu();
  show("menu");
}

/** Removes saved progress for the cards of the current section only. */
function resetSection(): void {
  const ids = new Set((state.prefs.section === "verbs" ? state.verbs : state.cards).map(c => c.id));
  const next: Progress = {};
  for (const [id, p] of Object.entries(state.progress)) if (!ids.has(id)) next[id] = p;
  setProgress(next);
}

export function initMenu(): void {
  bindSeg("seg-section", "section");
  bindSeg("seg-dir", "dir");
  $("start").onclick = () => startSession(false);
  $("start-all").onclick = () => startSession(true);
  $("reset").onclick = () => {
    const what = state.prefs.section === "verbs" ? "dei verbi" : "dei vocaboli";
    if (confirm("Vuoi davvero azzerare i progressi " + what + "?")) {
      resetSection();
      renderMenu();
    }
  };
}
