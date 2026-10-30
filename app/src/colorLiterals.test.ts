/** Reads source text only: it shows no file ships a color literal, not what any screen looks like. */
import { describe, expect, it } from "vitest";
import themeDefaults from "../../contracts/ui/v1/theme-defaults.v1.json";

const sources = import.meta.glob("./**/*.{ts,tsx,css}", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
/** Shipped files only: tests and their support name colors on purpose to check them. */
const shipped = Object.entries(sources).filter(([path]) => !/\.test\.|[Tt]estSupport|\/fixtures\./.test(path));

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const FUNCTION = /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/;

/** Every color value any preset or default holds, so a copy of a palette value in a stylesheet is found even without a color function. */
function themeHexValues(): string[] {
  const values = new Set<string>();
  const visit = (node: unknown): void => {
    if (typeof node === "string" && /^#[0-9A-Fa-f]{6}$/.test(node)) values.add(node.toUpperCase());
    else if (typeof node === "object" && node !== null) Object.values(node).forEach(visit);
  };
  visit(themeDefaults);
  return [...values];
}

describe("shipped source under app/src", () => {
  it("scans the real files, stylesheets of the frame and the home screen among them", () => {
    expect(shipped.length).toBeGreaterThan(50);
    const paths = shipped.map(([path]) => path);
    expect(paths).toEqual(expect.arrayContaining(["./frame/frame.css", "./home/home.css", "./ui/ui.css", "./styles.css"]));
  });

  it("holds no hex color and no color function, so every color is read from a theme token", () => {
    expect(HEX.test("color: #5eea91;")).toBe(true);
    expect(FUNCTION.test("color: rgb(1, 2, 3);")).toBe(true);
    expect(shipped.filter(([, text]) => HEX.test(text) || FUNCTION.test(text)).map(([path]) => path)).toEqual([]);
  });

  it("holds no value that any preset or default of the theme data defines, in any spelling of its letters", () => {
    const values = themeHexValues();
    expect(values.length).toBeGreaterThan(50);
    const copies = shipped.flatMap(([path, text]) => values.filter((value) => text.toUpperCase().includes(value)).map((value) => `${path}: ${value}`));
    expect(copies).toEqual([]);
  });
});
