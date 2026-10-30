/** Reads the shell configuration files as text and data: it shows what is declared, not what Windows draws or allows at run time. */
import { describe, expect, it } from "vitest";
import capabilities from "../../src-tauri/capabilities/default.json";
import tauriConfig from "../../src-tauri/tauri.conf.json";
import { fixtureBaseTokens, numberToken } from "../theme/fixtures";

const [mainWindow, ...otherWindows] = tauriConfig.app.windows;

/**
 * The permissions the window uses: following resizes (listen and unlisten), dragging and the double click on the
 * row (the shell's own drag script calls start dragging and internal toggle maximize), the Maximize and Restore
 * control, Minimize, and the mode read. The capability file must grant exactly these and nothing broader.
 */
const PERMISSIONS: readonly string[] = [
  "core:event:allow-listen",
  "core:event:allow-unlisten",
  "core:window:allow-start-dragging",
  "core:window:allow-internal-toggle-maximize",
  "core:window:allow-toggle-maximize",
  "core:window:allow-minimize",
  "core:window:allow-is-maximized",
];

describe("the window", () => {
  it("declares one window with the system title bar turned off and no maximized or fullscreen start", () => {
    expect(otherWindows).toEqual([]);
    expect(mainWindow?.decorations).toBe(false);
    expect(Object.hasOwn(mainWindow ?? {}, "maximized")).toBe(false);
    expect(Object.hasOwn(mainWindow ?? {}, "fullscreen")).toBe(false);
  });

  it("opens larger than its minimum in both directions, so the wide layout has room the narrow one does not", () => {
    const { width = 0, height = 0, minWidth = 0, minHeight = 0 } = mainWindow ?? {};
    expect(minWidth).toBeGreaterThan(0);
    expect(minHeight).toBeGreaterThan(0);
    expect(width).toBeGreaterThan(minWidth);
    expect(height).toBeGreaterThan(minHeight);
  });

  it("keeps the minimum width at least the home column plus its padding and the minimum height above the frame row, so a token change cannot silently outgrow the window", () => {
    const tokens = fixtureBaseTokens("editor");
    const column = numberToken(tokens, "layout.contentMaxWidth") + 2 * numberToken(tokens, "spacing.stack");
    expect(mainWindow?.minWidth).toBeGreaterThanOrEqual(column);
    expect(mainWindow?.minHeight).toBeGreaterThan(numberToken(tokens, "layout.frameRowHeight"));
  });
});

describe("the capability of the main window", () => {
  it("targets the window the configuration creates, which Tauri labels main when none is given", () => {
    expect(Object.hasOwn(mainWindow ?? {}, "label")).toBe(false);
    expect(capabilities.windows).toEqual(["main"]);
  });

  it("grants exactly the seven permissions the window uses by name, each once, and no permission set", () => {
    expect([...capabilities.permissions].sort()).toEqual([...PERMISSIONS].sort());
    expect(capabilities.permissions.filter((permission) => permission.endsWith(":default"))).toEqual([]);
    expect(new Set(capabilities.permissions).size).toBe(capabilities.permissions.length);
  });

  it("documents every permission it grants, by name, in its description", () => {
    const words = capabilities.description.split(/[^a-z-]+/);
    for (const permission of PERMISSIONS) {
      const name = permission.replace(/^core:(?:window|event):allow-/, "");
      expect(words, name).toContain(name);
    }
  });
});
