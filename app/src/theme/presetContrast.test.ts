import { describe, expect, it } from "vitest";
import { fixturePresetIds, fixtureTokens, stringToken, wcagRatio, type RootScope } from "./fixtures";

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
const CLIENT_SURFACES = names("color.surface", ["app", "panel"]);
const TERMINAL_BACKGROUND = ["color.terminal.background"];
const ANSI = Array.from({ length: 16 }, (_, index) => `color.terminal.ansi${index}`);

const EDITOR_REQUIREMENTS: readonly Requirement[] = [
  { group: "text", foregrounds: names("color.text", ["primary", "secondary", "muted", "disabled"]), backgrounds: EDITOR_SURFACES, minimum: TEXT },
  { group: "status", foregrounds: names("color.status", ["success", "warning", "error", "information"]), backgrounds: EDITOR_SURFACES, minimum: TEXT },
  { group: "borders", foregrounds: names("color.border", ["normal", "focused", "invalid"]), backgrounds: EDITOR_SURFACES, minimum: GRAPHIC },
  { group: "focus", foregrounds: ["color.interaction.focus"], backgrounds: EDITOR_SURFACES, minimum: GRAPHIC },
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

describe.each(fixturePresetIds())("preset %s contrast", (presetId) => {
  it("meets the contract contrast for every editor text, status, border, focus and graph token", () => {
    expect(violations(fixtureTokens("editor", presetId), EDITOR_REQUIREMENTS)).toEqual([]);
  });

  it("meets the contract contrast for every client text, status, border, terminal and map token", () => {
    expect(violations(fixtureTokens("client", presetId), CLIENT_REQUIREMENTS)).toEqual([]);
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

describe("preset palette rules", () => {
  it("uses Neon Lime for exactly one token in neon-dark-mode", () => {
    const lime = "#AAFF00";
    const scopes: readonly RootScope[] = ["editor", "client"];
    const used = scopes.flatMap((scope) =>
      Object.entries(fixtureTokens(scope, "neon-dark-mode"))
        .filter(([, value]) => typeof value === "string" && value.toUpperCase() === lime)
        .map(([name]) => `${scope}:${name}`),
    );
    expect(used).toEqual(["editor:color.status.success"]);
  });

  it("maps neon-lights surfaces to the palette: app and canvas Vulcan, panel and inspector Persian Blue", () => {
    const tokens = fixtureTokens("editor", "neon-lights");
    expect(tokens["color.surface.app"]).toBe("#1C291E");
    expect(tokens["color.surface.canvas"]).toBe("#1C291E");
    expect(tokens["color.surface.panel"]).toBe("#222174");
    expect(tokens["color.surface.inspector"]).toBe("#222174");
    expect(tokens["color.surface.toolbar"]).toBe("#45214D");
    expect(tokens["color.surface.overlay"]).toBe("#2A28AD");
    expect(tokens["color.text.primary"]).toBe("#5DEA90");
  });

  it("maps neon-dark-mode to the palette: Void app, Dark Graphite panel, Electric Purple focus", () => {
    const tokens = fixtureTokens("editor", "neon-dark-mode");
    expect(tokens["color.surface.app"]).toBe("#080808");
    expect(tokens["color.surface.panel"]).toBe("#141414");
    expect(tokens["color.border.focused"]).toBe("#9B5CFF");
    expect(tokens["color.status.information"]).toBe("#00F5FF");
  });
});
