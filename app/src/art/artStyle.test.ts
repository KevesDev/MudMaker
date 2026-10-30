/** Reads the stylesheet and source text only: it shows what is declared, not what is drawn. */
import { describe, expect, it } from "vitest";
import stylesheet from "./art.css?raw";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ART_ROLES, SCOPE_IDS, ThemeManager, ThemeSchema } from "../theme";
import { fixtureBaseTokens, numberToken } from "../theme/fixtures";
import { FORBIDDEN_STYLE_PATTERNS } from "../ui/testSupport";

const sources = import.meta.glob("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
/** Shipped sources only; tests and their patterns would match themselves. */
const shipped: (readonly [string, string])[] = [
  ...Object.entries(sources).filter(([path]) => !path.includes(".test.")),
  ["./art.css", stylesheet],
];

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(", ", ",\\s*");
  const matches = [...stylesheet.matchAll(new RegExp(`(?<!,\\n)^${escaped}\\s*\\{([^}]*)\\}`, "gm"))];
  if (matches.length !== 1) throw new Error(`Expected one rule for ${selector}, found ${matches.length}`);
  return matches[0]?.[1] ?? "";
}

describe("art source has no literal styling", () => {
  it("scans the real files", () => {
    expect(shipped.map(([path]) => path)).toEqual(expect.arrayContaining(["./art.css", "./TextArt.tsx", "./parsePiece.ts", "./artRuns.ts"]));
  });

  it.each(FORBIDDEN_STYLE_PATTERNS)("catches %s in a sample, and finds none in the shipped files", (_name, pattern, sample) => {
    expect(pattern.test(sample)).toBe(true);
    expect(shipped.filter(([, text]) => pattern.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("gives no art component an activation, key or pointer handler, or a place in the tab order", () => {
    const handler = /\bon(?:Click|DoubleClick|KeyDown|KeyUp|KeyPress|Pointer\w*|Mouse\w*|Touch\w*|Focus|Blur|Drag\w*|Wheel)\b|\baddEventListener\b|\btabIndex\b/;
    expect(handler.test("<span onClick={f} tabIndex={0}>")).toBe(true);
    expect(shipped.filter(([, text]) => handler.test(text)).map(([path]) => path)).toEqual([]);
  });
});

describe("the role classes follow the theme schema", () => {
  const declared = (prefix: string): string[] => [...stylesheet.matchAll(new RegExp(`^\\.${prefix}-([A-Za-z]+)\\s*\\{`, "gm"))].map((match) => match[1] ?? "");

  it("defines a foreground class and a background class for exactly the roles of the schema", () => {
    expect(declared("art-fg").sort()).toEqual([...ART_ROLES].sort());
    expect(declared("art-bg").sort()).toEqual([...ART_ROLES].sort());
  });

  it("colors each class only from the token of its own role", () => {
    for (const role of ART_ROLES) {
      expect(ruleBody(`.art-fg-${role}`).trim()).toBe(`color: var(--color-art-${role});`);
      expect(ruleBody(`.art-bg-${role}`).trim()).toBe(`background-color: var(--color-art-${role});`);
    }
  });

  it("lists the roles as color tokens of the schema", () => {
    for (const role of ART_ROLES) expect(ThemeSchema.describeToken(`color.art.${role}`)?.type.kind).toBe("color");
    expect(ThemeSchema.families.find((family) => family.prefix === "color.art")?.members).toEqual([...ART_ROLES]);
  });
});

describe("the art block is inert text on whole cells", () => {
  const body = ruleBody(".text-art");

  it("is not selectable, takes no pointer and keeps its spaces and glyphs as written", () => {
    for (const declaration of ["user-select: none;", "pointer-events: none;", "white-space: pre;", "font-variant-ligatures: none;", "font-kerning: none;"]) {
      expect(body).toContain(declaration);
    }
  });

  it("uses the monospace token font at the code size, with a line height of exactly one cell", () => {
    expect(body).toContain("font-family: var(--font-family-code);");
    expect(body).toContain("font-size: var(--font-size-code);");
    expect(body).toContain("line-height: var(--font-lineHeight-art);");
    expect(numberToken(fixtureBaseTokens("editor"), "font.lineHeight.art")).toBe(1);
  });

  it("paints each pixel as a box background, never as glyph ink: the characters are hidden and only size the run", () => {
    expect(ruleBody(".art-glyphs").trim()).toBe("visibility: hidden;");
    expect(ruleBody(".text-art-row").trim()).toBe("display: flex;");
    expect(ruleBody(".art-full").trim()).toBe("background-color: currentColor;");
  });

  it("paints half a cell as a box covering half of the run in the foreground color, from the top or the bottom", () => {
    const half = ruleBody(".art-upper::before, .art-lower::before");
    for (const declaration of ["content: \"\";", "position: absolute;", "inset-inline: 0;", "block-size: 50%;", "background-color: currentColor;"]) {
      expect(half).toContain(declaration);
    }
    expect(ruleBody(".art-upper::before").trim()).toBe("inset-block-start: 0;");
    expect(ruleBody(".art-lower::before").trim()).toBe("inset-block-end: 0;");
    expect(ruleBody(".art-upper, .art-lower").trim()).toBe("position: relative;");
  });

  it("is never scaled, filtered, faded or animated, so nothing is blurred", () => {
    const blur = /\b(?:transform|filter|backdrop-filter|opacity|scale|zoom|image-rendering|transition|animation)\b/;
    expect(blur.test("filter: blur(1em);")).toBe(true);
    expect(blur.test(stylesheet.replace(/\/\*[\s\S]*?\*\//g, ""))).toBe(false);
  });
});

describe("the art gives way when the platform overrides colors or prints", () => {
  /** The rules inside one media query, or null when the stylesheet has none for it. */
  function mediaRules(query: string): string | null {
    const escaped = query.replace(/[()]/g, "\\$&");
    const found = new RegExp(`@media ${escaped}\\s*\\{((?:[^{}]*\\{[^}]*\\}\\s*)*)\\}`).exec(stylesheet);
    return found?.[1] ?? null;
  }

  it.each(["(forced-colors: active)", "print"])("hides the whole art block under %s, so it leaves no layout box and the text stays readable", (query) => {
    const rules = mediaRules(query);
    expect(rules).not.toBeNull();
    const body = /\.text-art\s*\{([^}]*)\}/.exec(rules ?? "")?.[1] ?? "";
    expect(body.trim()).toBe("display: none;");
  });

  it("finds a media rule only where the stylesheet has one", () => {
    expect(mediaRules("(prefers-reduced-motion: reduce)")).toBeNull();
  });
});

describe("stylesheet tokens", () => {
  const referenced = [...new Set([...stylesheet.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((match) => match[1] ?? ""))];

  it("reads only tokens that every scope defines under every built-in preset", () => {
    expect(referenced.length).toBeGreaterThan(ART_ROLES.length);
    const manager = new ThemeManager(themeDefaults);
    const missing: string[] = [];
    for (const preset of manager.listPresets()) {
      for (const scope of SCOPE_IDS) {
        expect(manager.selectPreset(scope, preset.id).ok).toBe(true);
        const tokens = manager.getSnapshot(scope).tokens;
        for (const name of referenced) {
          const token = name.slice(2).replaceAll("-", ".");
          if (ThemeSchema.describeToken(token) === undefined || tokens[token] === undefined) missing.push(`${scope}/${preset.id}: ${token}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
