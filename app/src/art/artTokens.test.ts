import { describe, expect, it } from "vitest";
import presetsDocument from "../../../docs/03-contracts/ui-ux/theme-presets.md?raw";
import { ART_ROLES, SCOPE_IDS, ThemeManager, USER_THEME_SCHEMA, type AccessibilitySettings, type ScopeId } from "../theme";
import { fixtureDocument, fixturePresetIds, fixturePresetTokens, stringToken } from "../theme/fixtures";

const HEX = /^#[0-9A-F]{6}$/;
const names = ART_ROLES.map((role) => `color.art.${role}`);
const NORMAL: AccessibilitySettings = { textScale: 1, contrast: "normal", reducedMotion: false };
const HIGH: AccessibilitySettings = { ...NORMAL, contrast: "high" };

/** CIE L*a*b* of an sRGB color under D65, written here from the standard definition and not shared with any theme code. */
function lab(hex: string): readonly [number, number, number] {
  const linear = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = linear;
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE(first: string, second: string): number {
  const [l1, a1, b1] = lab(first);
  const [l2, a2, b2] = lab(second);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** The floor the presets document states for every pair of art roles of a preset. */
function documentedMinimum(): number {
  const found = /CIE76 delta E of at least (\d+)/.exec(presetsDocument)?.[1];
  if (found === undefined) throw new Error("theme-presets.md states no delta E floor for art roles");
  return Number(found);
}

/** The lowest pair of a preset's art roles, as the document states it. */
function documentedLowest(presetId: string): number {
  const found = new RegExp(`([0-9.]+) \\([^)]*\\) in ${presetId}`).exec(presetsDocument)?.[1];
  if (found === undefined) throw new Error(`theme-presets.md states no lowest art pair for ${presetId}`);
  return Number(found);
}

function pairs(values: readonly string[]): { first: number; second: number; distance: number }[] {
  return values.flatMap((first, firstIndex) =>
    values.slice(firstIndex + 1).map((second, offset) => ({ first: firstIndex, second: firstIndex + 1 + offset, distance: deltaE(first, second) })),
  );
}

describe("the color difference measure", () => {
  it("measures white as lightness 100 with no hue, and the two exact neon-dark-mode neighbours the document gives as 6.6 apart", () => {
    const [lightness, a, b] = lab("#FFFFFF");
    expect(lightness).toBeCloseTo(100, 1);
    expect(Math.abs(a) + Math.abs(b)).toBeLessThan(0.1);
    const dark = fixturePresetTokens("neon-dark-mode", "editor");
    expect(deltaE(stringToken(dark, "color.surface.canvas"), stringToken(dark, "color.surface.panel"))).toBeCloseTo(6.6, 1);
  });

  it("states a floor of 10 in the presets document", () => {
    expect(documentedMinimum()).toBe(10);
  });
});

describe.each(fixturePresetIds())("art tokens of preset %s", (presetId) => {
  const own = fixturePresetTokens(presetId, "editor");
  const values = names.map((name) => stringToken(own, name).toUpperCase());

  it("define every role of the schema as a six digit color", () => {
    expect(names).toHaveLength(ART_ROLES.length);
    for (const value of values) expect(value).toMatch(HEX);
  });

  it("keep every pair of roles at least the documented delta E apart, so no two roles look alike", () => {
    const all = pairs(values);
    expect(all).toHaveLength((ART_ROLES.length * (ART_ROLES.length - 1)) / 2);
    const tooClose = all.filter((pair) => pair.distance < documentedMinimum()).map((pair) => `${ART_ROLES[pair.first]} and ${ART_ROLES[pair.second]}: ${pair.distance.toFixed(1)}`);
    expect(tooClose).toEqual([]);
  });

  it("have the lowest pair that the document states", () => {
    const lowest = Math.min(...pairs(values).map((pair) => pair.distance));
    expect(lowest).toBeCloseTo(documentedLowest(presetId), 1);
  });

  it("resolve in every scope under that preset to the values the preset sets", () => {
    const manager = new ThemeManager(fixtureDocument());
    for (const scope of SCOPE_IDS) {
      expect(manager.selectPreset(scope, presetId).ok).toBe(true);
      expect(names.map((name) => String(manager.getSnapshot(scope).tokens[name]).toUpperCase()), scope).toEqual(values);
    }
  });
});

describe("art colors follow the palette roles the owner mapped", () => {
  /** Each row says that an art role is the same palette color as a token whose palette color the presets document names. */
  const SHARED: readonly (readonly [string, string, string])[] = [
    ["neon-lights", "color.art.deep", "color.surface.canvas"],
    ["neon-lights", "color.art.sky", "color.surface.panel"],
    ["neon-lights", "color.art.haze", "color.surface.toolbar"],
    ["neon-lights", "color.art.accent", "color.accent.tertiary"],
    ["neon-lights", "color.art.glow", "color.accent.primary"],
    ["neon-dark-mode", "color.art.deep", "color.surface.canvas"],
    ["neon-dark-mode", "color.art.accent", "color.accent.primary"],
    ["neon-dark-mode", "color.art.glow", "color.accent.secondary"],
  ];

  it.each(SHARED)("in %s, %s is the same palette color as %s", (presetId, art, other) => {
    const tokens = fixturePresetTokens(presetId, "editor");
    expect(stringToken(tokens, art).toUpperCase()).toBe(stringToken(tokens, other).toUpperCase());
  });

  it("never uses the exact tertiary accent of neon-dark-mode, the lime that is unique to the Host action", () => {
    const tokens = fixturePresetTokens("neon-dark-mode", "editor");
    const lime = stringToken(tokens, "color.accent.tertiary").toUpperCase();
    expect(lime).toMatch(HEX);
    expect(names.map((name) => stringToken(tokens, name).toUpperCase())).not.toContain(lime);
  });
});

describe.each(fixturePresetIds())("high contrast in preset %s", (presetId) => {
  function artTokens(manager: ThemeManager, scope: ScopeId): Record<string, unknown> {
    const tokens = manager.getSnapshot(scope).tokens;
    return Object.fromEntries(names.map((name) => [name, tokens[name]]));
  }

  it.each(["editor", "client"] as const)("leaves every art color of the %s scope as it is, because art is decorative", (scope) => {
    const manager = new ThemeManager(fixtureDocument());
    expect(manager.selectPreset(scope, presetId).ok).toBe(true);
    const before = artTokens(manager, scope);
    expect(Object.keys(before)).toEqual(names);
    expect(manager.setAccessibility(scope, HIGH).ok).toBe(true);
    expect(manager.getSnapshot(scope).accessibility.contrast).toBe("high");
    expect(artTokens(manager, scope)).toEqual(before);
  });
});

describe("high contrast moves an accent but not the art color that shares its value", () => {
  it("raises the tertiary accent of neon-lights on the canvas while the art accent keeps the same palette color", () => {
    const manager = new ThemeManager(fixtureDocument());
    expect(manager.selectPreset("editor", "neon-lights").ok).toBe(true);
    const normal = manager.getSnapshot("editor").tokens;
    expect(normal["color.art.accent"]).toBe(normal["color.accent.tertiary"]);
    expect(manager.setAccessibility("editor", HIGH).ok).toBe(true);
    const high = manager.getSnapshot("editor").tokens;
    expect(high["color.accent.tertiary"]).not.toBe(normal["color.accent.tertiary"]);
    expect(high["color.art.accent"]).toBe(normal["color.art.accent"]);
  });
});

describe("user themes and art roles", () => {
  const userTheme = (tokens: Record<string, string | number>): unknown => ({ schema: USER_THEME_SCHEMA, id: "mine", tokens });
  const artOf = (manager: ThemeManager): unknown[] => names.map((name) => manager.getSnapshot("editor").tokens[name]);

  it("falls back to the preset for every art role the user theme leaves out", () => {
    const manager = new ThemeManager(fixtureDocument());
    const preset = artOf(manager);
    expect(manager.setUserTheme("editor", userTheme({ "font.size.body": 20 })).ok).toBe(true);
    expect(manager.getSnapshot("editor").themeId).toBe("mine");
    expect(artOf(manager)).toEqual(preset);
  });

  it("recolors only the roles the user theme sets", () => {
    const manager = new ThemeManager(fixtureDocument());
    const preset = artOf(manager);
    const chosen = "#123456";
    expect(preset).not.toContain(chosen);
    expect(manager.setUserTheme("editor", userTheme({ "color.art.sky": chosen })).ok).toBe(true);
    const after = artOf(manager);
    expect(after[ART_ROLES.indexOf("sky")]).toBe(chosen);
    expect(after.filter((_, index) => index !== ART_ROLES.indexOf("sky"))).toEqual(preset.filter((_, index) => index !== ART_ROLES.indexOf("sky")));
  });

  it.each([
    ["a color that is not a color", { "color.art.sky": "blue" }, "invalid-color", "color.art.sky"],
    ["a color with no leading hash", { "color.art.glow": "5EEA91" }, "invalid-color", "color.art.glow"],
    ["a role the schema does not define", { "color.art.lava": "#112233" }, "unknown-token", "color.art.lava"],
  ] as const)("rejects %s and keeps the last valid theme", (_title, tokens, code, token) => {
    const manager = new ThemeManager(fixtureDocument());
    expect(manager.setUserTheme("editor", userTheme({ "color.art.deep": "#101010" })).ok).toBe(true);
    const kept = manager.getSnapshot("editor");
    const result = manager.setUserTheme("editor", userTheme(tokens));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ code, token });
    expect(manager.getSnapshot("editor")).toBe(kept);
    expect(manager.getSnapshot("editor").tokens["color.art.deep"]).toBe("#101010");
  });

  it("rejects an invalid art color given as an override and keeps the last valid overrides", () => {
    const manager = new ThemeManager(fixtureDocument());
    expect(manager.setOverrides("editor", { "color.art.star": "#ABCDEF" }).ok).toBe(true);
    const kept = manager.getSnapshot("editor");
    const result = manager.setOverrides("editor", { "color.art.star": "pale" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ code: "invalid-color", token: "color.art.star" });
    expect(manager.getSnapshot("editor")).toBe(kept);
    expect(manager.getSnapshot("editor").tokens["color.art.star"]).toBe("#ABCDEF");
  });
});
