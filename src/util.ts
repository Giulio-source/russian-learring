export type Rng = () => number;

/** In-place Fisher–Yates shuffle; returns the same array. */
export function shuffle<T>(a: T[], rng: Rng = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Typed `getElementById` that fails loudly if the markup is out of sync. */
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} non trovato`);
  return el as T;
}

/** Restart the element's CSS animation. */
export function replayAnim(el: HTMLElement): void {
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
}
