import { afterEach, describe, expect, it } from "vitest";
import { applyThemeToRoot, bindThemeToElement, cssVariableName } from "./cssVariables";
import { fixtureDocument, fixtureTokens, numberToken, stringToken } from "./fixtures";
import { readSystemAccessibility, type MediaQueryListLike } from "./systemAccessibility";
import { startTheme } from "./startTheme";
import { ThemeManager } from "./ThemeManager";
import type { ResolvedTheme } from "./types";

function newManager(): ThemeManager {
  return new ThemeManager(fixtureDocument());
}

function element(): HTMLElement {
  return document.createElement("div");
}

afterEach(() => {
  document.documentElement.removeAttribute("style");
});

describe("variable mapping", () => {
  it("maps token names to custom property names deterministically", () => {
    expect(cssVariableName("color.surface.app")).toBe("--color-surface-app");
    expect(cssVariableName("font.size.nodeTitle")).toBe("--font-size-nodeTitle");
  });

  it("gives every default token its own variable", () => {
    const names = [...Object.keys(fixtureTokens("editor")), ...Object.keys(fixtureTokens("client"))].map(
      cssVariableName,
    );
    const distinctTokens = new Set([
      ...Object.keys(fixtureTokens("editor")),
      ...Object.keys(fixtureTokens("client")),
    ]);
    expect(new Set(names).size).toBe(distinctTokens.size);
  });

  it("writes colors as given, lengths with px, durations with ms and counts without units", () => {
    const root = element();
    applyThemeToRoot(newManager().getSnapshot("editor"), root);
    const tokens = fixtureTokens("editor");
    expect(root.style.getPropertyValue("--color-surface-app")).toBe(stringToken(tokens, "color.surface.app"));
    expect(root.style.getPropertyValue("--font-size-body")).toBe(`${numberToken(tokens, "font.size.body")}px`);
    expect(root.style.getPropertyValue("--motion-duration-normalMs")).toBe(
      `${numberToken(tokens, "motion.duration.normalMs")}ms`,
    );
    expect(root.style.getPropertyValue("--grid-majorEvery")).toBe(String(numberToken(tokens, "grid.majorEvery")));
    expect(root.style.getPropertyValue("--font-weight-strong")).toBe(String(numberToken(tokens, "font.weight.strong")));
    expect(root.style.getPropertyValue("--font-lineHeight-heading")).toBe(
      String(numberToken(tokens, "font.lineHeight.heading")),
    );
    expect(root.style.getPropertyValue("--font-family-interface")).toBe(stringToken(tokens, "font.family.interface"));
  });

  it("removes variables that a later snapshot no longer defines", () => {
    const root = element();
    const first: ResolvedTheme = {
      scope: "editor",
      themeId: "a",
      revision: 1,
      accessibility: { textScale: 1, contrast: "normal", reducedMotion: false },
      tokens: { "color.surface.app": "#000000", "color.surface.panel": "#111111" },
    };
    applyThemeToRoot(first, root);
    applyThemeToRoot({ ...first, revision: 2, tokens: { "color.surface.panel": "#222222" } }, root);
    expect(root.style.getPropertyValue("--color-surface-app")).toBe("");
    expect(root.style.getPropertyValue("--color-surface-panel")).toBe("#222222");
  });
});

describe("binding", () => {
  it("applies immediately, follows accepted changes and stops after unsubscribe", () => {
    const manager = newManager();
    const root = element();
    const unbind = bindThemeToElement(manager, "editor", root);
    expect(root.style.getPropertyValue("--color-surface-app")).toBe(
      stringToken(fixtureTokens("editor"), "color.surface.app"),
    );

    manager.setOverrides("editor", { "color.surface.app": "#000000" });
    expect(root.style.getPropertyValue("--color-surface-app")).toBe("#000000");

    manager.setOverrides("editor", { "color.surface.app": "nonsense" });
    expect(root.style.getPropertyValue("--color-surface-app")).toBe("#000000");

    unbind();
    manager.setOverrides("editor", { "color.surface.app": "#222222" });
    expect(root.style.getPropertyValue("--color-surface-app")).toBe("#000000");
  });

  it("keeps the editor variables unchanged when the client scope changes", () => {
    const manager = newManager();
    const editorRoot = element();
    const clientRoot = element();
    bindThemeToElement(manager, "editor", editorRoot);
    bindThemeToElement(manager, "client", clientRoot);
    const editorBefore = editorRoot.getAttribute("style");

    manager.setOverrides("client", { "color.surface.app": "#303030" });

    expect(clientRoot.style.getPropertyValue("--color-surface-app")).toBe("#303030");
    expect(editorRoot.getAttribute("style")).toBe(editorBefore);
    expect(editorRoot.style.getPropertyValue("--color-surface-app")).toBe(
      stringToken(fixtureTokens("editor"), "color.surface.app"),
    );
  });
});

describe("system accessibility", () => {
  const REDUCED = "(prefers-reduced-motion: reduce)";
  const CONTRAST = "(prefers-contrast: more)";

  /** Fake media query list that records listeners so a test can fire a change. */
  class FakeList implements MediaQueryListLike {
    matches: boolean;
    readonly listeners = new Set<() => void>();
    constructor(matches: boolean) {
      this.matches = matches;
    }
    addEventListener(_type: "change", listener: () => void): void {
      this.listeners.add(listener);
    }
    removeEventListener(_type: "change", listener: () => void): void {
      this.listeners.delete(listener);
    }
    flip(matches: boolean): void {
      this.matches = matches;
      for (const listener of [...this.listeners]) listener();
    }
  }

  function fakeWindow(initial: Partial<Record<string, boolean>>): {
    win: { document: Document; matchMedia: (query: string) => MediaQueryListLike };
    lists: Record<string, FakeList>;
  } {
    const lists: Record<string, FakeList> = {
      [REDUCED]: new FakeList(initial[REDUCED] ?? false),
      [CONTRAST]: new FakeList(initial[CONTRAST] ?? false),
    };
    return {
      lists,
      win: {
        document,
        matchMedia: (query) => {
          const list = lists[query];
          if (!list) throw new Error(`Unexpected media query ${query}`);
          return list;
        },
      },
    };
  }

  it("reads reduced motion and increased contrast from media queries", () => {
    expect(readSystemAccessibility(fakeWindow({ [REDUCED]: true, [CONTRAST]: true }).win)).toEqual({
      textScale: 1,
      contrast: "high",
      reducedMotion: true,
    });
    expect(readSystemAccessibility(fakeWindow({}).win)).toEqual({
      textScale: 1,
      contrast: "normal",
      reducedMotion: false,
    });
  });

  it("falls back to defaults when the environment has no media queries", () => {
    expect(readSystemAccessibility({})).toEqual({ textScale: 1, contrast: "normal", reducedMotion: false });
  });

  it("startTheme adopts the system preferences and writes the document root variables", () => {
    const manager = newManager();
    const { win } = fakeWindow({ [REDUCED]: true });
    const stop = startTheme(manager, "home", win);
    expect(document.documentElement.style.getPropertyValue("--motion-duration-normalMs")).toBe("0ms");
    expect(document.documentElement.style.getPropertyValue("--color-surface-app")).toBe(
      stringToken(fixtureTokens("editor"), "color.surface.app"),
    );
    expect(manager.getSnapshot("home").accessibility.reducedMotion).toBe(true);
    stop();
  });

  it("follows later system changes to reduced motion and contrast, keeping the chosen text scale", () => {
    const manager = newManager();
    const { win, lists } = fakeWindow({});
    const stop = startTheme(manager, "home", win);
    manager.setAccessibility("home", { textScale: 1.5, contrast: "normal", reducedMotion: false });

    lists[REDUCED]?.flip(true);
    expect(manager.getSnapshot("home").accessibility).toEqual({
      textScale: 1.5,
      contrast: "normal",
      reducedMotion: true,
    });
    expect(document.documentElement.style.getPropertyValue("--motion-duration-slowMs")).toBe("0ms");

    lists[CONTRAST]?.flip(true);
    expect(manager.getSnapshot("home").accessibility).toEqual({
      textScale: 1.5,
      contrast: "high",
      reducedMotion: true,
    });

    lists[REDUCED]?.flip(false);
    expect(manager.getSnapshot("home").accessibility.reducedMotion).toBe(false);
    stop();
  });

  it("stops following the system and the scope after the returned function is called", () => {
    const manager = newManager();
    const { win, lists } = fakeWindow({});
    const stop = startTheme(manager, "home", win);
    stop();
    expect(lists[REDUCED]?.listeners.size).toBe(0);
    expect(lists[CONTRAST]?.listeners.size).toBe(0);
    const revision = manager.getSnapshot("home").revision;
    lists[REDUCED]?.flip(true);
    expect(manager.getSnapshot("home").revision).toBe(revision);
  });
});
