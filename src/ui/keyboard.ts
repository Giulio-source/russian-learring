import { state } from "../state";
import { $ } from "../util";
import { chooseIndex, quizNext, sayCurrent } from "./quiz";
import { currentScreen } from "./screens";

export function initKeyboard(): void {
  document.addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const screen = currentScreen();
    if (screen === "summary" && e.key === "Enter") {
      e.preventDefault();
      $("back-menu").click();
      return;
    }
    const s = state.session;
    if (screen !== "session" || !s) return;
    if (/^[1-4]$/.test(e.key)) {
      chooseIndex(Number(e.key));
    } else if (e.key === "a" || e.key === "A" || e.key === "l" || e.key === "L") {
      e.preventDefault();
      sayCurrent(e.key.toLowerCase() === "l");
    } else if (e.key === "Enter" && s.answered) {
      e.preventDefault();
      quizNext();
    }
  });
}
