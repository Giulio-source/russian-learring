import { parseCSV, rowsToCards } from "../csv";
import { sheetsToDeck } from "../deck";
import { setCards, setVerbs } from "../state";
import { $ } from "../util";
import { readXlsx } from "../xlsx";
import { openMenu } from "./menu";
import { show } from "./screens";

function showError(msg: string): void {
  const err = $("load-error");
  err.textContent = msg;
  err.classList.remove("hidden");
}

async function handleFile(file: File | undefined): Promise<void> {
  if (!file) return;
  try {
    if (/\.xlsx$/i.test(file.name)) {
      const { cards, verbs } = sheetsToDeck(await readXlsx(await file.arrayBuffer()));
      if (!cards.length && !verbs.length) {
        showError("Nessuna parola né verbo trovati. Controlla che i fogli abbiano una riga di intestazione.");
        return;
      }
      setCards(cards);
      setVerbs(verbs);
    } else {
      // CSV: vocabulary only; previously loaded verbs are kept.
      const cards = rowsToCards(parseCSV(await file.text()));
      if (!cards.length) {
        showError("Nessuna parola trovata. Controlla che il file abbia 3 colonne e una riga di intestazione.");
        return;
      }
      setCards(cards);
    }
  } catch (e) {
    showError("Impossibile leggere il file: " + (e instanceof Error ? e.message : String(e)));
    return;
  }
  $("load-error").classList.add("hidden");
  openMenu();
}

export function openLoad(cancellable: boolean): void {
  $("cancel-load").classList.toggle("hidden", !cancellable);
  show("load");
}

export function initLoad(): void {
  const input = $<HTMLInputElement>("file");
  $("pick").onclick = () => input.click();
  input.onchange = () => {
    void handleFile(input.files?.[0]);
    input.value = "";
  };

  const drop = $("drop");
  for (const ev of ["dragenter", "dragover"]) {
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); });
  }
  for (const ev of ["dragleave", "drop"]) {
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); });
  }
  drop.addEventListener("drop", e => void handleFile(e.dataTransfer?.files[0]));
  // Prevent the browser from opening files dropped outside the drop zone.
  window.addEventListener("dragover", e => e.preventDefault());
  window.addEventListener("drop", e => e.preventDefault());

  $("cancel-load").onclick = () => openMenu();
}
