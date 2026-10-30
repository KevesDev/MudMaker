/** Reads the stylesheet and source text only: it shows what is declared, not what is drawn. */
import { describe, expect, it } from "vitest";
import stylesheet from "./home.css?raw";
import interfaceStylesheet from "../ui/ui.css?raw";
import frameStylesheet from "../frame/frame.css?raw";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import tauriConfig from "../../src-tauri/tauri.conf.json";
import { ThemeManager, ThemeSchema } from "../theme";
import { fixtureBaseTokens, numberToken, stringToken, wcagRatio } from "../theme/fixtures";
import { FORBIDDEN_STYLE_PATTERNS } from "../ui/testSupport";
import { ACTION_ACCENTS, WORKSPACE_ACTIONS } from "./homeLayout";
import { WORDMARK_ROWS, WORDMARK_STEP_PROPERTY } from "./wordmark";

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
/** The home screen renders inside the window frame, so the frame's colors are judged with it. */
const screenStyles = `${stylesheet}\n${interfaceStylesheet}\n${frameStylesheet}`;

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
    } else if (token === "color.accent.primary" || token === "color.accent.tertiary") {
      // Drawn as text on the stage, which is the canvas.
      pairs.push({ foreground: token, background: "color.surface.canvas", minimum: TEXT });
    } else if (token === "color.accent.secondary") {
      // A fill; its text is judged against it by the accent rules below.
    } else if (token === "color.accent.onSecondary") {
      pairs.push({ foreground: token, background: "color.accent.secondary", minimum: TEXT });
    } else if (token === "color.border.subtle") {
      for (const surface of surfaces) pairs.push({ foreground: token, background: surface, minimum: SUBTLE_BORDER });
    } else if (token === "color.border.frame") {
      // The window border sits between the page and the frame row, never on a panel or an overlay.
      for (const surface of ["color.surface.app", "color.surface.toolbar"]) pairs.push({ foreground: token, background: surface, minimum: GRAPHIC });
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
    expect(used).toContain("color.border.frame");
    expect(used.some((token) => token.startsWith("color.surface."))).toBe(true);
    expect(pairs.length).toBeGreaterThan(used.length);
  });

  it("reads only theme tokens that the home scope defines under every built-in preset", () => {
    const manager = new ThemeManager(themeDefaults);
    const own = new Set([...stylesheet.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)].map((match) => match[1]).concat(WORDMARK_STEP_PROPERTY));
    const referenced = [
      ...new Set(
        [...screenStyles.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)]
          .map((match) => match[1] ?? "")
          .filter((name) => !own.has(name))
          .map((name) => name.slice(2).replaceAll("-", ".")),
      ),
    ];
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

/** The declarations of the rule whose selector list is exactly this one, so a missing or renamed rule fails loudly. */
function ruleBody(selector: string, css: string = stylesheet): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\n/g, "\\s*");
  const found = new RegExp(`(?:^|\\}|\\*/)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css.replace(/\r\n/g, "\n"));
  if (found === null) throw new Error(`home.css has no rule for ${selector}`);
  return found[1] ?? "";
}

/** The token a `var(--...)` reference names for a property, in the dotted form the theme uses. */
const tokenIn = (declarations: string, property: string): string => {
  const found = new RegExp(`${property}\\s*:\\s*var\\(--([A-Za-z0-9-]+)\\)`).exec(declarations);
  if (found === null) throw new Error(`No ${property} token in "${declarations.trim()}"`);
  return (found[1] ?? "").replaceAll("-", ".");
};

/** Evaluates a length made of numbers, `var()` of tokens or own properties, `+`, `*` and `calc()`, in pixels. Anything else stops the test. */
function lengthOf(expression: string, own: Readonly<Record<string, string>>): number {
  const base = fixtureBaseTokens("editor");
  let text = expression;
  while (/var\((--[A-Za-z0-9-]+)\)/.test(text)) {
    text = text.replace(/var\((--[A-Za-z0-9-]+)\)/, (_match, name: string) => `(${own[name] ?? String(numberToken(base, name.slice(2).replaceAll("-", ".")))})`);
  }
  text = text.replaceAll("calc", "");
  if (text.replace(/[\d.+*()\s]/g, "") !== "") throw new Error(`Cannot evaluate "${expression}".`);
  const pieces = text.match(/\d+(?:\.\d+)?|[()+*]/g) ?? [];
  let position = 0;
  const factor = (): number => {
    const piece = pieces[position++];
    if (piece === "(") {
      const inner = sum();
      position += 1;
      return inner;
    }
    return Number(piece);
  };
  const product = (): number => {
    let value = factor();
    while (pieces[position] === "*") {
      position += 1;
      value *= factor();
    }
    return value;
  };
  function sum(): number {
    let value = product();
    while (pieces[position] === "+") {
      position += 1;
      value += product();
    }
    return value;
  }
  return sum();
}

describe("the action row accents", () => {
  const accentRule = (accent: string): string => ruleBody(`.home-action[data-accent="${accent}"]`);
  const PARTS = ["--action-fill", "--action-text", "--action-edge"] as const;
  /** The label of each action against the fill it actually sits on, read from the stylesheet. */
  const actionPairs = (minimum: number): Pair[] =>
    ACTION_ACCENTS.map((accent) => ({ foreground: tokenIn(accentRule(accent), "--action-text"), background: tokenIn(accentRule(accent), "--action-fill"), minimum }));
  /** The other accent and secondary text the screen draws on the canvas. */
  const canvasPairs = (minimum: number): Pair[] =>
    ["color.accent.primary", "color.accent.tertiary", "color.text.secondary"].map((foreground) => ({ foreground, background: "color.surface.canvas", minimum }));
  const HIGH_CONTRAST_TEXT = 7;

  it("has one rule for each accent the layout names, and the layout gives every entry a different one", () => {
    const inCss = [...new Set([...stylesheet.matchAll(/\[data-accent="([a-z]+)"\]/g)].map((match) => match[1]))].sort();
    expect(inCss).toEqual([...ACTION_ACCENTS].sort());
    expect(WORKSPACE_ACTIONS.every((action) => ACTION_ACCENTS.includes(action.accent))).toBe(true);
    expect(new Set(WORKSPACE_ACTIONS.map((action) => action.accent)).size).toBe(WORKSPACE_ACTIONS.length);
  });

  it("draws Create and Host as accent text and border on the canvas, and Play as the secondary fill under its own text color", () => {
    expect(PARTS.map((part) => tokenIn(accentRule("primary"), part))).toEqual(["color.surface.canvas", "color.accent.primary", "color.accent.primary"]);
    expect(PARTS.map((part) => tokenIn(accentRule("secondary"), part))).toEqual(["color.accent.secondary", "color.accent.onSecondary", "color.accent.secondary"]);
    expect(PARTS.map((part) => tokenIn(accentRule("tertiary"), part))).toEqual(["color.surface.canvas", "color.accent.tertiary", "color.accent.tertiary"]);
  });

  it("keeps every label readable on the fill it actually sits on, in every preset", () => {
    const manager = new ThemeManager(themeDefaults);
    let checked = 0;
    for (const preset of manager.listPresets()) {
      expect(manager.selectPreset("home", preset.id).ok).toBe(true);
      expect(violations(manager.getSnapshot("home").tokens, [...actionPairs(TEXT), ...canvasPairs(TEXT)]), preset.id).toEqual([]);
      checked += 1;
    }
    expect(checked).toBe(manager.listPresets().length);
  });

  it("keeps them at the enhanced ratio in high contrast, in every preset", () => {
    const manager = new ThemeManager(themeDefaults);
    for (const preset of manager.listPresets()) {
      expect(manager.selectPreset("home", preset.id).ok).toBe(true);
      expect(manager.setAccessibility("home", { textScale: 1, contrast: "high", reducedMotion: false }).ok).toBe(true);
      expect(violations(manager.getSnapshot("home").tokens, [...actionPairs(HIGH_CONTRAST_TEXT), ...canvasPairs(HIGH_CONTRAST_TEXT)]), preset.id).toEqual([]);
    }
  });

  it("reports a label that cannot be read on its fill, by running the same check on a bad color", () => {
    const tokens = new ThemeManager(themeDefaults).getSnapshot("home").tokens;
    const pairs = actionPairs(TEXT);
    expect(violations(tokens, pairs)).toEqual([]);
    const secondary = pairs.find((pair) => pair.background === "color.accent.secondary");
    expect(secondary).toBeDefined();
    const bad = { ...tokens, [secondary?.foreground ?? ""]: stringToken(tokens, secondary?.background ?? "") };
    expect(violations(bad, pairs)).toEqual([expect.stringContaining("color.accent.onSecondary on color.accent.secondary")]);
  });

  it("underlines on hover and on press, and sits the control lower only on press, never changing the fill", () => {
    const states = ruleBody(".home-action .ui-button:hover,\n.home-action .ui-button:active,\n.home-footer-actions > .ui-anchor > .ui-button:hover,\n.home-footer-actions > .ui-anchor > .ui-button:active");
    expect(states).toMatch(/text-decoration:\s*underline/);
    expect(states).not.toMatch(/transform|background/);
    const pressed = ruleBody(".home-action .ui-button:active,\n.home-footer-actions > .ui-anchor > .ui-button:active");
    expect(pressed).toMatch(/transform:\s*translateY\(var\(--shape-borderWidth\)\)/);
    expect(ruleBody(".home-action .ui-button,\n.home-action .ui-button:hover,\n.home-action .ui-button:active")).toMatch(/background:\s*var\(--action-fill\)/);
    expect(ruleBody(".home-footer-actions > .ui-anchor > .ui-button,\n.home-footer-actions > .ui-anchor > .ui-button:hover,\n.home-footer-actions > .ui-anchor > .ui-button:active")).toMatch(/background:\s*var\(--color-surface-canvas\)/);
  });
});

describe("the layout rules", () => {
  const base = fixtureBaseTokens("editor");
  const token = (name: string): number => numberToken(base, name);
  /** The tokens a calc() or var() expression names, as a lookup the evaluator below uses. */
  const valueOf = (name: string): number => token(name.slice(2).replaceAll("-", "."));
  const minimumWindow = tauriConfig.app.windows[0]?.minWidth ?? 0;
  const defaultWindow = tauriConfig.app.windows[0]?.width ?? 0;
  /** The width of the action row at a window width: the window less its border and the stage padding on both sides. */
  const rowAt = (window: number): number => window - 2 * token("shape.borderWidth") - 2 * token("spacing.stack");

  /** Evaluates `calc(100% * var(--token))` against a parent width, the only calculation the divider rules use. */
  function percentOfParent(declaration: string, parent: number): number {
    const found = /calc\(100% \* var\((--[A-Za-z0-9-]+)\)\)/.exec(declaration);
    if (found === null) throw new Error(`Not a fraction of the parent: ${declaration}`);
    return parent * valueOf(found[1] ?? "");
  }

  it("divides the free height by token shares of a zero basis, so the banner sits at the same place whatever is below it", () => {
    expect(ruleBody(".home")).toMatch(/height:\s*100%/);
    expect(ruleBody(".home-above")).toMatch(/flex:\s*var\(--layout-share-above\) 1 0%/);
    expect(ruleBody(".home-below")).toMatch(/flex:\s*var\(--layout-share-below\) 1 0%/);
    expect(ruleBody(".home-below")).toMatch(/min-height:\s*0/);
    expect(ruleBody(".home-header")).toMatch(/flex:\s*none/);
  });

  it("takes the shares from the mockup: 135px above the banner and 610px from its foot to the window edge", () => {
    /** Measured on the mockup, in pixels. */
    const MOCKUP = { above: 135, belowBanner: 610 };
    expect(token("layout.share.above")).toBe(MOCKUP.above);
    expect(token("layout.share.below")).toBe(MOCKUP.belowBanner);
  });

  it("puts the banner at the mockup's proportion of the window height at two window heights", () => {
    // The banner is 8 rows at its default step; the version reserve is two caption lines and a gap. Both come from data and tokens.
    const rows = WORDMARK_ROWS.length;
    const banner = rows * token("font.size.wordmarkStep") * token("wordmark.defaultStep") * token("font.lineHeight.wordmark");
    const reserve = 2 * token("font.size.caption") * token("font.lineHeight.body") + token("spacing.row");
    const above = token("layout.share.above");
    const below = token("layout.share.below");
    const topOffset = (area: number): number => token("spacing.stack") + (above / (above + below)) * (area - 2 * token("spacing.stack") - banner - reserve);
    const MOCKUP_FRACTION = 135 / 875;
    for (const area of [680, 1000]) {
      expect(Math.abs(topOffset(area) / area - MOCKUP_FRACTION), `${area} high`).toBeLessThan(0.03);
    }
    expect(topOffset(1000)).toBeGreaterThan(topOffset(680));
  });

  it("keeps the banner and the block within the window: they follow it up to the token maximum and never force a width", () => {
    const content = ruleBody(".home-header,\n.home-below");
    expect(content).toMatch(/width:\s*100%/);
    expect(content).toMatch(/max-width:\s*var\(--layout-splashMaxWidth\)/);
    expect(content).toMatch(/min-width:\s*0/);
    const forcedWidth = /overflow-x|(?<![-\w])min-width:[ \t]*(?![ \t]|0\b)|(?<![-\w])width:[ \t]*(?![ \t]|100%|calc\()/;
    expect(forcedWidth.test("width: var(--layout-contentMaxWidth);")).toBe(true);
    expect(forcedWidth.test("min-width: var(--interaction-pointerHitSize);")).toBe(true);
    expect(stylesheet).not.toMatch(forcedWidth);
  });

  it("takes the widest content from half the default window width", () => {
    expect(defaultWindow).toBeGreaterThan(0);
    expect(token("layout.splashMaxWidth")).toBe(defaultWindow / 2);
  });

  /**
   * The height the real rules give the header, and the distance from the banner's foot to what follows it, for a
   * stylesheet and a placement of the version. Only lengths of numbers, tokens, `+`, `*` and `calc()` are evaluated.
   */
  function headerLayout(css: string, placement: "none" | "beside" | "below"): { readonly height: number; readonly footToNext: number } {
    const rule = (selector: string): string => ruleBody(selector, css);
    const declared = (body: string, property: string): string => {
      const found = new RegExp(`(?<![-\\w])${property}:\\s*([^;]+);`).exec(body);
      if (found === null) throw new Error(`No ${property} in "${body.trim()}"`);
      return (found[1] ?? "").trim();
    };
    const box = rule(".home-wordmark-box");
    const own: Record<string, string> = { "--wordmark-step": String(token("wordmark.defaultStep")) };
    for (const match of box.matchAll(/(--[A-Za-z0-9-]+):\s*([^;]+);/g)) own[match[1] ?? ""] = match[2] ?? "";
    const length = (expression: string): number => lengthOf(expression, own);
    const art = rule(".home-wordmark-art");
    const banner = WORDMARK_ROWS.length * length(declared(art, "font-size")) * length(declared(art, "line-height"));
    const reserve = length(declared(box, "padding-block-end"));
    const captionLine = token("font.size.caption") * token("font.lineHeight.body");
    let inFlow = 0;
    if (placement !== "none") {
      const version = `${rule(".home-version,\n.home-version-probe")}\n${rule(`.home-version[data-placement="${placement}"]`)}`;
      // Beside the banner the version is the two lines of the copy; below it, the one compact string.
      const lines = placement === "below" ? 1 : 2;
      inFlow = /position:\s*absolute/.test(version) ? 0 : lines * captionLine;
    }
    const below = rule(".home-below");
    const padding = /padding-top:\s*([^;]+);/.exec(below);
    const next = padding === null ? 0 : length(padding[1] ?? "");
    return { height: banner + reserve + inFlow, footToNext: reserve + inFlow + next };
  }

  it("gives the header the same height, and the banner the same distance to what follows, with no version, beside and below, computed from the real rules", () => {
    const layouts = (["none", "beside", "below"] as const).map((placement) => headerLayout(stylesheet, placement));
    expect(layouts[1]).toEqual(layouts[0]);
    expect(layouts[2]).toEqual(layouts[0]);
    expect(layouts[0]?.height).toBeGreaterThan(0);
  });

  it("would report a version left in the flow, by running the same computation on a stylesheet that does it", () => {
    const inFlow = stylesheet.replace(/(\.home-version,\s*\.home-version-probe\s*\{\s*)position:\s*absolute;/, "$1position: static;");
    expect(inFlow).not.toBe(stylesheet);
    expect(headerLayout(inFlow, "beside").height).toBeGreaterThan(headerLayout(inFlow, "none").height);
    expect(headerLayout(inFlow, "below").height).toBeGreaterThan(headerLayout(inFlow, "none").height);
    const padded = stylesheet.replace(/\r\n/g, "\n").replace("  min-height: 0;\n}", "  min-height: 0;\n  padding-top: var(--spacing-stack);\n}");
    expect(padded).not.toBe(stylesheet.replace(/\r\n/g, "\n"));
    expect(headerLayout(padded, "none").footToNext).toBeGreaterThan(headerLayout(stylesheet, "none").footToNext);
  });

  it("reserves one caption line and a small gap under the banner, which is the whole distance to the divider row", () => {
    const captionLine = token("font.size.caption") * token("font.lineHeight.body");
    expect(headerLayout(stylesheet, "none").footToNext).toBe(captionLine + token("spacing.row"));
    expect(ruleBody(".home-wordmark-box")).toMatch(/padding-block-end:\s*var\(--version-reserve\)/);
    expect(ruleBody('.home-version[data-placement="below"]')).toMatch(/bottom:\s*0/);
    expect(ruleBody('.home-version[data-placement="beside"]')).toMatch(/bottom:\s*var\(--version-reserve\)/);
  });

  /** The height of a divider row: the body font size at the line height the stylesheet names for it, with tokens optionally overridden. */
  function dividerRowHeight(css: string, overrides: Readonly<Record<string, number>> = {}): number {
    const named = /line-height:\s*var\(--([A-Za-z0-9-]+)\)/.exec(ruleBody(".home-ornament", css))?.[1] ?? "";
    const name = named.replaceAll("-", ".");
    return token("font.size.body") * (overrides[name] ?? token(name));
  }

  it("puts the divider line 36.5px under the banner's foot: the reserved row of 26px plus half the 21px divider row, at the body line height", () => {
    // The mockup has 29px; the difference is 7.5px, the price of the reserved row and the body-height divider row.
    expect(ruleBody(".home-ornament")).toMatch(/line-height:\s*var\(--font-lineHeight-body\)/);
    expect(dividerRowHeight(stylesheet)).toBe(21);
    expect(headerLayout(stylesheet, "none").footToNext + dividerRowHeight(stylesheet) / 2).toBe(36.5);
  });

  it("keeps both dividers where they are when the banner's line height is overridden", () => {
    const BANNER_LINE_HEIGHT = 2;
    expect(token("font.lineHeight.wordmark")).not.toBe(BANNER_LINE_HEIGHT);
    expect(dividerRowHeight(stylesheet, { "font.lineHeight.wordmark": BANNER_LINE_HEIGHT })).toBe(dividerRowHeight(stylesheet));
    // A divider that borrowed the banner's token would have moved.
    const borrowed = stylesheet.replace(/(\.home-ornament\s*\{[^}]*line-height:\s*var\(--font-lineHeight-)body/, "$1wordmark");
    expect(borrowed).not.toBe(stylesheet);
    expect(dividerRowHeight(borrowed, { "font.lineHeight.wordmark": BANNER_LINE_HEIGHT })).not.toBe(dividerRowHeight(borrowed));
  });

  it("draws no text of its own: the stylesheet generates no content and changes no case of the version", () => {
    expect(stylesheet).not.toMatch(/::before|::after|::first-letter|(?<![-\w])content:/);
    expect(/::after\s*\{\s*content:\s*", "/.test('a::after { content: ", " }')).toBe(true);
    expect(ruleBody('.home-version[data-placement="below"]')).not.toMatch(/text-transform/);
    expect(ruleBody('.home-version[data-placement="beside"],\n.home-version-probe')).toMatch(/margin-inline-start:\s*var\(--spacing-row\)/);
    expect(ruleBody(".home-version-probe")).toMatch(/pointer-events:\s*none/);
  });

  it("hangs the version outside the lower right corner of the banner, or in the reserve below it, right-aligned", () => {
    expect(ruleBody(".home-wordmark-box")).toMatch(/position:\s*relative/);
    const beside = ruleBody('.home-version[data-placement="beside"]');
    expect(beside).toMatch(/left:\s*100%/);
    const below = ruleBody('.home-version[data-placement="below"]');
    expect(below).toMatch(/right:\s*0/);
    expect(below).toMatch(/text-align:\s*right/);
    expect(ruleBody(".home-wordmark")).toMatch(/justify-content:\s*center/);
  });

  it("draws each divider as a fraction of the action row that is narrower than the row at every width, down to the minimum window", () => {
    expect(minimumWindow).toBeGreaterThan(0);
    for (const kind of ["wide", "narrow"] as const) {
      const declaration = ruleBody(`.home-ornament[data-width="${kind}"]`);
      for (const window of [minimumWindow, 600, defaultWindow]) {
        const row = Math.min(rowAt(window), token("layout.splashMaxWidth"));
        expect(percentOfParent(declaration, row), `${kind} at ${window}`).toBeLessThan(row);
        expect(percentOfParent(declaration, row), `${kind} at ${window}`).toBeGreaterThan(0);
      }
    }
    expect(token("layout.dividerRatio.wide")).toBeGreaterThan(token("layout.dividerRatio.narrow"));
    expect(() => percentOfParent("width: 100%;", 400)).toThrow();
  });

  it("takes the divider fractions from the mockup's measurements", () => {
    /** Measured on the mockup: the action row and its first and second dividers, in pixels. */
    const MOCKUP = { row: 805, first: 610, second: 471 };
    expect(token("layout.dividerRatio.wide")).toBeCloseTo(MOCKUP.first / MOCKUP.row, 2);
    expect(token("layout.dividerRatio.narrow")).toBeCloseTo(MOCKUP.second / MOCKUP.row, 2);
  });

  it("draws the loading bar at the width of the narrow divider, so it shows under the banner", () => {
    const bar = ruleBody(".home-below > .ui-progress");
    expect(percentOfParent(bar, 400)).toBe(400 * token("layout.dividerRatio.narrow"));
  });

  it("lays the entries out in equal parts of one line, each at least as wide as its own content, and stacks them from the measured flag with no width in the stylesheet", () => {
    expect(ruleBody(".home-actions")).toMatch(/display:\s*flex/);
    expect(ruleBody(".home-action")).toMatch(/flex:\s*1 1 0;/);
    expect(ruleBody(".home-action")).not.toMatch(/min-width/);
    expect(ruleBody(".home-action .ui-anchor")).not.toMatch(/min-width/);
    expect(ruleBody('.home-actions[data-narrow="true"]')).toMatch(/flex-direction:\s*column/);
    expect(ruleBody('.home-actions[data-narrow="true"] .home-action')).toMatch(/flex:\s*none/);
    expect(stylesheet).not.toMatch(/calc\(\(|layout-narrowWidth|layout-actionMinWidth/);
    expect(Object.keys(base)).not.toContain("layout.narrowWidth");
    expect(Object.keys(base)).not.toContain("layout.actionMinWidth");
  });

  it("reads the stage background and the code font from tokens", () => {
    expect(ruleBody(".home")).toMatch(/background:\s*var\(--color-surface-canvas\)/);
    expect(ruleBody(".home :is(.home-header, .home-below) *")).toMatch(/font-family:\s*var\(--font-family-code\)/);
  });

  it("no longer carries the page margin token, which nothing reads", () => {
    expect(Object.keys(base)).not.toContain("spacing.page");
    expect(screenStyles).not.toContain("spacing-page");
  });
});

describe("the banner", () => {
  it("is a whole number of wordmark units, read from the property the component sets, on touching rows", () => {
    expect(ruleBody(".home-wordmark-art")).toContain(`calc(var(--font-size-wordmarkStep) * var(${WORDMARK_STEP_PROPERTY}))`);
    expect(ruleBody(".home-wordmark-art")).toMatch(/line-height:\s*var\(--font-lineHeight-wordmark\)/);
    expect(numberToken(fixtureBaseTokens("editor"), "font.lineHeight.wordmark")).toBe(1);
  });

  it("closes the hairlines between blocks in both directions with copies of its own color offset by the seam token", () => {
    const shadow = /text-shadow:([^;]*);/.exec(ruleBody(".home-wordmark-art"))?.[1] ?? "";
    expect(shadow.split(",").map((part) => part.trim().replace(/\s+/g, " "))).toEqual(["var(--wordmark-seam) 0 0 currentcolor", "0 var(--wordmark-seam) 0 currentcolor"]);
    expect(numberToken(fixtureBaseTokens("editor"), "wordmark.seam")).toBeGreaterThan(0);
  });
});

describe("motion and focus", () => {
  const motion = (text: string): string[] => text.match(/(?:transition|animation)[^;{}]*;/g) ?? [];

  it("draws no animation or transition of its own, and the shared controls it uses take their durations from motion tokens", () => {
    expect(motion("transition: color 150ms;")).toHaveLength(1);
    expect(motion(stylesheet)).toEqual([]);
    const shared = motion(interfaceStylesheet);
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.every((declaration) => /var\(--motion-duration-[A-Za-z]+\)/.test(declaration))).toBe(true);
  });

  it("makes every motion token the screen reads resolve to the reduced duration when reduced motion is on", () => {
    const manager = new ThemeManager(themeDefaults);
    const used = [...new Set([...screenStyles.matchAll(/var\(--(motion-duration-[A-Za-z]+)\)/g)].map((match) => (match[1] ?? "").replaceAll("-", ".")))];
    expect(used.length).toBeGreaterThan(0);
    const before = manager.getSnapshot("home").tokens;
    expect(used.every((token) => Number(before[token]) > 0)).toBe(true);
    expect(manager.setAccessibility("home", { textScale: 1, contrast: "normal", reducedMotion: true }).ok).toBe(true);
    const after = manager.getSnapshot("home").tokens;
    expect(used.map((token) => after[token])).toEqual(used.map(() => after["motion.reducedDurationMs"]));
  });

  it("never removes the focus ring from a control of the screen", () => {
    expect(/outline\s*:\s*(?:none|0)/.test("outline: none;")).toBe(true);
    expect(stylesheet).not.toMatch(/outline\s*:\s*(?:none|0)/);
    expect(interfaceStylesheet).toMatch(/\.ui-control:focus-visible\s*\{[^}]*outline:\s*var\(--interaction-focusOutlineWidth\) solid var\(--color-interaction-focus\)/);
  });
});
