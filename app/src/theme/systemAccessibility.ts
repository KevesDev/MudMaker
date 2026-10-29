import { DEFAULT_ACCESSIBILITY, type AccessibilitySettings } from "./types";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const INCREASED_CONTRAST_QUERY = "(prefers-contrast: more)";

export interface MediaQueryListLike {
  readonly matches: boolean;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

export interface MediaQuerySource {
  readonly matchMedia?: (query: string) => MediaQueryListLike;
}

function settingsFrom(reducedMotion: boolean, increasedContrast: boolean): AccessibilitySettings {
  return {
    textScale: DEFAULT_ACCESSIBILITY.textScale,
    contrast: increasedContrast ? "high" : "normal",
    reducedMotion,
  };
}

/** Reads the operating system preferences that media queries expose; text scale stays at its default. */
export function readSystemAccessibility(source: MediaQuerySource): AccessibilitySettings {
  const { matchMedia } = source;
  if (typeof matchMedia !== "function") return DEFAULT_ACCESSIBILITY;
  return settingsFrom(
    matchMedia.call(source, REDUCED_MOTION_QUERY).matches,
    matchMedia.call(source, INCREASED_CONTRAST_QUERY).matches,
  );
}

/** Reports the system preferences again whenever either media query changes; returns a function that stops watching. */
export function watchSystemAccessibility(
  source: MediaQuerySource,
  onChange: (settings: AccessibilitySettings) => void,
): () => void {
  const { matchMedia } = source;
  if (typeof matchMedia !== "function") return () => undefined;
  const reducedMotion = matchMedia.call(source, REDUCED_MOTION_QUERY);
  const increasedContrast = matchMedia.call(source, INCREASED_CONTRAST_QUERY);
  const report = (): void => onChange(settingsFrom(reducedMotion.matches, increasedContrast.matches));
  reducedMotion.addEventListener("change", report);
  increasedContrast.addEventListener("change", report);
  return () => {
    reducedMotion.removeEventListener("change", report);
    increasedContrast.removeEventListener("change", report);
  };
}
