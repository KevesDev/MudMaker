/** Reads the stylesheet and source text only: it shows what is declared, not what is drawn. */
import { describe, expect, it } from "vitest";
import stylesheet from "./home.css?raw";
import interfaceStylesheet from "../ui/ui.css?raw";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager, ThemeSchema } from "../theme";
import { stringToken, wcagRatio } from "../theme/fixtures";
import { FORBIDDEN_STYLE_PATTERNS } from "../ui/testSupport";

const sources = import.meta.glob("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
/** Shipped sources only; tests and their support describe forbidden patterns and would match themselves. */
const shipped: (readonly [string, string])[] = [
  ...Object.entries(sources).filter(([path]) => !path.includes(".test.") && !path.includes("TestSupport")),
  ["./home.css", stylesheet],
];

describe("home source has no literal styling or timing", () => {
  it("scans the real files", () => {
    expect(shipped.length).toBeGreaterThan(8);
    expect(stylesheet.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN_STYLE_PATTERNS)("finds no %s in the shipped files", (_name, pattern) => {
    expect(shipped.filter(([, text]) => pattern.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("gives no home component an activation or key handler, because the shared input manager owns them all", () => {
    const handler = /\bon(?:Click|DoubleClick|KeyDown|KeyUp|KeyPress|Pointer\w*|Mouse\w*|Touch\w*|Press\w*|Drag\w*|Wheel|Submit)\b|\baddEventListener\b/;
    expect(shipped.some(([path]) => path.endsWith(".tsx"))).toBe(true);
    expect(handler.test("<button onClick={retry}>")).toBe(true);
    expect(shipped.filter(([path, text]) => path.endsWith(".tsx") && handler.test(text)).map(([path]) => path)).toEqual([]);
  });
});

/** WCAG 2.2 minimums, as the theme presets contract states them: 4.5:1 for text, 3:1 for borders and the focus ring, 1.1:1 for quiet borders. */
const TEXT = 4.5;
const GRAPHIC = 3;
const SUBTLE_BORDER = 1.1;
const screenStyles = `${stylesheet}\n${interfaceStylesheet}`;

function colorTokens(): string[] {
  return [...new Set([...screenStyles.matchAll(/var\(--(color-[A-Za-z0-9-]+)\)/g)].map((match) => (match[1] ?? "").replaceAll("-", ".")))];
}

interface Pair {
  readonly foreground: string;
  readonly background: string;
  readonly minimum: number;
}

/** Every foreground the screen draws against every surface and fill it can sit on. A color token without a rule fails the test. */
function pairsFor(tokens: readonly string[]): Pair[] {
  // The scrim only dims the page behind a dialog, and no text is drawn on it.
  const surfaces = tokens.filter((token) => token.startsWith("color.surface.") && token !== "color.surface.scrim");
  const fills = tokens.filter((token) => /^color\.interaction\.(hover|pressed|selection)$/.test(token));
  const pairs: Pair[] = [];
  for (const token of tokens) {
    if (surfaces.includes(token) || token === "color.surface.scrim") continue;
    if (fills.includes(token)) {
      pairs.push({ foreground: "color.text.primary", background: token, minimum: TEXT });
    } else if (/^color\.(text|status)\./.test(token)) {
      for (const surface of surfaces) pairs.push({ foreground: token, background: surface, minimum: TEXT });
    } else if (token === "color.border.subtle") {
      for (const surface of surfaces) pairs.push({ foreground: token, background: surface, minimum: SUBTLE_BORDER });
    } else if (/^color\.border\.|^color\.interaction\.focus$/.test(token)) {
      for (const surface of surfaces) pairs.push({ foreground: token, background: surface, minimum: GRAPHIC });
    } else {
      throw new Error(`The screen uses ${token}, which has no contrast rule in this test.`);
    }
  }
  return pairs;
}

function violations(tokens: Readonly<Record<string, string | number | boolean>>, pairs: readonly Pair[]): string[] {
  return pairs.flatMap(({ foreground, background, minimum }) => {
    const ratio = wcagRatio(stringToken(tokens, foreground), stringToken(tokens, background));
    return ratio < minimum ? [`${foreground} on ${background} is ${ratio.toFixed(2)}, below ${minimum}`] : [];
  });
}

describe("the home screen colors", () => {
  const used = colorTokens();
  const pairs = pairsFor(used);

  it("uses text, status, border, focus, fill and surface colors, so the checks below have something to judge", () => {
    expect(used.some((token) => token.startsWith("color.text."))).toBe(true);
    expect(used.some((token) => token.startsWith("color.status."))).toBe(true);
    expect(used.some((token) => token.startsWith("color.border."))).toBe(true);
    expect(used).toContain("color.interaction.focus");
    expect(used.some((token) => token.startsWith("color.surface."))).toBe(true);
    expect(pairs.length).toBeGreaterThan(used.length);
  });

  it("reads only theme tokens that the home scope defines under every built-in preset", () => {
    const manager = new ThemeManager(themeDefaults);
    const referenced = [...new Set([...screenStyles.matchAll(/var\(--([A-Za-z0-9-]+)\)/g)].map((match) => (match[1] ?? "").replaceAll("-", ".")))];
    const missing: string[] = [];
    for (const preset of manager.listPresets()) {
      expect(manager.selectPreset("home", preset.id).ok).toBe(true);
      const tokens = manager.getSnapshot("home").tokens;
      for (const token of referenced) {
        if (ThemeSchema.describeToken(token) === undefined || tokens[token] === undefined) missing.push(`${preset.id}: ${token}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("meets the contract contrast floors under every built-in preset", () => {
    const manager = new ThemeManager(themeDefaults);
    expect(manager.listPresets().length).toBeGreaterThan(1);
    for (const preset of manager.listPresets()) {
      expect(manager.selectPreset("home", preset.id).ok).toBe(true);
      expect(violations(manager.getSnapshot("home").tokens, pairs), preset.id).toEqual([]);
    }
  });

  it("would report a color that fails its floor", () => {
    const manager = new ThemeManager(themeDefaults);
    const surface = stringToken(manager.getSnapshot("home").tokens, "color.surface.app");
    const poor = { ...manager.getSnapshot("home").tokens, "color.text.primary": surface };
    expect(violations(poor, pairs).length).toBeGreaterThan(0);
  });
});
