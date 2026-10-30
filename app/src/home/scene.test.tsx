/**
 * jsdom lays nothing out and paints nothing, so these tests show the structure of the scene, which rules the style
 * declares and the numbers worked out from the real tokens. Where each plate really falls on a window, how the art
 * crops at the 480 by 360 minimum and how the landscape looks next to the reference are checked by hand.
 */
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import stylesheet from "./home.css?raw";
import { cellRuns } from "../art/artRuns";
import { APP_MARK, ICONS, SCENE_PIECES } from "../art/library";
import { pixelRole } from "../art/parsePiece";
import { ART_ROLES } from "../theme";
import { fixtureTokens, fixturePresetIds, stringToken, wcagRatio } from "../theme/fixtures";
import { generatedLayers, gridFor } from "./sceneLayout";
import { healthyHome, renderApp } from "./homeTestSupport";

let unbind: (() => void) | null = null;

async function openSplash(): Promise<void> {
  unbind = renderApp(healthyHome()).unbind;
  await screen.findByRole("heading", { level: 1 });
  await act(async () => undefined);
}

afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
});

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(",\n", ",\\s*");
  const matches = [...stylesheet.matchAll(new RegExp(`(?:^|\\}|\\*/)\\s*${escaped}\\s*\\{([^}]*)\\}`, "g"))];
  if (matches.length !== 1) throw new Error(`Expected one rule for ${selector}, found ${matches.length}`);
  return matches[0]?.[1] ?? "";
}

describe("the landscape layer", () => {
  it("is the first thing on the stage, hidden from assistive technology, inert and holding nothing to focus or press", async () => {
    await openSplash();
    const stage = document.querySelector(".home") as HTMLElement;
    const scene = stage.firstElementChild as HTMLElement;
    expect(scene.className).toBe("home-scene");
    expect(scene.getAttribute("aria-hidden")).toBe("true");
    expect(scene.hasAttribute("inert")).toBe(true);
    expect(scene.querySelectorAll("[tabindex], a, button, input, select, textarea, [contenteditable], [role]")).toHaveLength(0);
    expect(scene.querySelectorAll(".home-scene-layer > .text-art")).toHaveLength(4);
  });

  it("anchors each layer to an edge, and takes no pointer, no overflow and no stacking number", () => {
    const anchors: Record<string, string> = {
      "top-left": "top: 0; left: 0",
      "bottom-left": "bottom: 0; left: 0",
      "bottom-right": "right: 0; bottom: 0",
    };
    for (const [anchor, declarations] of Object.entries(anchors)) {
      expect(ruleBody(`.home-scene-layer[data-anchor="${anchor}"]`).replace(/\s+/g, " ").trim()).toBe(`${declarations.split("; ").join("; ")};`);
    }
    const scene = ruleBody(".home-scene");
    expect(scene).toMatch(/position:\s*absolute/);
    expect(scene).toMatch(/inset:\s*0/);
    expect(scene).toMatch(/overflow:\s*hidden/);
    expect(scene).toMatch(/pointer-events:\s*none/);
    expect(stylesheet).not.toMatch(/z-index/);
  });
});

describe("the clear zone", () => {
  it("puts every line of text on the screen on a plate, never on the scene", async () => {
    await openSplash();
    const found: Text[] = [];
    const walk = (node: Node): void => {
      if (node instanceof Element && (node.classList.contains("home-scene") || node.classList.contains("ui-visually-hidden") || node.getAttribute("role") === "tooltip")) return;
      if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "") found.push(node as Text);
      node.childNodes.forEach(walk);
    };
    walk(document.querySelector(".home") as Element);
    expect(found.length).toBeGreaterThan(8);
    const loose = found.filter((text) => text.parentElement?.closest(".home-header, .home-zone") === null).map((text) => text.textContent);
    expect(loose).toEqual([]);
  });

  it("gives the plates the opaque canvas color and a soft edge in it, including the version when it hangs beside the banner", () => {
    const plate = ruleBody('.home-header,\n.home-zone,\n.home-version[data-placement="beside"]');
    expect(plate).toMatch(/background:\s*var\(--color-surface-canvas\);/);
    expect(plate).toMatch(/box-shadow:\s*0 0 var\(--spacing-stack\) var\(--spacing-stack\) var\(--color-surface-canvas\);/);
  });

  it.each(fixturePresetIds())("shows why the plate is needed and what it gives in %s: primary and secondary text fail against some art role, and pass against the plate", (presetId) => {
    const tokens = fixtureTokens("editor", presetId);
    const canvas = stringToken(tokens, "color.surface.canvas");
    for (const text of ["color.text.primary", "color.text.secondary"]) {
      const color = stringToken(tokens, text);
      const failing = ART_ROLES.filter((role) => wcagRatio(color, stringToken(tokens, `color.art.${role}`)) < 4.5);
      expect(failing.length, `${text} over the art roles`).toBeGreaterThan(0);
      expect(wcagRatio(color, canvas), `${text} over the plate`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("cost at a 1920 by 1080 window", () => {
  /** The area under a 40 pixel frame row and the 1 pixel border, at a cell of 8 by 13 pixels, which the code font token's default size gives. */
  const grid = gridFor({ width: 1920 - 2, height: 1080 - 40 - 2 }, { width: 8, height: 13 });
  /** About 15 percent over the 2348 runs measured, so a layer that stops merging is caught and a small change is not. */
  const RUN_BUDGET = 2700;

  it("draws the whole scene in fewer runs than the budget, and far fewer than it has cells", () => {
    expect(grid).not.toBeNull();
    const { stars, lake } = generatedLayers(grid ?? { cols: 0, rows: 0 });
    const pieces = [stars, lake, SCENE_PIECES.castle, SCENE_PIECES.mountains];
    const runs = pieces.reduce((sum, piece) => sum + cellRuns(piece).reduce((rows, row) => rows + row.length, 0), 0);
    const cells = pieces.reduce((sum, piece) => sum + (piece.width * piece.height) / 2, 0);
    expect(runs).toBeLessThan(RUN_BUDGET);
    expect(runs).toBeLessThan(cells / 8);
  });
});

describe("the icons and the application mark", () => {
  it("sit before the label of every action, hidden from assistive technology, and the name stays the label", async () => {
    await openSplash();
    const names = ["Create", "Play", "Host", "Settings", "Quit"];
    for (const name of names) {
      const button = screen.getByRole("button", { name });
      const leading = button.querySelector(":scope > .ui-button-leading");
      expect(leading?.getAttribute("aria-hidden"), name).toBe("true");
      expect(leading?.querySelectorAll(".text-art.text-art-icon"), name).toHaveLength(1);
      expect(button.firstElementChild, name).toBe(leading);
    }
  });

  it("puts the mark in the frame row's leading slot, before the title and out of the tab order", async () => {
    await openSplash();
    const slot = document.querySelector(".app-frame-leading") as HTMLElement;
    expect(slot.nextElementSibling?.classList.contains("app-frame-title")).toBe(true);
    expect(slot.querySelectorAll(".text-art.text-art-icon")).toHaveLength(1);
    expect(slot.querySelectorAll("button, [tabindex], a")).toHaveLength(0);
    expect(slot.querySelector(".text-art")?.getAttribute("aria-hidden")).toBe("true");
    expect(slot.querySelectorAll(".text-art-row")).toHaveLength(APP_MARK.height / 2);
  });

  it("gives the three workspace icons the label's color through the one role they are drawn in", () => {
    const first = ICONS.document.pixels.find((pixel) => pixel !== 0) ?? 0;
    const role = pixelRole(first);
    expect(role).not.toBeNull();
    expect(ruleBody(`.home-action .ui-button-leading .art-fg-${role}`)).toMatch(/color:\s*var\(--action-text\);/);
  });
});
