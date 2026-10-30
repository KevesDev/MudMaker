/** Reads the stylesheet and source text only: it shows what is declared, not what is drawn. */
import { describe, expect, it } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { SCOPE_IDS, ThemeManager, ThemeSchema } from "../theme";
import { FORBIDDEN_STYLE_PATTERNS } from "../ui/testSupport";
import stylesheet from "./editor.css?raw";

const sources = import.meta.glob("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
/** Shipped sources only; tests describe forbidden patterns and would match themselves. */
const shipped: (readonly [string, string])[] = [
  ...Object.entries(sources).filter(([path]) => !path.includes(".test.") && !path.includes("TestSupport")),
  ["editor.css", stylesheet],
];
const components = shipped.filter(([path]) => path.endsWith(".tsx"));

describe("editor source has no literal styling or timing", () => {
  it("scans the real files", () => {
    expect(components.length).toBeGreaterThanOrEqual(5);
    expect(stylesheet.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN_STYLE_PATTERNS)("finds no %s in the shipped files", (_name, pattern) => {
    expect(shipped.filter(([, text]) => pattern.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("gives no component an activation, key or pointer handler, because the shared input manager owns them", () => {
    const handler = /\bon(?:Click|DoubleClick|KeyDown|KeyUp|KeyPress|Pointer\w*|Mouse\w*|Touch\w*|Press\w*|Drag\w*|Wheel|Submit)\b|\baddEventListener\b/;
    expect(handler.test("<button onClick={go}>")).toBe(true);
    expect(components.filter(([, text]) => handler.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("puts no tooltip on an ordinary editor control", () => {
    expect(shipped.filter(([, text]) => /\bTooltip\b|\btitle=\{/.test(text)).map(([path]) => path)).toEqual([]);
  });
});

describe("the editor stylesheet", () => {
  it("reads only theme tokens that every scope defines under every built-in preset", () => {
    const referenced = [...new Set([...stylesheet.matchAll(/var\(--([A-Za-z0-9-]+)\)/g)].map((match) => (match[1] ?? "").replaceAll("-", ".")))];
    expect(referenced).toEqual(expect.arrayContaining(["layout.panelMinSize", "layout.panelDefaultSize", "layout.tabMaxWidth", "color.surface.inspector", "color.interaction.focus"]));
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

  it("gives every interactive part a visible focus ring, lets the tab strip scroll, and draws the plain panels without cards", () => {
    for (const selector of [".editor-separator:focus-visible", ".editor-tab:focus-visible", ".editor-drawer:focus-visible"]) {
      expect(stylesheet).toMatch(new RegExp(`${selector.replace(/[.:]/g, "\\$&")}[^{]*\\{[^}]*var\\(--color-interaction-focus\\)`));
    }
    expect(stylesheet).not.toMatch(/outline\s*:\s*(?:none|0)/);
    expect(stylesheet).toMatch(/\.editor-tabs\s*\{[^}]*overflow-x:\s*auto/);
    expect(stylesheet).not.toMatch(/box-shadow|border-radius|dashed|dotted/);
  });

  it("keeps both split regions at least the least panel size wide", () => {
    expect(stylesheet).toMatch(/\.editor-split-primary\s*\{[^}]*min-width:\s*var\(--layout-panelMinSize\)/);
    expect(stylesheet).toMatch(/\.editor-split-secondary\s*\{[^}]*min-width:\s*var\(--layout-panelMinSize\)/);
  });
});
