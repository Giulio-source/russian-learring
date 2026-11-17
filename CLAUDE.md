# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Russo Flashcards" — a vanilla TypeScript + Vite web app for studying Russian ↔ Italian vocabulary with a multiple-choice quiz and simple spaced repetition. (Flip-card mode was removed at the user's request.) No UI framework and no runtime dependencies; the only external resource is Google Fonts (Onest). Git repo, pushed to GitHub (see Deploy).

**UI language is Italian.** Keep all user-facing strings in Italian.

## Commands

- `npm run dev` — Vite dev server with hot reload.
- `npm run build` — typecheck + build to a **single self-contained `dist/index.html`** (via `vite-plugin-singlefile`) that opens directly from disk (`open dist/index.html`), no server needed.
- `npm run typecheck` — `tsc --noEmit` (strict, `noUncheckedIndexedAccess`).
- `npm test` — Vitest unit tests in `tests/` (pure logic only, node environment; `tests/node-shims.d.ts` types the bit of `node:fs` used, instead of @types/node). Single file: `npx vitest run tests/srs.test.ts`.

**Deploy:** GitHub repo `Giulio-source/russian-learring`; `.github/workflows/pages.yml` runs tests + build on every push to `main` and publishes `dist/` to GitHub Pages (https://giulio-source.github.io/russian-learring/), used mainly from the user's phone. Since everything is inlined, no Vite `base` is needed. Keep the UI usable on touch screens (`@media (hover: none)` rules in styles.css; speech must be started synchronously from the tap for iOS Safari).

`legacy/index.html` is the original pre-TypeScript single-file version, kept for reference.

## Data format

The **only** vocabulary source is `data/Russian vocabulary.xlsx`, inside the repo. There is no file picker: it is imported with `?url` in `src/ui/load.ts` (`loadDeck`), inlined into `dist/index.html` as a data URL at build time, and parsed at every startup. To change the vocabulary, edit that file, commit and push (the Pages workflow redeploys). It has two sheets:
- **"Frasi e vocaboli"** — header row, then Cyrillic, Italian translation, Italian-style pronunciation (same 3 columns as the old CSV).
- **"Verbi"** — header row, then: A infinitive, B translation, C pronunciation, D–I present tense (я, ты, он/она/оно, мы, вы, они), then (Esempio, Traduzione) column pairs, and a final "Note" column (located by its header).

`src/xlsx.ts` is a dependency-free reader (zip via `DecompressionStream("deflate-raw")`, regex-based XML parsing → `string[][]` per sheet). `src/deck.ts` `sheetsToDeck` routes each sheet: name matching `/verb/i` or ≥ 9 header columns → verbs (`rowsToVerbs` in `src/verbs.ts`), otherwise vocabulary (`rowsToCards`, merged across sheets). CSV support was removed at the user's request.

`rowsToCards` (`src/words.ts`) skips the header, drops rows missing Russian or Italian, and dedupes. A card's **id is `ru + "␟" + it`** (verbs: `"verb␟" + ru + "␟" + it`), so editing either the Russian or Italian text in the file makes it a new card and orphans its saved progress.

## Architecture

`index.html` holds only the markup; `src/main.ts` is the entry point. Code is split into **pure logic** (no DOM, unit-tested) and **UI modules**:

- `src/types.ts` — `Card`, `Verb` (extends `Card` with `forms[6]`, `examples`, `note`), `Dir`, `Section` (`words`|`verbs`), `Slot` (`Dir` | `"conj"`), `StudyItem` (`{card, slot}`), `Exercise`, `BoxState`, `Progress`, `Prefs`, `Session`, `QueueItem`.
- `src/storage.ts` — try/catch `load`/`save` wrappers and typed loaders for the two localStorage keys (the deck itself is not stored; `removeLegacyKeys()` deletes the `ruapp.cards`/`ruapp.verbs` copies left by older versions):
  - `ruapp.progress` — `{cardId: {"ru-it": {box, due}, "it-ru": {box, due}, "conj": {box, due}}}`; progress is tracked **separately per slot** (each direction, plus `conj` for verbs).
  - `ruapp.prefs` — `{dir: "ru-it"|"it-ru", section: "words"|"verbs"}` (invalid values fall back to defaults; a leftover `mode` key from older versions is ignored).
  Keep these keys and shapes stable — users' saved progress depends on them.
- `src/srs.ts` — Leitner boxes 1–5: `grade()` returns a **new** `Progress` (up one box on correct, back to box 1 on wrong; a correct answer on a card not yet due — e.g. via "Ripassa tutto" — changes nothing). `INTERVALS = [0,1,3,7,14,30]` days by box, counted from start of today, so a graded card is never due again the same day. Box ≥ 3 (`LEARNED_BOX`) = "learned". Functions take `(card, slot)` and `now` as parameters for testability. `computeStats(items, …)` feeds the menu, including `inSession`/`newInSession`, which must match what `buildSessionList` picks.
- `src/session.ts` — `studyItems(section, …)` (words: one item per card in the chosen direction; verbs: per verb a meaning item in the chosen direction + a `conj` item), `buildSessionList` (all due + up to `NEW_PER_SESSION` (10) new — random for words, sheet order for verbs; "Ripassa tutto" = every item), `createSession`, `advance`, `applyAnswer`, `promptOf`, `quizOptions` (correct answer + 3 distinct random distractors), `exerciseFor` (builds the `Exercise` for an item).
- `src/verbs.ts` — `rowsToVerbs`, `conjExercise`: half the time a fill-in-the-blank on an example sentence that contains a conjugated form (`blankForm`), otherwise "pronoun ___"; options are always other forms of the **same** verb, so the answer hinges on the ending. A new random person/sentence is drawn each time the item comes up. Wrong answers are re-inserted `RETRY_OFFSET` (3) positions later as a `{card, retry: true}` queue item until answered correctly; only first attempts count toward the score.
- `src/state.ts` — the shared mutable app state (`cards`, `verbs`, `progress`, `prefs`, `session`); `setDeck` (not persisted), and persist through `setProgress`/`setPrefs`.
- `src/ui/*` — one module per screen/area (`screens`, `load`, `menu`, `session`, `quiz`, `summary`, `keyboard`), each exporting an `init*()` that wires event handlers, called once from `main.ts`. `ui/session.ts` owns the flow (`startSession` → `next` → `renderQuiz` → `answer`, which calls `grade()` only on first attempts — retries don't touch saved progress — then `applyAnswer`). The UI modules import each other circularly, which is fine because they only call each other at runtime — don't add top-level code that calls into another UI module.
- Screens: four `<section id="screen-*">` (load = "loading…"/error message only, menu, session, summary) toggled by `show()` in `ui/screens.ts` via the `.hidden` class.
- Menu: a "Vocaboli / Verbi" switch (`prefs.section`) scopes stats, sessions and "Azzera progressi" (which only clears the current section's ids). After answering a verb question the feedback shows the full conjugation table (asked person highlighted) and the note.
- Audio (`src/speech.ts`): Russian TTS via the Web Speech API (`speechSynthesis`, rate 1 or `SLOW_RATE` 0.6), buttons only — never auto-plays. To avoid the browser silently falling back to an English voice (Cyrillic read with an American accent), `speak()` re-reads the voice list each time (no stale voice objects) and always sets `lang = "ru-RU"`. Brave still substitutes its English voice (user uses Safari/Chrome for audio); a voice picker was tried and removed at the user's request. `<body>` gets class `tts` when a Russian voice exists; CSS hides the 🔊/🐢 buttons otherwise and shows `#speech-hint` in the menu. What to read is pure logic: each `Exercise` carries `speakBefore` (only when the prompt itself is Russian, so it never gives the answer away; "" otherwise) and `speakAfter` (the word, "pronoun + form" via `spokenForm`, or the full example sentence). Conjugation-table cells and the summary's missed words are also playable.
- Keyboard (`ui/keyboard.ts`): quiz — `1`–`4` choose, Enter next, `A` listen, `L` listen slowly; Enter on summary returns to menu.
- `src/util.ts` — `shuffle` (injectable RNG), typed `$` element getter (throws if the id is missing), `replayAnim`.

## Styling

`src/styles.css` — clean, modern look (the old neon theme was dropped at the user's request) in a cheerful palette chosen by the user: sky `#8ecae6`, blue `#219ebc`, navy `#023047`, sun `#ffb703`, orange `#fb8500`. Navy is the text color; main actions (primary buttons, logo, progress bar) use the sun→orange `--accent-gradient` with navy text; blue (`--brand`, `--brand-ink` for text) marks labels, focus and number badges; the Vocaboli/Verbi switch uses `--strong`; the question card has a sky→orange band on top; green/red (`--good`/`--bad`) stay for right/wrong. Font **Onest** (Google Fonts, has Cyrillic). Light by default with a `prefers-color-scheme: dark` override of the same tokens on `:root` (deep navy surfaces, sky as brand). Text/background pairs were checked for WCAG contrast; `--accent-text` (orange) is only for large text. Reuse these tokens rather than hard-coding colors. Layout is a single centered column (`main`, max-width 600px).
