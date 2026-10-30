import type { ControlId } from "../ui";
import type { WindowMode } from "./WindowController";

/** The catalog surface the window frame owns. */
export const FRAME_SURFACE = "home.frame";

/** Catalog controls of the frame surface, named by the role they play. */
export const FRAME = {
  title: "home.frame.01",
  minimize: "home.frame.02",
  maximize: "home.frame.03",
  restore: "home.frame.04",
  close: "home.frame.05",
} as const satisfies Readonly<Record<string, ControlId>>;

/** The two catalog entries of the toggle: the one whose `visibleWhen` names the window's mode is shown. */
export const TOGGLE_CONTROLS: readonly ControlId[] = [FRAME.maximize, FRAME.restore];

/** The `visibleWhen` condition that holds in each mode. */
export const MODE_CONDITION: Readonly<Record<WindowMode, string>> = { restored: "windowRestored", maximized: "windowMaximized" };

/** Plain text characters drawn in the code font of the theme; there is no icon set and no image. */
export const GLYPHS = {
  minimize: "─",
  maximize: "□",
  restore: "❐",
  close: "×",
} as const;

export const TOGGLE_GLYPH: Readonly<Record<WindowMode, string>> = { restored: GLYPHS.maximize, maximized: GLYPHS.restore };
