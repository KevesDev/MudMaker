import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { numberToken, useTheme, type ThemeManager } from "../theme";
import { WORDMARK_STEP_PROPERTY, largestFittingStep } from "./wordmark";

export type VersionPlacement = "beside" | "below";

export interface WordmarkFit {
  /** The row that holds the banner. Its width is the room the banner may fill. */
  readonly rowRef: RefObject<HTMLDivElement | null>;
  readonly artRef: RefObject<HTMLSpanElement | null>;
  /** The version block, when there is one. */
  readonly versionRef: RefObject<HTMLParagraphElement | null>;
  /** An unseen copy of the two-line version, whose width decides whether the version fits beside the banner. */
  readonly probeRef: RefObject<HTMLSpanElement | null>;
  /** The banner size, in whole units of the wordmark size token. */
  readonly step: number;
  /** Whether the version overhangs the banner at its lower right or, with no room there, drops below it. */
  readonly placement: VersionPlacement;
}

const pixels = (value: string): number => Number.parseFloat(value) || 0;

/**
 * Sizes the banner to the largest whole number of wordmark units that fits its row, measuring each candidate in
 * the drawn font. The version never takes part: it hangs outside the banner when the stage has room beside it and
 * otherwise drops below, so the banner is the same size and place with or without one. Where the window cannot be
 * measured the banner takes the token's default step.
 */
export function useWordmarkFit(theme: ThemeManager, stageRef: RefObject<HTMLElement | null>): WordmarkFit {
  const tokens = useTheme("home", theme).tokens;
  const defaultStep = numberToken(tokens, "wordmark.defaultStep");
  const rowRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLSpanElement>(null);
  const versionRef = useRef<HTMLParagraphElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  /** The step the banner is drawn at now, where the next search starts. */
  const drawn = useRef(defaultStep);
  const [placement, setPlacement] = useState<VersionPlacement>("below");

  useLayoutEffect(() => {
    const row = rowRef.current;
    const art = artRef.current;
    if (row === null || art === null || typeof ResizeObserver === "undefined") return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const widthAt = (step: number): number => {
      art.style.setProperty(WORDMARK_STEP_PROPERTY, String(step));
      return art.getBoundingClientRect().width;
    };
    /** Reads the best step and where the version hangs, leaving the page as it found it. */
    const measure = (): { readonly step: number; readonly placement: VersionPlacement } | null => {
      if (art.getBoundingClientRect().width === 0) return null;
      const before = art.style.getPropertyValue(WORDMARK_STEP_PROPERTY);
      const step = largestFittingStep(widthAt, row.getBoundingClientRect().width, drawn.current);
      let placement: VersionPlacement = "below";
      const probe = probeRef.current;
      const stage = stageRef.current;
      if (probe !== null && stage !== null) {
        const bannerWidth = widthAt(step);
        const needed = probe.getBoundingClientRect().width + pixels(getComputedStyle(probe).marginInlineStart);
        const padding = getComputedStyle(stage);
        const inner = stage.clientWidth - pixels(padding.paddingInlineStart) - pixels(padding.paddingInlineEnd);
        placement = (inner - bannerWidth) / 2 >= needed ? "beside" : "below";
      }
      art.style.setProperty(WORDMARK_STEP_PROPERTY, before);
      return { step, placement };
    };
    const apply = ({ step, placement }: { readonly step: number; readonly placement: VersionPlacement }): void => {
      // Only state is written: React commits the size, the placement and the version's content together.
      drawn.current = step;
      setMeasured(step);
      setPlacement(placement);
    };
    // Later checks only read the page and write one task later: changing the layout inside the observer's own
    // callback makes the browser report that it could not deliver every notification.
    const observer = new ResizeObserver(() => {
      const result = measure();
      if (result === null) return;
      clearTimeout(pending);
      pending = setTimeout(() => apply(result));
    });
    for (const element of [stageRef.current, row, art, versionRef.current, probeRef.current]) if (element !== null) observer.observe(element);
    const first = measure();
    if (first !== null) apply(first);
    return () => {
      clearTimeout(pending);
      observer.disconnect();
    };
  }, [stageRef]);

  return { rowRef, artRef, versionRef, probeRef, step: measured ?? defaultStep, placement };
}
