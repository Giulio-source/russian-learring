/**
 * Russian text-to-speech through the browser's Web Speech API (no files, no
 * network on macOS/iOS). `<body>` gets the `tts` class when a Russian voice is
 * available; CSS uses it to show the audio buttons or the "no voice" hint.
 *
 * Pitfall: if an utterance's voice isn't recognised, browsers silently fall back
 * to the default (often English) voice, which reads Cyrillic with an American
 * accent. To avoid it we (1) re-read the voice list right before speaking, so the
 * SpeechSynthesisVoice object is never stale, and (2) always set `lang = "ru-RU"` so
 * a lang-based fallback still lands on a Russian voice.
 * (Brave still swaps in its English voice regardless; use Safari or Chrome.)
 */

/** Speech rate for the slow button; below ~0.5 many voices get distorted. */
export const SLOW_RATE = 0.6;
const LANG = "ru-RU";

function synth(): SpeechSynthesis | null {
  return typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
}

const isRussian = (v: SpeechSynthesisVoice): boolean => /^ru([-_]|$)/i.test(v.lang);

/** Russian voices, best first: ru-RU, then on-device voices. */
function russianVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  const score = (v: SpeechSynthesisVoice): number =>
    (v.lang.replace("_", "-").toLowerCase() === "ru-ru" ? 2 : 0) + (v.localService ? 1 : 0);
  return s.getVoices().filter(isRussian).sort((a, b) => score(b) - score(a));
}

/** The best Russian voice available right now. */
function currentVoice(): SpeechSynthesisVoice | null {
  return russianVoices()[0] ?? null;
}

function refresh(): void {
  document.body.classList.toggle("tts", !!currentVoice());
}

/** Reads `text` in Russian, interrupting anything still playing. */
export function speak(text: string, slow = false): void {
  const s = synth();
  const voice = currentVoice();
  if (!s || !voice || !text.trim()) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG;
  u.voice = voice;
  u.rate = slow ? SLOW_RATE : 1;
  // Chrome sometimes drops an utterance queued in the same tick as cancel().
  setTimeout(() => s.speak(u), 0);
}

export function stopSpeaking(): void {
  synth()?.cancel();
}

export function initSpeech(): void {
  const s = synth();
  refresh();
  s?.addEventListener?.("voiceschanged", refresh);
  // Some browsers fill the list late without firing the event.
  setTimeout(refresh, 1000);
}

/** A 🔊 / 🐢 button reading `text` (normal or slow). */
export function speakButton(text: string, slow: boolean): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "say";
  b.textContent = slow ? "🐢" : "🔊";
  b.title = slow ? "Ascolta lentamente" : "Ascolta";
  b.setAttribute("aria-label", b.title);
  b.onclick = e => { e.stopPropagation(); speak(text, slow); };
  return b;
}
