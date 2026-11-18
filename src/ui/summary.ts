import type { Session } from "../types";
import { speakButton, stopSpeaking } from "../speech";
import { $ } from "../util";
import { openMenu } from "./menu";
import { setRu } from "./ru";
import { show } from "./screens";

export function showSummary(s: Session): void {
  stopSpeaking();
  $("sum-score").textContent = s.correct + " / " + s.total;
  $("sum-text").textContent = s.missed.size ? (s.section === "verbs" ? "Verbi da rivedere:" : "Parole da rivedere:") : "Perfetto, nessun errore! 🎉";
  const ul = $("sum-missed");
  ul.replaceChildren();
  for (const c of s.missed.values()) {
    const li = document.createElement("li");
    const b = document.createElement("b");
    setRu(b, c.ru);
    const sm = document.createElement("small");
    sm.textContent = "  " + c.pron;
    const say = document.createElement("span");
    say.className = "say-row";
    say.append(speakButton(c.ru, false), speakButton(c.ru, true));
    li.append(say, b, sm, document.createElement("br"), c.it);
    ul.appendChild(li);
  }
  show("summary");
}

export function initSummary(): void {
  $("back-menu").onclick = openMenu;
}
