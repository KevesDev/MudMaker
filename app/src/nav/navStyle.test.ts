/** Reads the stylesheets and source text only: it shows what is declared, not what is drawn. */
import { describe, expect, it } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { SCOPE_IDS, ThemeManager, ThemeSchema } from "../theme";
import { FORBIDDEN_STYLE_PATTERNS } from "../ui/testSupport";
import navStylesheet from "./nav.css?raw";
import workspaceStylesheet from "../workspaces/workspaces.css?raw";

const sources = import.meta.glob(["./**/*.{ts,tsx}", "../workspaces/**/*.{ts,tsx}"], { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
/** Shipped sources only; tests describe forbidden patterns and would match themselves. */
const shipped: (readonly [string, string])[] = [
  ...Object.entries(sources).filter(([path]) => !path.includes(".test.")),
  ["nav.css", navStylesheet],
  ["workspaces.css", workspaceStylesheet],
];

describe("navigation and workspace source has no literal styling or timing", () => {
  it("scans the real files", () => {
    expect(shipped.filter(([path]) => path.endsWith(".tsx")).length).toBeGreaterThan(2);
    expect(navStylesheet.length).toBeGreaterThan(0);
    expect(workspaceStylesheet.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN_STYLE_PATTERNS)("finds no %s in the shipped files", (_name, pattern) => {
    expect(shipped.filter(([, text]) => pattern.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("gives no component an activation, key or pointer handler, because the shared input manager owns them", () => {
    const handler = /\bon(?:Click|DoubleClick|KeyDown|KeyUp|KeyPress|Pointer\w*|Mouse\w*|Touch\w*|Press\w*|Drag\w*|Wheel|Submit)\b|\baddEventListener\b/;
    expect(handler.test("<button onClick={go}>")).toBe(true);
    expect(shipped.filter(([path, text]) => path.endsWith(".tsx") && handler.test(text)).map(([path]) => path)).toEqual([]);
  });
});

describe("navigation and workspace stylesheets", () => {
  it("read only theme tokens that every scope defines under every built-in preset", () => {
    const referenced = [...new Set([navStylesheet, workspaceStylesheet].flatMap((text) => [...text.matchAll(/var\(--([A-Za-z0-9-]+)\)/g)].map((match) => (match[1] ?? "").replaceAll("-", "."))))];
    expect(referenced).toEqual(expect.arrayContaining(["color.surface.app", "color.border.subtle", "color.interaction.focus"]));
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

  it("draw the working surface plain: no card, shadow or radius, and a visible focus ring in the focus token", () => {
    expect(workspaceStylesheet).not.toMatch(/box-shadow|border-radius|dashed|dotted/);
    expect(workspaceStylesheet).toMatch(/\.workspace-surface:focus-visible\s*\{[^}]*var\(--color-interaction-focus\)/);
    expect(workspaceStylesheet).not.toMatch(/outline\s*:\s*(?:none|0)/);
  });
});
