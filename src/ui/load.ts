import vocabularyUrl from "../../data/Russian vocabulary.xlsx?url";
import { sheetsToDeck } from "../deck";
import { setDeck } from "../state";
import { $ } from "../util";
import { readXlsx } from "../xlsx";
import { openMenu } from "./menu";
import { show } from "./screens";

/**
 * Reads the vocabulary bundled with the app (data/Russian vocabulary.xlsx,
 * inlined into dist/index.html at build time) and opens the menu.
 */
export async function loadDeck(): Promise<void> {
  show("load");
  try {
    const res = await fetch(vocabularyUrl);
    if (!res.ok) throw new Error("file non trovato (" + res.status + ")");
    const { cards, verbs } = sheetsToDeck(await readXlsx(await res.arrayBuffer()));
    if (!cards.length && !verbs.length) throw new Error("nessuna parola né verbo nel file");
    setDeck(cards, verbs);
  } catch (e) {
    $("load-status").classList.add("hidden");
    const err = $("load-error");
    err.textContent = "Impossibile leggere il vocabolario: " + (e instanceof Error ? e.message : String(e));
    err.classList.remove("hidden");
    return;
  }
  openMenu();
}
