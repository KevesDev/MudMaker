/** Limits of the graph-paper canvas that are not theme data. Grid spacing, snap step and line widths come from the theme. */
export const CANVAS_LIMITS = {
  /** The smallest scale, screen pixels per world unit. Below it the major lines would crowd into a solid tone. */
  minZoom: 0.25,
  /** The largest scale. Above it one grid cell fills a large part of an ordinary window. */
  maxZoom: 4,
  /** Scale change for one press of the zoom keys. */
  keyZoomFactor: 1.25,
  /** Screen pixels one arrow key press moves the view. */
  keyPanStep: 48,
  /** Scale change per wheel pixel, as an exponent so a notch in and a notch out cancel exactly. */
  wheelZoomPerPixel: 0.0015,
  /** Pixels a wheel that reports lines stands for per line. */
  wheelLinePixels: 16,
} as const;

/** What a new canvas shows and does before the user changes it. */
export const CANVAS_DEFAULTS = {
  gridVisible: true,
  snapEnabled: true,
} as const;
