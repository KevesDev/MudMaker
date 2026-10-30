import { blendColor, contrastRatio, formatHexColor, parseHexColor, type Rgb } from "./color";
import type { TokenValue } from "./types";

/** WCAG 2.2 enhanced contrast (AAA) for text, and the non-text minimum for borders and focus rings. */
export const HIGH_CONTRAST_TEXT_RATIO = 7;
export const HIGH_CONTRAST_GRAPHIC_RATIO = 3;

/** Each blend step moves the color one percent of the way to the extreme. */
const BLEND_STEPS = 100;

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

interface ContrastRule {
  readonly foregrounds: readonly string[];
  readonly backgrounds: readonly string[];
  readonly minRatio: number;
}

const SURFACES = [
  "color.surface.app",
  "color.surface.panel",
  "color.surface.toolbar",
  "color.surface.inspector",
  "color.surface.canvas",
  "color.surface.overlay",
] as const;

/** Disabled text and decorative colors are exempt, matching WCAG. */
const RULES: readonly ContrastRule[] = [
  {
    foregrounds: [
      "color.text.primary",
      "color.text.secondary",
      "color.text.muted",
      "color.status.success",
      "color.status.warning",
      "color.status.error",
      "color.status.information",
      "color.status.connected",
      "color.status.reconnecting",
      "color.status.offline",
    ],
    backgrounds: SURFACES,
    minRatio: HIGH_CONTRAST_TEXT_RATIO,
  },
  {
    foregrounds: [
      "color.border.normal",
      "color.border.focused",
      "color.border.invalid",
      "color.interaction.focus",
      "color.border.frame",
      "color.accent.primary",
      // The secondary accent has its own rule below: as a fill under text it must not be pushed toward a surface color.
      "color.accent.tertiary",
    ],
    backgrounds: SURFACES,
    minRatio: HIGH_CONTRAST_GRAPHIC_RATIO,
  },
  {
    foregrounds: [
      "color.terminal.foreground",
      "color.terminal.prompt",
      "color.terminal.chat",
      "color.terminal.tell",
      "color.terminal.system",
      "color.terminal.warning",
      "color.terminal.link",
      "color.terminal.emote",
      "color.terminal.combat",
    ],
    backgrounds: ["color.terminal.background"],
    minRatio: HIGH_CONTRAST_TEXT_RATIO,
  },
];

function worstRatio(color: Rgb, backgrounds: readonly Rgb[]): number {
  return Math.min(...backgrounds.map((background) => contrastRatio(color, background)));
}

/**
 * Moves a color toward white or black, whichever contrasts more, by the smallest
 * blend that reaches the ratio. Returns null when the color already complies.
 */
function raiseContrast(color: Rgb, backgrounds: readonly Rgb[], minRatio: number): Rgb | null {
  if (worstRatio(color, backgrounds) >= minRatio) return null;
  const extreme = worstRatio(WHITE, backgrounds) >= worstRatio(BLACK, backgrounds) ? WHITE : BLACK;
  for (let step = 1; step <= BLEND_STEPS; step += 1) {
    const candidate = blendColor(color, extreme, step / BLEND_STEPS);
    if (worstRatio(candidate, backgrounds) >= minRatio) return candidate;
  }
  return extreme;
}

function colorOf(tokens: Readonly<Record<string, TokenValue>>, name: string): Rgb | null {
  const value = tokens[name];
  return typeof value === "string" ? parseHexColor(value) : null;
}

/**
 * The secondary accent is either a boundary against every surface or a fill under primary text. When it is
 * neither, it moves away from the text color by the smallest blend that lets the text reach the text ratio.
 */
function secondaryAccentFor(tokens: Readonly<Record<string, TokenValue>>): string | null {
  const accent = colorOf(tokens, "color.accent.secondary");
  const text = colorOf(tokens, "color.text.primary");
  const surfaces = SURFACES.flatMap((name) => {
    const color = colorOf(tokens, name);
    return color ? [color] : [];
  });
  if (!accent || !text || surfaces.length === 0) return null;
  if (worstRatio(accent, surfaces) >= HIGH_CONTRAST_GRAPHIC_RATIO) return null;
  const raised = raiseContrast(accent, [text], HIGH_CONTRAST_TEXT_RATIO);
  return raised ? formatHexColor(raised) : null;
}

/**
 * The accents are drawn as text on the canvas, not only as rules and borders, so on that surface they reach the
 * text ratio. They keep the boundary ratio on every other surface because raising moves them toward the extreme
 * that already contrasts more.
 */
const ACCENT_TEXT = {
  foregrounds: ["color.accent.primary", "color.accent.tertiary"],
  background: "color.surface.canvas",
} as const;

/** The text drawn on the secondary accent fill must reach the enhanced text ratio on that fill. */
function textOnSecondaryFor(tokens: Readonly<Record<string, TokenValue>>): string | null {
  const text = colorOf(tokens, "color.accent.onSecondary");
  const fill = colorOf(tokens, "color.accent.secondary");
  if (!text || !fill) return null;
  const raised = raiseContrast(text, [fill], HIGH_CONTRAST_TEXT_RATIO);
  return raised ? formatHexColor(raised) : null;
}

/** Derives high-contrast colors from the resolved tokens; colors that already comply are untouched. */
export function applyHighContrast(
  tokens: Readonly<Record<string, TokenValue>>,
): Record<string, TokenValue> {
  const result: Record<string, TokenValue> = { ...tokens };
  for (const rule of RULES) {
    const backgrounds = rule.backgrounds.flatMap((name) => {
      const color = colorOf(tokens, name);
      return color ? [color] : [];
    });
    if (backgrounds.length === 0) continue;
    for (const name of rule.foregrounds) {
      const color = colorOf(tokens, name);
      if (!color) continue;
      const raised = raiseContrast(color, backgrounds, rule.minRatio);
      if (raised) result[name] = formatHexColor(raised);
    }
  }
  const canvas = colorOf(tokens, ACCENT_TEXT.background);
  for (const name of ACCENT_TEXT.foregrounds) {
    const color = colorOf(result, name);
    const raised = color && canvas ? raiseContrast(color, [canvas], HIGH_CONTRAST_TEXT_RATIO) : null;
    if (raised) result[name] = formatHexColor(raised);
  }
  const secondary = secondaryAccentFor(result);
  if (secondary !== null) result["color.accent.secondary"] = secondary;
  const onSecondary = textOnSecondaryFor(result);
  if (onSecondary !== null) result["color.accent.onSecondary"] = onSecondary;
  return result;
}
