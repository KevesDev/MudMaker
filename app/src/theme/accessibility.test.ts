import { describe, expect, it } from "vitest";
import { fixtureDocument, fixturePresetIds, fixtureTokens, numberToken, stringToken, wcagRatio } from "./fixtures";
import { ThemeManager } from "./ThemeManager";
import type { AccessibilitySettings } from "./types";

const NORMAL: AccessibilitySettings = { textScale: 1, contrast: "normal", reducedMotion: false };

function newManager(): ThemeManager {
  return new ThemeManager(fixtureDocument());
}

const SURFACES = [
  "color.surface.app",
  "color.surface.panel",
  "color.surface.toolbar",
  "color.surface.inspector",
  "color.surface.canvas",
  "color.surface.overlay",
];

/** The window border and the accents that draw borders and rules; high contrast holds them to the boundary floor. */
const ACCENTS = ["color.border.frame", "color.accent.primary", "color.accent.tertiary"];

describe("text scale (AC-06)", () => {
  it("multiplies every font size exactly and leaves other dimensions alone", () => {
    const manager = newManager();
    manager.setAccessibility("editor", { ...NORMAL, textScale: 1.5 });
    const base = fixtureTokens("editor");
    const tokens = manager.getSnapshot("editor").tokens;
    for (const name of ["font.size.body", "font.size.caption", "font.size.heading", "font.size.nodeTitle", "font.size.code", "font.size.wordmarkStep", "font.size.icon"]) {
      expect(tokens[name]).toBe(numberToken(base, name) * 1.5);
    }
    expect(tokens["spacing.panel"]).toBe(base["spacing.panel"]);
    expect(tokens["font.weight.regular"]).toBe(base["font.weight.regular"]);
  });

  it("scales the terminal font size in the client scope", () => {
    const manager = newManager();
    manager.setAccessibility("client", { ...NORMAL, textScale: 2 });
    const base = fixtureTokens("client");
    expect(manager.getSnapshot("client").tokens["font.terminal.size"]).toBe(numberToken(base, "font.terminal.size") * 2);
    expect(manager.getSnapshot("client").tokens["font.terminal.lineHeight"]).toBe(base["font.terminal.lineHeight"]);
  });

  it.each([0.5, 1, 3])("accepts the scale %s", (textScale) => {
    const manager = newManager();
    expect(manager.setAccessibility("editor", { ...NORMAL, textScale }).ok).toBe(true);
    expect(manager.getSnapshot("editor").tokens["font.size.body"]).toBe(
      numberToken(fixtureTokens("editor"), "font.size.body") * textScale,
    );
  });

  it.each([0.49, 3.01, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects the scale %s", (textScale) => {
    const manager = newManager();
    const before = manager.getSnapshot("editor");
    const result = manager.setAccessibility("editor", { ...NORMAL, textScale });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.token).toBe("accessibility.textScale");
    expect(manager.getSnapshot("editor")).toBe(before);
  });
});

describe("reduced motion (AC-06)", () => {
  it("sets every motion duration to the reduced duration and restores them afterwards", () => {
    const manager = newManager();
    const base = fixtureTokens("editor");
    const reduced = numberToken(base, "motion.reducedDurationMs");
    manager.setAccessibility("editor", { ...NORMAL, reducedMotion: true });
    const tokens = manager.getSnapshot("editor").tokens;
    expect(reduced).toBe(0);
    for (const name of ["motion.duration.fastMs", "motion.duration.normalMs", "motion.duration.slowMs"]) {
      expect(tokens[name]).toBe(reduced);
    }

    manager.setAccessibility("editor", NORMAL);
    expect(manager.getSnapshot("editor").tokens["motion.duration.normalMs"]).toBe(base["motion.duration.normalMs"]);
  });

  it("uses the reduced duration the theme declares", () => {
    const manager = newManager();
    manager.setOverrides("editor", { "motion.reducedDurationMs": 20 });
    manager.setAccessibility("editor", { ...NORMAL, reducedMotion: true });
    expect(manager.getSnapshot("editor").tokens["motion.duration.slowMs"]).toBe(20);
  });
});

describe("high contrast (AC-06)", () => {
  it("keeps primary text at or above 4.5:1 on the app surface", () => {
    const manager = newManager();
    manager.setAccessibility("editor", { ...NORMAL, contrast: "high" });
    const tokens = manager.getSnapshot("editor").tokens;
    expect(
      wcagRatio(stringToken(tokens, "color.text.primary"), stringToken(tokens, "color.surface.app")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("raises a low contrast user color to at least 7:1 on every surface and leaves surfaces alone", () => {
    const manager = newManager();
    manager.setOverrides("editor", { "color.text.primary": "#1F2733", "color.text.muted": "#3A4658" });
    const lowRatio = wcagRatio("#1F2733", stringToken(fixtureTokens("editor"), "color.surface.app"));
    expect(lowRatio).toBeLessThan(2);

    manager.setAccessibility("editor", { ...NORMAL, contrast: "high" });
    const tokens = manager.getSnapshot("editor").tokens;
    for (const name of ["color.text.primary", "color.text.muted"]) {
      for (const surface of SURFACES) {
        expect(wcagRatio(stringToken(tokens, name), stringToken(tokens, surface))).toBeGreaterThanOrEqual(7);
      }
    }
    for (const surface of SURFACES) {
      expect(tokens[surface]).toBe(fixtureTokens("editor")[surface]);
    }
  });

  it("derives borders and focus rings that reach 3:1 and leaves compliant colors unchanged", () => {
    const manager = newManager();
    manager.setOverrides("editor", { "color.border.normal": "#1B2432" });
    manager.setAccessibility("editor", { ...NORMAL, contrast: "high" });
    const tokens = manager.getSnapshot("editor").tokens;
    for (const name of ["color.border.normal", "color.border.focused", "color.interaction.focus"]) {
      for (const surface of SURFACES) {
        expect(wcagRatio(stringToken(tokens, name), stringToken(tokens, surface))).toBeGreaterThanOrEqual(3);
      }
    }
    expect(tokens["color.border.focused"]).toBe(fixtureTokens("editor")["color.border.focused"]);
  });

  it("applies the terminal rule against the terminal background in the client scope", () => {
    const manager = newManager();
    manager.setOverrides("client", { "color.terminal.foreground": "#222B38" });
    manager.setAccessibility("client", { ...NORMAL, contrast: "high" });
    const tokens = manager.getSnapshot("client").tokens;
    expect(
      wcagRatio(stringToken(tokens, "color.terminal.foreground"), stringToken(tokens, "color.terminal.background")),
    ).toBeGreaterThanOrEqual(7);
  });

  it("returns to the authored colors when contrast goes back to normal", () => {
    const manager = newManager();
    manager.setOverrides("editor", { "color.text.primary": "#1F2733" });
    manager.setAccessibility("editor", { ...NORMAL, contrast: "high" });
    manager.setAccessibility("editor", NORMAL);
    expect(manager.getSnapshot("editor").tokens["color.text.primary"]).toBe("#1F2733");
  });
});

/** The secondary accent is used as a boundary on every surface, or as a fill under primary text; high contrast needs one of the two. */
function secondaryAccentUse(tokens: Readonly<Record<string, string | number | boolean>>): { asBoundary: boolean; asFill: boolean } {
  const accent = stringToken(tokens, "color.accent.secondary");
  return {
    asBoundary: Math.min(...SURFACES.map((surface) => wcagRatio(accent, stringToken(tokens, surface)))) >= 3,
    asFill: wcagRatio(stringToken(tokens, "color.text.primary"), accent) >= 7,
  };
}

describe.each(fixturePresetIds())("high contrast secondary accent in preset %s", (presetId) => {
  function highContrastTokens(overrides: Readonly<Record<string, string>> = {}): Readonly<Record<string, string | number | boolean>> {
    const manager = newManager();
    manager.selectPreset("editor", presetId);
    if (Object.keys(overrides).length > 0) expect(manager.setOverrides("editor", overrides).ok).toBe(true);
    manager.setAccessibility("editor", { ...NORMAL, contrast: "high" });
    return manager.getSnapshot("editor").tokens;
  }

  it("keeps the exact palette secondary accent, which already has a use, and still carries its text", () => {
    const tokens = highContrastTokens();
    expect(tokens["color.accent.secondary"]).toBe(fixtureTokens("editor", presetId)["color.accent.secondary"]);
    const use = secondaryAccentUse(tokens);
    expect(use.asBoundary || use.asFill).toBe(true);
  });

  it("derives a secondary accent that can carry primary text from a mid tone theme color that can neither bound a surface nor carry text", () => {
    const midTone = "#707070";
    expect(secondaryAccentUse({ ...fixtureTokens("editor", presetId), "color.accent.secondary": midTone })).toEqual({ asBoundary: false, asFill: false });
    const tokens = highContrastTokens({ "color.accent.secondary": midTone });
    expect(tokens["color.accent.secondary"]).not.toBe(midTone);
    const use = secondaryAccentUse(tokens);
    expect(use.asBoundary || use.asFill).toBe(true);
  });

  it("keeps the text on the secondary fill at the enhanced ratio, moving it only when the palette value falls short", () => {
    const tokens = highContrastTokens();
    const base = fixtureTokens("editor", presetId);
    expect(wcagRatio(stringToken(tokens, "color.accent.onSecondary"), stringToken(tokens, "color.accent.secondary"))).toBeGreaterThanOrEqual(7);
    const paletteRatio = wcagRatio(stringToken(base, "color.accent.onSecondary"), stringToken(base, "color.accent.secondary"));
    expect(tokens["color.accent.onSecondary"] === base["color.accent.onSecondary"]).toBe(paletteRatio >= 7);
  });

  it("lifts a user text color on the secondary fill that falls short of the enhanced ratio", () => {
    const poor = "#808080";
    const base = fixtureTokens("editor", presetId);
    expect(wcagRatio(poor, stringToken(base, "color.accent.secondary"))).toBeLessThan(7);
    const tokens = highContrastTokens({ "color.accent.onSecondary": poor });
    expect(tokens["color.accent.onSecondary"]).not.toBe(poor);
    expect(wcagRatio(stringToken(tokens, "color.accent.onSecondary"), stringToken(tokens, "color.accent.secondary"))).toBeGreaterThanOrEqual(7);
  });

  it("leaves a user secondary accent alone when it already bounds every surface", () => {
    const bright = "#FFFFFF";
    expect(secondaryAccentUse({ ...fixtureTokens("editor", presetId), "color.accent.secondary": bright }).asBoundary).toBe(true);
    expect(highContrastTokens({ "color.accent.secondary": bright })["color.accent.secondary"]).toBe(bright);
  });
});

describe.each(fixturePresetIds())("high contrast accent text in preset %s", (presetId) => {
  const TEXT_TARGET = 7;
  const BOUNDARY_TARGET = 3;
  const TEXT_ACCENTS = ["color.accent.primary", "color.accent.tertiary"];

  function highContrastTokens(overrides: Readonly<Record<string, string>> = {}): Readonly<Record<string, string | number | boolean>> {
    const manager = newManager();
    manager.selectPreset("editor", presetId);
    if (Object.keys(overrides).length > 0) expect(manager.setOverrides("editor", overrides).ok).toBe(true);
    manager.setAccessibility("editor", { ...NORMAL, contrast: "high" });
    return manager.getSnapshot("editor").tokens;
  }

  it("raises the primary and tertiary accents to the text ratio on the canvas, where the launch screen draws them as text", () => {
    const tokens = highContrastTokens();
    for (const name of TEXT_ACCENTS) {
      expect(wcagRatio(stringToken(tokens, name), stringToken(tokens, "color.surface.canvas")), name).toBeGreaterThanOrEqual(TEXT_TARGET);
    }
  });

  it("keeps them above the boundary ratio on every surface, which they still draw rules and borders on", () => {
    const tokens = highContrastTokens();
    for (const name of TEXT_ACCENTS) {
      for (const surface of SURFACES) {
        expect(wcagRatio(stringToken(tokens, name), stringToken(tokens, surface)), `${name} on ${surface}`).toBeGreaterThanOrEqual(BOUNDARY_TARGET);
      }
    }
  });

  it("leaves the exact palette values alone in normal contrast", () => {
    const manager = newManager();
    manager.selectPreset("editor", presetId);
    const base = fixtureTokens("editor", presetId);
    for (const name of TEXT_ACCENTS) expect(manager.getSnapshot("editor").tokens[name]).toBe(base[name]);
  });

  it("lifts a user accent that falls short of the text ratio on the canvas", () => {
    const poor = "#303060";
    const base = fixtureTokens("editor", presetId);
    expect(wcagRatio(poor, stringToken(base, "color.surface.canvas"))).toBeLessThan(TEXT_TARGET);
    const tokens = highContrastTokens({ "color.accent.primary": poor, "color.accent.tertiary": poor });
    for (const name of TEXT_ACCENTS) {
      expect(tokens[name]).not.toBe(poor);
      expect(wcagRatio(stringToken(tokens, name), stringToken(tokens, "color.surface.canvas"))).toBeGreaterThanOrEqual(TEXT_TARGET);
    }
  });
});

describe.each(fixturePresetIds())("high contrast in preset %s", (presetId) => {
  const TEXT_TARGET = 7;
  const GRAPHIC_TARGET = 3;

  function highContrastManager(): ThemeManager {
    const manager = newManager();
    for (const scope of ["editor", "client"] as const) {
      manager.selectPreset(scope, presetId);
      manager.setAccessibility(scope, { ...NORMAL, contrast: "high" });
    }
    return manager;
  }

  function lowest(
    tokens: Readonly<Record<string, string | number | boolean>>,
    foregrounds: readonly string[],
    backgrounds: readonly string[],
  ): number {
    return Math.min(
      ...foregrounds.flatMap((foreground) =>
        backgrounds.map((background) => wcagRatio(stringToken(tokens, foreground), stringToken(tokens, background))),
      ),
    );
  }

  it("gives editor text and status 7:1 and borders and focus 3:1 against every surface", () => {
    const tokens = highContrastManager().getSnapshot("editor").tokens;
    expect(
      lowest(
        tokens,
        [
          "color.text.primary",
          "color.text.secondary",
          "color.text.muted",
          "color.status.success",
          "color.status.warning",
          "color.status.error",
          "color.status.information",
        ],
        SURFACES,
      ),
    ).toBeGreaterThanOrEqual(TEXT_TARGET);
    expect(
      lowest(tokens, ["color.border.normal", "color.border.focused", "color.border.invalid", "color.interaction.focus", ...ACCENTS], SURFACES),
    ).toBeGreaterThanOrEqual(GRAPHIC_TARGET);
  });

  it("gives client text, status and terminal colors 7:1 and borders 3:1 against their surfaces", () => {
    const tokens = highContrastManager().getSnapshot("client").tokens;
    const clientSurfaces = ["color.surface.app", "color.surface.panel"];
    expect(
      lowest(
        tokens,
        [
          "color.text.primary",
          "color.text.secondary",
          "color.status.connected",
          "color.status.reconnecting",
          "color.status.offline",
          "color.status.error",
          "color.status.warning",
        ],
        clientSurfaces,
      ),
    ).toBeGreaterThanOrEqual(TEXT_TARGET);
    expect(
      lowest(
        tokens,
        [
          "color.terminal.foreground",
          "color.terminal.prompt",
          "color.terminal.link",
          "color.terminal.chat",
          "color.terminal.tell",
          "color.terminal.system",
          "color.terminal.emote",
          "color.terminal.combat",
          "color.terminal.warning",
        ],
        ["color.terminal.background"],
      ),
    ).toBeGreaterThanOrEqual(TEXT_TARGET);
    expect(lowest(tokens, ["color.border.normal", "color.border.focused"], clientSurfaces)).toBeGreaterThanOrEqual(GRAPHIC_TARGET);
  });

  it("gives the inherited shared tokens the same 7:1 and 3:1 on every client surface", () => {
    const tokens = highContrastManager().getSnapshot("client").tokens;
    expect(
      lowest(
        tokens,
        ["color.text.primary", "color.text.secondary", "color.text.muted", "color.status.success", "color.status.warning", "color.status.error", "color.status.information"],
        SURFACES,
      ),
    ).toBeGreaterThanOrEqual(TEXT_TARGET);
    expect(
      lowest(tokens, ["color.border.normal", "color.border.focused", "color.border.invalid", "color.interaction.focus", ...ACCENTS], SURFACES),
    ).toBeGreaterThanOrEqual(GRAPHIC_TARGET);
  });
});
