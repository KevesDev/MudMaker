/** See testSupport.tsx for what these tests cannot prove. */
import { describe, expect, it } from "vitest";
import stylesheet from "./ui.css?raw";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager, ThemeSchema, SCOPE_IDS } from "../theme";

const sources = import.meta.glob("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
/** Shipped sources only; tests describe forbidden patterns and would match themselves. */
const shipped: (readonly [string, string])[] = [
  ...Object.entries(sources).filter(([path]) => !path.includes(".test.") && !path.includes("testSupport")),
  ["./ui.css", stylesheet],
];
const primitives = shipped.filter(([path]) => path.startsWith("./primitives/"));

function offenders(files: readonly (readonly [string, string])[], pattern: RegExp): string[] {
  return files.flatMap(([path, text]) => (pattern.test(text) ? [path] : []));
}

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...stylesheet.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))];
  if (matches.length === 0) throw new Error(`No rule for ${selector}`);
  return matches.map((match) => match[1] ?? "").join("\n");
}

describe("shared UI source has no literal styling or timing", () => {
  it("scans the real files", () => {
    expect(shipped.length).toBeGreaterThan(20);
    expect(stylesheet.length).toBeGreaterThan(0);
  });

  /** Each pattern comes with text it must catch, so a pattern that stopped matching cannot pass silently. */
  const FORBIDDEN: readonly (readonly [string, RegExp, string])[] = [
    ["hex colors", /#[0-9a-fA-F]{3,8}\b/, "color: #1a2b3c;"],
    ["color functions", /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/, "background: rgba(0, 0, 0, 0.5);"],
    ["pixel literals", /\b\d+(?:\.\d+)?px\b/, "width: 12px;"],
    ["millisecond or second literals", /\b\d+(?:\.\d+)?m?s\b/, "transition: color 150ms;"],
    ["timers with literal delays", /\b(?:setTimeout|setInterval)\([^;]*,\s*\d/, "setTimeout(() => done(), 500);"],
    ["frame timers", /\brequestAnimationFrame\b/, "requestAnimationFrame(draw);"],
    ["z-index numbers", /z-index\s*:\s*-?\d/, "z-index: 10;"],
    ["radius that is not a token or a calculation from one", /border-radius\s*:\s*(?!var\(|calc\(|inherit)\S/, "border-radius: 50%;"],
    ["implicit alpha", /\btransparent\b|color-mix\(/, "background: color-mix(in srgb, red, transparent);"],
    ["font stacks", /\b(?:sans-serif|monospace|system-ui|serif|Helvetica|Arial|Segoe)\b/, "font: 1em system-ui;"],
    ["font-family without a token", /font-family\s*:\s*(?!var\()\S/, "font-family: Arial;"],
    ["em dashes", /\u2014/, "a \u2014 b"],
    ["emoji", /\p{Extended_Pictographic}/u, "ok \u{1F600}"],
  ];

  it.each(FORBIDDEN)("catches %s in a sample, and finds none in the shipped files", (_name, pattern, sample) => {
    expect(pattern.test(sample)).toBe(true);
    expect(offenders(shipped, pattern)).toEqual([]);
  });

  it("lets token references through the same patterns", () => {
    const allowed =
      "border-radius: var(--shape-panelRadius); font-family: var(--font-family-interface); width: var(--interaction-touchHitSize); border-radius: calc(var(--spacing-row) / 2);";
    for (const [, pattern] of FORBIDDEN) expect(pattern.test(allowed)).toBe(false);
  });

  it("gives components no activation or key handlers of their own", () => {
    expect(primitives.length).toBeGreaterThanOrEqual(12);
    expect(offenders(primitives, /\bon(?:Click|DoubleClick|KeyDown|KeyUp|KeyPress|Pointer\w*|Mouse\w*|Touch\w*|Press\w*|Drag\w*|Wheel|Submit)\b/)).toEqual([]);
    expect(offenders(primitives, /\baddEventListener\b/)).toEqual([]);
  });
});

describe("stylesheet tokens", () => {
  const referenced = [...new Set([...stylesheet.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((match) => match[1] ?? ""))].filter(
    (name) => !name.startsWith("--ui-"),
  );

  function missingTokens(scopes: readonly (typeof SCOPE_IDS)[number][]): string[] {
    const manager = new ThemeManager(themeDefaults);
    const missing: string[] = [];
    for (const preset of manager.listPresets()) {
      for (const scope of scopes) {
        expect(manager.selectPreset(scope, preset.id).ok).toBe(true);
        const tokens = manager.getSnapshot(scope).tokens;
        for (const name of referenced) {
          const token = name.slice(2).replaceAll("-", ".");
          if (ThemeSchema.describeToken(token) === undefined || tokens[token] === undefined) missing.push(`${scope}/${preset.id}: ${token}`);
        }
      }
    }
    return missing;
  }

  it("reads only theme tokens that the editor, home and host scopes define under every built-in preset", () => {
    expect(referenced.length).toBeGreaterThan(30);
    expect(missingTokens(["editor", "home", "host"])).toEqual([]);
  });

  it("reads only theme tokens that the client scope defines under every built-in preset", () => {
    expect(missingTokens(["client"])).toEqual([]);
  });

  it("declares help text without pointer-events blocking, and declares its layers from tokens", () => {
    expect(ruleBody(".ui-tooltip")).not.toContain("pointer-events");
    expect(ruleBody(".ui-tooltip")).toContain("var(--layer-tooltip)");
    expect(ruleBody(".ui-menu-popup")).toContain("var(--layer-popup)");
    expect(ruleBody(".ui-dialog-backdrop")).toContain("var(--layer-dialog)");
    expect(ruleBody(".ui-dialog-backdrop::before")).toContain("var(--color-surface-scrim)");
    expect(ruleBody(".ui-dialog-backdrop::before")).toContain("var(--opacity-scrim)");
  });

  it("declares the focus ring from the focus color and outline width tokens", () => {
    const body = ruleBody(".ui-control:focus-visible");
    expect(body).toContain("var(--color-interaction-focus)");
    expect(body).toContain("var(--interaction-focusOutlineWidth)");
  });

  it("declares hit target sizes from the pointer and touch tokens, with the touch size for coarse pointers and touch or pen use", () => {
    expect(ruleBody(".ui-hit")).toContain("var(--interaction-pointerHitSize)");
    expect(stylesheet).toMatch(/@media \(pointer: coarse\)\s*\{\s*\.ui-hit\s*\{[^}]*var\(--interaction-touchHitSize\)/);
    expect(stylesheet).toMatch(/\[data-input-modality="touch"\] \.ui-hit,\s*:root\[data-input-modality="pen"\] \.ui-hit\s*\{[^}]*var\(--interaction-touchHitSize\)/);
  });

  it("takes every transition and animation time from motion duration tokens that reduced motion shortens", () => {
    const declarations = [...stylesheet.matchAll(/\b(transition|animation)(?:-duration)?\s*:\s*([^;]+);/g)];
    expect(declarations.length).toBeGreaterThan(0);
    for (const [declaration, , value] of declarations) {
      for (const segment of (value ?? "").split(/,(?![^(]*\))/)) expect(segment, declaration).toContain("var(--motion-duration-");
    }
    const durations = [...new Set([...stylesheet.matchAll(/var\((--motion-duration-[A-Za-z]+)\)/g)].map((match) => match[1] ?? ""))];
    expect(durations.length).toBeGreaterThan(0);
    for (const name of durations) {
      expect(ThemeSchema.describeToken(name.slice(2).replaceAll("-", "."))?.role).toBe("motionDuration");
    }
    const manager = new ThemeManager(themeDefaults);
    const result = manager.setAccessibility("editor", { textScale: 1, contrast: "normal", reducedMotion: true });
    expect(result.ok).toBe(true);
    const tokens = manager.getSnapshot("editor").tokens;
    for (const name of durations) {
      expect(tokens[name.slice(2).replaceAll("-", ".")]).toBe(tokens["motion.reducedDurationMs"]);
    }
  });
});
