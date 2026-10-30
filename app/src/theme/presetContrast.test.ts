import { describe, expect, it } from "vitest";
import { fixtureBaseTokens, fixturePresetIds, fixtureTokens, numberToken, stringToken, wcagRatio, type RootScope } from "./fixtures";

/** WCAG 2.2 minimums: 4.5:1 for text, 3:1 for component boundaries, focus rings and graphics. */
const TEXT = 4.5;
const GRAPHIC = 3;
/** Floors that keep quiet tokens visibly distinct from the surface they sit on; also named in theme-presets.md. */
const SUBTLE_BORDER_FLOOR = 1.1;
const GRID_MINOR = { floor: 1.2, ceiling: 2 };
const GRID_MAJOR = { floor: 1.5, ceiling: 2.5 };
const INTERACTION_FILL_FLOOR = 1.2;

interface Requirement {
  readonly group: string;
  readonly foregrounds: readonly string[];
  readonly backgrounds: readonly string[];
  readonly minimum: number;
}

const names = (prefix: string, members: readonly string[]): string[] => members.map((member) => `${prefix}.${member}`);

const EDITOR_SURFACES = names("color.surface", ["app", "panel", "toolbar", "inspector", "canvas", "overlay"]);
/** The tertiary accent draws action borders on the page, never on the overlay surface of menus and dialogs. */
const SURFACES_UNDER_ACCENT = EDITOR_SURFACES.filter((surface) => surface !== "color.surface.overlay");
/** The window border sits between the page and the frame row. */
const FRAME_NEIGHBOURS = names("color.surface", ["app", "toolbar"]);
const CLIENT_SURFACES = names("color.surface", ["app", "panel"]);
const TERMINAL_BACKGROUND = ["color.terminal.background"];
const ANSI = Array.from({ length: 16 }, (_, index) => `color.terminal.ansi${index}`);

const EDITOR_REQUIREMENTS: readonly Requirement[] = [
  { group: "text", foregrounds: names("color.text", ["primary", "secondary", "muted", "disabled"]), backgrounds: EDITOR_SURFACES, minimum: TEXT },
  { group: "status", foregrounds: names("color.status", ["success", "warning", "error", "information"]), backgrounds: EDITOR_SURFACES, minimum: TEXT },
  { group: "borders", foregrounds: names("color.border", ["normal", "focused", "invalid"]), backgrounds: EDITOR_SURFACES, minimum: GRAPHIC },
  { group: "focus", foregrounds: ["color.interaction.focus"], backgrounds: EDITOR_SURFACES, minimum: GRAPHIC },
  { group: "accent primary", foregrounds: ["color.accent.primary"], backgrounds: EDITOR_SURFACES, minimum: GRAPHIC },
  { group: "accent tertiary", foregrounds: ["color.accent.tertiary"], backgrounds: SURFACES_UNDER_ACCENT, minimum: GRAPHIC },
  /** The launch screen draws the primary and tertiary accents as text, on the canvas only. */
  { group: "accent text on canvas", foregrounds: names("color.accent", ["primary", "tertiary"]), backgrounds: ["color.surface.canvas"], minimum: TEXT },
  { group: "text on secondary fill", foregrounds: ["color.accent.onSecondary"], backgrounds: ["color.accent.secondary"], minimum: TEXT },
  { group: "frame border", foregrounds: ["color.border.frame"], backgrounds: FRAME_NEIGHBOURS, minimum: GRAPHIC },
  { group: "subtle border", foregrounds: ["color.border.subtle"], backgrounds: EDITOR_SURFACES, minimum: SUBTLE_BORDER_FLOOR },
  { group: "grid minor", foregrounds: ["color.graph.grid.minor"], backgrounds: ["color.surface.canvas"], minimum: GRID_MINOR.floor },
  { group: "grid major", foregrounds: ["color.graph.grid.major"], backgrounds: ["color.surface.canvas"], minimum: GRID_MAJOR.floor },
  {
    group: "interaction fills",
    foregrounds: names("color.interaction", ["selection", "hover", "pressed"]),
    backgrounds: [...EDITOR_SURFACES, "color.graph.node.surface"],
    minimum: INTERACTION_FILL_FLOOR,
  },
  {
    group: "text on fills",
    foregrounds: ["color.text.primary"],
    backgrounds: [
      ...names("color.interaction", ["selection", "hover", "pressed"]),
      ...names("color.graph.node", ["surface", "selected", "header"]),
    ],
    minimum: TEXT,
  },
  {
    group: "edges",
    foregrounds: names("color.graph.edge", ["default", "active", "selected", "invalid", "disabled"]),
    backgrounds: ["color.surface.canvas"],
    minimum: GRAPHIC,
  },
  {
    group: "ports and node types",
    foregrounds: [
      ...names("color.graph.port", ["execution", "value", "condition", "event"]),
      ...names("color.graph.node", ["event", "condition", "action", "data"]),
    ],
    backgrounds: ["color.surface.canvas", "color.graph.node.surface"],
    minimum: GRAPHIC,
  },
];

const CLIENT_REQUIREMENTS: readonly Requirement[] = [
  { group: "client text", foregrounds: names("color.text", ["primary", "secondary"]), backgrounds: CLIENT_SURFACES, minimum: TEXT },
  {
    group: "client status",
    foregrounds: names("color.status", ["connected", "reconnecting", "offline", "error", "warning"]),
    backgrounds: CLIENT_SURFACES,
    minimum: TEXT,
  },
  { group: "client borders", foregrounds: names("color.border", ["focused", "normal"]), backgrounds: CLIENT_SURFACES, minimum: GRAPHIC },
  {
    group: "terminal text",
    foregrounds: [
      ...names("color.terminal", ["foreground", "prompt", "link", "chat", "tell", "system", "emote", "combat", "warning"]),
      "color.client.channelAccent",
    ],
    backgrounds: TERMINAL_BACKGROUND,
    minimum: TEXT,
  },
  { group: "ansi colors", foregrounds: ANSI.filter((_, index) => index !== 0 && index !== 8), backgrounds: TERMINAL_BACKGROUND, minimum: TEXT },
  { group: "ansi black tones", foregrounds: [ANSI[0] ?? "", ANSI[8] ?? ""], backgrounds: TERMINAL_BACKGROUND, minimum: GRAPHIC },
  {
    group: "terminal text on highlights",
    foregrounds: ["color.terminal.foreground"],
    backgrounds: names("color.client", ["inputBackground", "historyHighlight", "matchHighlight"]),
    minimum: TEXT,
  },
  {
    group: "client highlights",
    foregrounds: names("color.client", ["historyHighlight", "matchHighlight"]),
    backgrounds: [...CLIENT_SURFACES, ...TERMINAL_BACKGROUND],
    minimum: INTERACTION_FILL_FLOOR,
  },
  {
    group: "map colors",
    foregrounds: names("color.map", ["room", "visited", "current", "unknown", "exit", "locked", "uncertain", "note"]),
    backgrounds: ["color.surface.panel", ...TERMINAL_BACKGROUND],
    minimum: GRAPHIC,
  },
];

/** Requirement groups that apply to every token the client shares with the editor, on all of the client's surfaces. */
const SHARED_GROUPS = ["text", "status", "borders", "focus", "accent primary", "accent tertiary", "frame border", "subtle border", "interaction fills", "text on fills"];

function violations(tokens: Readonly<Record<string, string | number | boolean>>, requirements: readonly Requirement[]): string[] {
  const failures: string[] = [];
  for (const { group, foregrounds, backgrounds, minimum } of requirements) {
    for (const foreground of foregrounds) {
      for (const background of backgrounds) {
        const ratio = wcagRatio(stringToken(tokens, foreground), stringToken(tokens, background));
        if (ratio < minimum) {
          failures.push(`${group}: ${foreground} on ${background} is ${ratio.toFixed(2)}, below ${minimum}`);
        }
      }
    }
  }
  return failures;
}

/** How each preset's exact secondary accent is used: Electric Navy is a fill under Digital Mint text, Neon Cyan a boundary and text color. */
const SECONDARY_ACCENT_USE: Readonly<Record<string, { asBoundary: boolean; asFill: boolean }>> = {
  "neon-lights": { asBoundary: false, asFill: true },
  "neon-dark-mode": { asBoundary: true, asFill: false },
};

describe.each(fixturePresetIds())("preset %s contrast", (presetId) => {
  it("meets the contract contrast for every editor text, status, border, focus and graph token", () => {
    expect(violations(fixtureTokens("editor", presetId), EDITOR_REQUIREMENTS)).toEqual([]);
  });

  it("meets the contract contrast for every client text, status, border, terminal and map token", () => {
    expect(violations(fixtureTokens("client", presetId), CLIENT_REQUIREMENTS)).toEqual([]);
  });

  it("meets the editor floors on every surface the client inherits, for every shared text, status, border, focus and interaction token", () => {
    const shared = EDITOR_REQUIREMENTS.filter((requirement) => SHARED_GROUPS.includes(requirement.group));
    expect(shared).toHaveLength(SHARED_GROUPS.length);
    expect(violations(fixtureTokens("client", presetId), shared)).toEqual([]);
  });

  it("gives the secondary accent a use it can meet: a boundary or text on every surface, or a fill that keeps primary text readable", () => {
    const tokens = fixtureTokens("editor", presetId);
    const accent = stringToken(tokens, "color.accent.secondary");
    const asBoundary = Math.min(...EDITOR_SURFACES.map((surface) => wcagRatio(accent, stringToken(tokens, surface)))) >= GRAPHIC;
    const asFill = wcagRatio(stringToken(tokens, "color.text.primary"), accent) >= TEXT;
    expect({ asBoundary, asFill }).toEqual(SECONDARY_ACCENT_USE[presetId]);
  });

  it("keeps graph grid lines quiet: minor and major stay below their ceilings on the canvas", () => {
    const tokens = fixtureTokens("editor", presetId);
    const canvas = stringToken(tokens, "color.surface.canvas");
    const minor = wcagRatio(stringToken(tokens, "color.graph.grid.minor"), canvas);
    const major = wcagRatio(stringToken(tokens, "color.graph.grid.major"), canvas);
    expect(minor).toBeLessThan(GRID_MINOR.ceiling);
    expect(major).toBeLessThan(GRID_MAJOR.ceiling);
    expect(major).toBeGreaterThan(minor);
  });
});

describe("scrim and layers", () => {
  /** Darkens both colors by the scrim percentage, as a black layer at that opacity does. */
  function underScrim(color: string, percent: number): string {
    const channels = [1, 3, 5].map((start) => Math.round(parseInt(color.slice(start, start + 2), 16) * (1 - percent / 100)));
    return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  }
  const STEP = 5;
  const COVERED_CONTRAST = 3;

  it("is black in every preset and the smallest step of 5 at which covered text drops below 3:1 in both", () => {
    const percent = numberToken(fixtureBaseTokens("editor"), "opacity.scrim");
    const smallest = fixturePresetIds().map((presetId) => {
      const tokens = fixtureTokens("editor", presetId);
      expect(stringToken(tokens, "color.surface.scrim")).toBe("#000000");
      for (let step = STEP; step <= 100; step += STEP) {
        const ratio = wcagRatio(underScrim(stringToken(tokens, "color.text.primary"), step), underScrim(stringToken(tokens, "color.surface.app"), step));
        if (ratio < COVERED_CONTRAST) return step;
      }
      throw new Error(`No scrim step hides text in ${presetId}`);
    });
    expect(percent).toBe(Math.max(...smallest));
    expect(Number.isInteger(percent)).toBe(true);
  });

  it("orders popup below tooltip below dialog in the application defaults", () => {
    const base = fixtureBaseTokens("editor");
    expect(numberToken(base, "layer.popup")).toBeLessThan(numberToken(base, "layer.tooltip"));
    expect(numberToken(base, "layer.tooltip")).toBeLessThan(numberToken(base, "layer.dialog"));
  });
});

describe("preset palette rules", () => {
  it.each([
    ["neon-lights", ["#5EEA91", "#2A28AD", "#E23D8A", "#5EEA91", "#E23D8A"]],
    ["neon-dark-mode", ["#9759FF", "#06EFFF", "#B4FF00", "#080808", "#9759FF"]],
  ])("sets the accents, the text on the secondary fill and the window border of %s to the exact palette colors the owner chose, never tints", (presetId, expected) => {
    const tokens = fixtureTokens("editor", presetId);
    expect(["color.accent.primary", "color.accent.secondary", "color.accent.tertiary", "color.accent.onSecondary", "color.border.frame"].map((name) => stringToken(tokens, name).toUpperCase())).toEqual(expected);
  });

  it("uses the exact Neon Lime for exactly one token in neon-dark-mode, the tertiary accent, and keeps success a darker tint", () => {
    const lime = "#B4FF00";
    const scopes: readonly RootScope[] = ["editor", "client"];
    const used = scopes.flatMap((scope) =>
      Object.entries(fixtureTokens(scope, "neon-dark-mode"))
        .filter(([, value]) => typeof value === "string" && value.toUpperCase() === lime)
        .map(([name]) => name),
    );
    expect([...new Set(used)]).toEqual(["color.accent.tertiary"]);
    expect(fixtureTokens("editor", "neon-dark-mode")["color.status.success"]).not.toBe(lime);
  });

  it("maps neon-lights surfaces to the palette: app and canvas Vulcan, panel and inspector Persian Blue", () => {
    const tokens = fixtureTokens("editor", "neon-lights");
    expect(tokens["color.surface.app"]).toBe("#111320");
    expect(tokens["color.surface.canvas"]).toBe("#111320");
    expect(tokens["color.surface.panel"]).toBe("#232175");
    expect(tokens["color.surface.inspector"]).toBe("#232175");
    expect(tokens["color.surface.toolbar"]).toBe("#41204D");
    expect(tokens["color.surface.overlay"]).toBe("#2A28AD");
    expect(tokens["color.text.primary"]).toBe("#5EEA91");
  });

  it("maps neon-dark-mode to the palette: Void app, Dark Graphite panel, Electric Purple focus", () => {
    const tokens = fixtureTokens("editor", "neon-dark-mode");
    expect(tokens["color.surface.app"]).toBe("#080808");
    expect(tokens["color.surface.panel"]).toBe("#191919");
    expect(tokens["color.border.focused"]).toBe("#9759FF");
    expect(tokens["color.status.information"]).toBe("#06EFFF");
  });
});
