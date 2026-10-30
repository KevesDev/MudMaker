import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useTheme, type ThemeManager } from "../theme";

/**
 * How far, in pixels, the last entry may run past the row before the row stacks. A browser lays out in
 * sixty-fourths of a pixel, so a row whose entries fit exactly can measure a hair over after rounding; a whole
 * pixel is far above that rounding and far below anything a person could see.
 */
export const OVERFLOW_TOLERANCE = 1;

/**
 * Whether the entries of a row do not fit on one line and so stack. It is decided by measurement, not by a width:
 * the row is laid out in one line, and if its last entry runs past its right edge the entries stack. Any code font
 * and any text scale therefore give the right answer. The first check runs before the first paint. Later checks
 * run when the row, an entry or the theme changes, and they only read the page: the answer is written one task
 * later, because changing the row's height inside the observer's own callback makes the browser report that it
 * could not deliver every notification. Where nothing can be measured the entries stay on one line.
 */
export function useNarrowFlag(theme: ThemeManager): { readonly ref: RefObject<HTMLElement | null>; readonly narrow: boolean } {
  const resolved = useTheme("home", theme);
  const ref = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const row = ref.current;
    if (row === null || typeof ResizeObserver === "undefined") return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    /** Reads whether the entries overflow one line, leaving the page as it found it. */
    const overflows = (): boolean | null => {
      if (row.getBoundingClientRect().width === 0) return null;
      const before = row.dataset.narrow;
      // The row is measured as one line whatever it is showing now, so the answer cannot depend on the last answer.
      row.dataset.narrow = "false";
      const last = row.lastElementChild;
      const result = last !== null && last.getBoundingClientRect().right - row.getBoundingClientRect().right > OVERFLOW_TOLERANCE;
      if (before === undefined) delete row.dataset.narrow;
      else row.dataset.narrow = before;
      return result;
    };
    const observer = new ResizeObserver(() => {
      const result = overflows();
      if (result === null) return;
      clearTimeout(pending);
      pending = setTimeout(() => setNarrow(result));
    });
    for (const element of [row, ...row.children]) observer.observe(element);
    const first = overflows();
    if (first !== null) setNarrow(first);
    return () => {
      clearTimeout(pending);
      observer.disconnect();
    };
  }, [resolved]);

  return { ref, narrow };
}
