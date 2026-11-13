/**
 * The Light / Dark / System choice for the app chrome (never the slide canvas, the preview or the render).
 *
 * The choice is kept on the device (`localStorage`), because the settings table holds only the slide theme, one
 * value for the whole app. `data-theme` on `<html>` only ever holds `light` or `dark`: System resolves the OS
 * setting into one of them and follows a live change. A first visit shows light, never the system's.
 *
 * `ui/index.html` runs a small inline script before first paint that does what `readAppearance` and
 * `applyAppearance` do for the stored choice; a test keeps the two in step.
 */

export type Appearance = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const APPEARANCE_KEY = "newspapper-appearance";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The browser chrome's colour (`<meta name="theme-color">`): the board's, in each theme. styles/index.css holds
 * the same two values as `--color-board`, and a test keeps all three equal. */
export const THEME_COLOR: Record<ResolvedTheme, string> = { light: "#e9e8e3", dark: "#121315" };

function isAppearance(value: unknown): value is Appearance {
  return value === "light" || value === "dark" || value === "system";
}

/** The stored choice, or light when there is none or storage is blocked. */
export function readAppearance(): Appearance {
  try {
    const stored = window.localStorage.getItem(APPEARANCE_KEY);
    return isAppearance(stored) ? stored : "light";
  } catch {
    return "light";
  }
}

export function resolveAppearance(choice: Appearance): ResolvedTheme {
  if (choice !== "system") return choice;
  try {
    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function paint(theme: ResolvedTheme): void {
  document.documentElement.dataset["theme"] = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

let stopFollowing: (() => void) | null = null;

/** Paints the choice, stores it, and, only while it is System, follows the OS setting changing. */
export function applyAppearance(choice: Appearance, options: { store?: boolean } = {}): void {
  stopFollowing?.();
  stopFollowing = null;
  paint(resolveAppearance(choice));
  if (options.store ?? true) {
    try {
      window.localStorage.setItem(APPEARANCE_KEY, choice);
    } catch {
      // Blocked storage: the choice lasts until the page closes.
    }
  }
  if (choice !== "system") return;
  try {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (): void => paint(resolveAppearance("system"));
    query.addEventListener("change", onChange);
    stopFollowing = () => query.removeEventListener("change", onChange);
  } catch {
    // No matchMedia: System stays as resolved.
  }
}

/** At startup: paints the stored choice (the inline script already did, before first paint) and wires System. */
export function initAppearance(): void {
  applyAppearance(readAppearance(), { store: false });
}
