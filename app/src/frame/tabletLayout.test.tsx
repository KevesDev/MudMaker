/** Reads stylesheet text and token data: it shows what is declared, not what is drawn or how a finger feels. */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import canvasSheet from "../canvas/canvas.css?raw";
import editorSheet from "../editor/editor.css?raw";
import { editorToken, stubMatchMedia } from "../editor/editorTestSupport";
import tabStripSource from "../editor/TabStrip.tsx?raw";
import navSheet from "../nav/nav.css?raw";
import { SCOPE_IDS, ThemeManager } from "../theme";
import uiSheet from "../ui/ui.css?raw";
import frameSheet from "./frame.css?raw";
import { tabletQuery, useTabletLayout, useTabletLayoutMark } from "./useTabletLayout";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-layout");
});

const withoutComments = (sheet: string): string => sheet.replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of every rule whose selector is exactly this one. */
function declarations(sheet: string, selector: string): string {
  const bodies = [...withoutComments(sheet).matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((rule) => (rule[1] ?? "").replace(/\s+/g, " ").trim() === selector).map((rule) => rule[2] ?? "");
  if (bodies.length === 0) throw new Error(`No rule for ${selector}`);
  return bodies.join("\n");
}

describe("hit areas at the tablet layout", () => {
  it("make the touch size larger than the pointer size under every built-in preset and scope", () => {
    const manager = new ThemeManager(themeDefaults);
    for (const preset of manager.listPresets()) {
      for (const scope of SCOPE_IDS) {
        expect(manager.selectPreset(scope, preset.id).ok).toBe(true);
        const tokens = manager.getSnapshot(scope).tokens;
        expect(Number(tokens["interaction.touchHitSize"]), `${scope}/${preset.id}`).toBeGreaterThan(Number(tokens["interaction.pointerHitSize"]));
      }
    }
  });

  it("grow the shared control hit area to the touch token in the tablet layout and for a coarse pointer, without setting a visual size", () => {
    expect(declarations(uiSheet, ".ui-hit")).toMatch(/min-width:\s*var\(--interaction-pointerHitSize\)[\s\S]*min-height:\s*var\(--interaction-pointerHitSize\)/);
    const tablet = declarations(frameSheet, ':root[data-layout="tablet"] .ui-hit');
    expect(tablet).toMatch(/min-width:\s*var\(--interaction-touchHitSize\)/);
    expect(tablet).toMatch(/min-height:\s*var\(--interaction-touchHitSize\)/);
    expect(tablet).not.toMatch(/(?<![-\w])(?:width|height|padding|font-size)\s*:/);
    expect(uiSheet).toMatch(/@media \(pointer: coarse\)\s*\{\s*\.ui-hit\s*\{[^}]*var\(--interaction-touchHitSize\)/);
  });

  it("reach the tabs and their close controls through the shared hit class, which they do not resize", () => {
    expect([...tabStripSource.matchAll(/className="ui-hit editor-tab(?:-close)?"/g)]).toHaveLength(2);
    expect(declarations(editorSheet, ".editor-tab, .editor-tab-close")).not.toMatch(/(?<![-\w])(?:width|height)\s*:/);
  });
});

describe("the tablet layout itself", () => {
  it("is asked for by the theme's tablet width or a coarse primary pointer", () => {
    const media = stubMatchMedia(false);
    renderHook(() => useTabletLayout());
    expect([...new Set(media.queries)]).toEqual([tabletQuery(editorToken("layout.tabletWidth"))]);
    expect(tabletQuery(500)).toBe("(max-width: 500px), (pointer: coarse)");
  });

  it("marks the document while it applies, and clears the mark when the window widens or goes", () => {
    const media = stubMatchMedia(true);
    const { unmount } = renderHook(() => useTabletLayoutMark());
    expect(document.documentElement.dataset["layout"]).toBe("tablet");
    act(() => media.set(false));
    expect(document.documentElement.dataset["layout"]).toBeUndefined();
    act(() => media.set(true));
    expect(document.documentElement.dataset["layout"]).toBe("tablet");
    unmount();
    expect(document.documentElement.dataset["layout"]).toBeUndefined();
  });

  it("lies the end region over the work area on the popup layer, within the width of the area", () => {
    const body = declarations(editorSheet, ".editor-split-secondary-overlay");
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/z-index:\s*var\(--layer-popup\)/);
    expect(body).toMatch(/max-inline-size:\s*100%/);
  });
});

describe("no action is reachable only by hover", () => {
  const sheets: readonly (readonly [string, string])[] = [
    ["ui.css", uiSheet],
    ["frame.css", frameSheet],
    ["editor.css", editorSheet],
    ["canvas.css", canvasSheet],
    ["nav.css", navSheet],
  ];
  /** Properties that change what is shown or whether it exists, as opposed to how a visible control is tinted. */
  const REVEALING = /(?<![-\w])(?:display|visibility|opacity|content|transform|width|height|clip-path|pointer-events)\s*:/;

  function hoverRevealing(sheet: string): string[] {
    return [...withoutComments(sheet).matchAll(/([^{}]*:hover[^{}]*)\{([^}]*)\}/g)].filter((rule) => REVEALING.test(rule[2] ?? "")).map((rule) => (rule[1] ?? "").trim());
  }

  it("catches a rule that shows something on hover, and finds none in the shipped stylesheets", () => {
    expect(hoverRevealing(".a:hover .b { display: block; }")).toEqual([".a:hover .b"]);
    expect(hoverRevealing(".a:hover { background: red; }")).toEqual([]);
    for (const [name, sheet] of sheets) expect(hoverRevealing(sheet), name).toEqual([]);
  });
});
