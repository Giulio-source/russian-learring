import type { Screen } from "../types";
import { $ } from "../util";

const SCREENS: Screen[] = ["load", "menu", "session", "summary"];
let current: Screen | null = null;

export function show(screen: Screen): void {
  for (const s of SCREENS) $("screen-" + s).classList.toggle("hidden", s !== screen);
  current = screen;
}

export function currentScreen(): Screen | null {
  return current;
}
