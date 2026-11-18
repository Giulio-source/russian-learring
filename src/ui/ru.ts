import { state } from "../state";
import { stressParts, stripStress } from "../stress";

/**
 * Text that may contain Russian, as DOM: stressed vowels (with their accent) are
 * wrapped in `<span class="stress">` when the "Accento tonico" switch is on;
 * otherwise the accents are removed.
 */
export function ruNode(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (!state.prefs.stress) {
    frag.append(stripStress(text));
    return frag;
  }
  for (const p of stressParts(text)) {
    if (!p.stressed) { frag.append(p.text); continue; }
    const s = document.createElement("span");
    s.className = "stress";
    s.textContent = p.text;
    frag.append(s);
  }
  return frag;
}

/** Replaces the content of `el` with `ruNode(text)`. */
export function setRu(el: Element, text: string): void {
  el.replaceChildren(ruNode(text));
}
