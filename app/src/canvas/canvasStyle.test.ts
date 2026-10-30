/** Reads the stylesheet and source text only: it shows what is declared, not what is drawn. */
import { describe, expect, it } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { SCOPE_IDS, ThemeManager, ThemeSchema } from "../theme";
import { FORBIDDEN_STYLE_PATTERNS } from "../ui/testSupport";
import stylesheet from "./canvas.css?raw";

const sources = import.meta.glob("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
/** Shipped sources only; tests and their support describe forbidden patterns and would match themselves. */
const shipped: (readonly [string, string])[] = [
  ...Object.entries(sources).filter(([path]) => !path.includes(".test.") && !path.includes("TestSupport")),
  ["canvas.css", stylesheet],
];
const components = shipped.filter(([path]) => path.endsWith(".tsx"));

describe("canvas source has no literal styling or timing", () => {
  it("scans the real files", () => {
    expect(shipped.length).toBeGreaterThan(8);
    expect(stylesheet.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN_STYLE_PATTERNS)("finds no %s in the shipped files", (_name, pattern) => {
    expect(shipped.filter(([, text]) => pattern.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("gives no component an input handler, because the shared input manager owns them", () => {
    const handler = /\bon(?:Click|DoubleClick|KeyDown|KeyUp|KeyPress|Pointer\w*|Mouse\w*|Touch\w*|Press\w*|Drag\w*|Wheel|Submit)\b|\baddEventListener\b/;
    expect(handler.test("<div onWheel={zoom}>")).toBe(true);
    expect(components.filter(([, text]) => handler.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("listens to nothing but the display's pixel ratio outside the input manager", () => {
    expect(shipped.filter(([, text]) => /\baddEventListener\b/.test(text)).map(([path]) => path)).toEqual(["./devicePixelRatio.ts"]);
  });

  it("draws no dots, arcs, fills or dashes", () => {
    const dotted = /\b(?:arc|arcTo|ellipse|fillRect|fill|fillText|setLineDash|createPattern|drawImage|putImageData)\(|dotted|dashed/;
    expect(dotted.test("ctx.arc(0, 0, 1, 0, 6)")).toBe(true);
    expect(shipped.filter(([, text]) => dotted.test(text)).map(([path]) => path)).toEqual([]);
  });
});

describe("the canvas stylesheet", () => {
  it("reads only theme tokens that every scope defines under every built-in preset", () => {
    const referenced = [...new Set([...stylesheet.matchAll(/var\(--([A-Za-z0-9-]+)\)/g)].map((match) => (match[1] ?? "").replaceAll("-", ".")))];
    expect(referenced).toEqual(expect.arrayContaining(["color.surface.canvas", "color.surface.toolbar", "color.interaction.focus", "spacing.toolbar"]));
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

  it("gives the surface a visible focus ring, stops the browser taking touch gestures, and fills the paper with the canvas", () => {
    expect(stylesheet).toMatch(/\.graph-paper:focus-visible\s*\{[^}]*var\(--color-interaction-focus\)/);
    expect(stylesheet).not.toMatch(/outline\s*:\s*(?:none|0)/);
    expect(stylesheet).toMatch(/\.graph-paper\s*\{[^}]*touch-action:\s*none/);
    expect(stylesheet).toMatch(/\.graph-paper-lines\s*\{[^}]*inset:\s*0/);
  });
});
