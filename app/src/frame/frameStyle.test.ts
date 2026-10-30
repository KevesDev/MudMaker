/**
 * Reads the stylesheet and source text only: it shows what is declared, not what is drawn. It cannot measure where an
 * error or help text lands at the 480 pixel minimum window or at 200 percent text scale; that is checked by hand.
 */
import { describe, expect, it } from "vitest";
import stylesheet from "./frame.css?raw";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { SCOPE_IDS, ThemeManager, ThemeSchema } from "../theme";
import { FORBIDDEN_STYLE_PATTERNS } from "../ui/testSupport";

const sources = import.meta.glob("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
/** Shipped sources only; tests and their support describe forbidden patterns and would match themselves. */
const shipped: (readonly [string, string])[] = [
  ...Object.entries(sources).filter(([path]) => !path.includes(".test.") && !path.includes("TestSupport")),
  ["./frame.css", stylesheet],
];

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...stylesheet.matchAll(new RegExp(`(?:^|\\}|\\*/)\\s*${escaped}\\s*\\{([^}]*)\\}`, "g"))];
  if (matches.length === 0) throw new Error(`No rule for ${selector}`);
  return matches.map((match) => match[1] ?? "").join("\n");
}

describe("frame source has no literal styling or timing", () => {
  it("scans the real files", () => {
    expect(shipped.length).toBeGreaterThan(6);
    expect(stylesheet.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN_STYLE_PATTERNS)("finds no %s in the shipped files", (_name, pattern) => {
    expect(shipped.filter(([, text]) => pattern.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("gives no frame component an activation, key or pointer handler, because the shared input manager and the shell own them", () => {
    const handler = /\bon(?:Click|DoubleClick|KeyDown|KeyUp|KeyPress|Pointer\w*|Mouse\w*|Touch\w*|Press\w*|Drag\w*|Wheel|Submit)\b|\baddEventListener\b/;
    expect(shipped.some(([path]) => path.endsWith(".tsx"))).toBe(true);
    expect(handler.test("<button onDoubleClick={toggle}>")).toBe(true);
    expect(shipped.filter(([path, text]) => path.endsWith(".tsx") && handler.test(text)).map(([path]) => path)).toEqual([]);
  });
});

describe("frame stylesheet", () => {
  it("reads only theme tokens that every scope defines under every built-in preset", () => {
    const referenced = [...new Set([...stylesheet.matchAll(/var\(--([A-Za-z0-9-]+)\)/g)].map((match) => (match[1] ?? "").replaceAll("-", ".")))];
    expect(referenced).toEqual(expect.arrayContaining(["color.border.frame", "layout.frameRowHeight", "font.family.code", "color.interaction.focus"]));
    const manager = new ThemeManager(themeDefaults);
    const missing: string[] = [];
    for (const preset of manager.listPresets()) {
      for (const scope of SCOPE_IDS) {
        expect(manager.selectPreset(scope, preset.id).ok).toBe(true);
        const tokens = manager.getSnapshot(scope).tokens;
        for (const token of referenced) {
          if (ThemeSchema.describeToken(token) === undefined || tokens[token] === undefined) missing.push(`${scope}/${preset.id}: ${token}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("surrounds the window with a thin continuous border in the frame border color, not a card", () => {
    const body = ruleBody(".app-window");
    expect(body).toMatch(/border:\s*var\(--shape-borderWidth\)\s+solid\s+var\(--color-border-frame\)/);
    expect(body).not.toMatch(/border-radius|box-shadow|dashed|dotted/);
  });

  it("takes the row height, font family and surface from tokens, and lets the row grow rather than clip larger touch targets", () => {
    const body = ruleBody(".app-frame");
    expect(body).toContain("min-height: var(--layout-frameRowHeight)");
    expect(body).toContain("font-family: var(--font-family-code)");
    expect(body).toContain("background: var(--color-surface-toolbar)");
    expect(body).not.toMatch(/(?<![-\w])height\s*:/);
    expect(ruleBody(".app-frame .ui-control")).toContain("font-family: var(--font-family-code)");
  });

  it("keeps the pointer and touch hit sizes of the shared control, by never setting a size on the frame's controls", () => {
    const controlRules = [...stylesheet.matchAll(/\.app-frame[^{]*\.ui-control[^{]*\{([^}]*)\}/g)].map((match) => match[1] ?? "").join("\n");
    expect(controlRules.length).toBeGreaterThan(0);
    expect(controlRules).not.toMatch(/(?:^|[\s;])(?:min-|max-)?(?:width|height)\s*:/);
    expect(controlRules).not.toMatch(/\bpadding\s*:/);
  });

  it("draws the focus ring from the focus color and outline width tokens and does not remove it", () => {
    const body = ruleBody(".app-frame .ui-control:focus-visible");
    expect(body).toContain("var(--color-interaction-focus)");
    expect(body).toContain("var(--interaction-focusOutlineWidth)");
    expect(stylesheet).not.toMatch(/outline\s*:\s*(?:none|0)/);
  });

  it("lays out the end controls against the window edge and opens their help toward the inside", () => {
    expect(ruleBody(".app-frame-controls")).toContain("margin-inline-start: auto");
    const tooltip = ruleBody(".app-frame-controls .ui-tooltip");
    expect(tooltip).toContain("right: 0");
    expect(tooltip).toContain("left: auto");
  });

  it("anchors the state text and help of the frame's controls to the row's right edge, out of its flow and no wider than the row, so they never grow it or leave the window", () => {
    expect(ruleBody(".app-frame")).toContain("position: relative");
    expect(ruleBody(".app-frame-controls .ui-anchor")).toContain("position: static");
    const body = ruleBody([".app-frame-controls .ui-state-text", ".app-frame-end .ui-state-text"].join(", "));
    expect(body).toContain("position: absolute");
    expect(body).toMatch(/right:\s*0/);
    expect(body).toContain("max-width: min(var(--layout-contentMaxWidth), 100%)");
    expect(ruleBody(".app-frame-controls .ui-tooltip")).toContain("max-width: min(var(--layout-contentMaxWidth), 100%)");
    expect(body).toMatch(/top:\s*100%/);
    expect(body).toContain("z-index: var(--layer-popup)");
    expect(body).toContain("var(--color-surface-overlay)");
  });

  it("opens the end menus toward the inside of the window, since they sit against its edge", () => {
    const body = ruleBody(".app-frame-end .ui-menu-popup");
    expect(body).toMatch(/right:\s*0/);
    expect(body).toContain("left: auto");
  });

  it("limits every rule that moves an anchor, state text, tooltip or menu to the window controls and the end menus, so nothing leaks to the middle slot", () => {
    const selectors = [...stylesheet.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{/g)].map((match) => (match[1] ?? "").trim());
    const touching = selectors.filter((selector) => /ui-anchor|ui-state-text|ui-tooltip|ui-menu/.test(selector));
    expect(touching.length).toBeGreaterThan(2);
    expect(touching.filter((selector) => !selector.startsWith(".app-frame-controls ") && !selector.startsWith(".app-frame-end "))).toEqual([]);
  });

  it("scrolls the screen below the frame inside the window, so the frame stays in place", () => {
    expect(ruleBody(".app-window")).toContain("height: 100vh");
    const content = ruleBody(".app-window-content");
    expect(content).toContain("overflow: auto");
    expect(content).toContain("min-height: 0");
  });
});
