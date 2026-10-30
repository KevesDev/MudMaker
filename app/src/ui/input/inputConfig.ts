/** Thresholds of touch and pen recognition that are not theme data. */
export const GESTURE_LIMITS = {
  /** Screen pixels a finger may travel before a press stops being a tap or a possible long press and becomes a pan. */
  panSlop: 8,
  /** Milliseconds a finger must stay down, within the slop, to count as a long press. */
  longPressMs: 500,
  /** Milliseconds after the last pen activity during which new touch contacts are taken for a resting palm. */
  palmGraceMs: 800,
} as const;

export type GestureLimits = typeof GESTURE_LIMITS;
