/**
 * jsdom draws nothing, resolves no custom properties in computed styles and does no layout, so these tests show the
 * structure and classes of the output and which token each class names. They cannot show the painted colors, where
 * the browser puts each box edge on the device pixel grid, or the advance of the real code font, which sizes each run.
 * The stakeholder check and the browser render of the sample piece cover those.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import stylesheet from "./art.css?raw";
import { ART_ROLES, ThemeManager, bindThemeToElement, cssVariableName } from "../theme";
import { fixtureTokens, stringToken } from "../theme/fixtures";
import { parseArtPiece } from "./parsePiece";
import { TextArt } from "./TextArt";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("style");
});

const piece = parseArtPiece("name: small\nlegend: s=sky m=mid .=.\n\ns.m\n.sm\n.sm\n.ms", "small.art.txt");

/** Each text row as [text, class] pairs, read from the DOM the component produced. */
function rowsOf(container: HTMLElement): [string, string][][] {
  const art = container.querySelector(".text-art");
  return [...(art?.children ?? [])].map((row) => [...row.children].map((span): [string, string] => [span.textContent ?? "", span.getAttribute("class") ?? ""]));
}

describe("TextArt", () => {
  it("draws the characters and role classes worked out by hand for the piece", () => {
    const { container } = render(<TextArt piece={piece} />);
    expect(rowsOf(container)).toEqual([
      [
        ["\u2580", "art-upper art-fg-sky"],
        ["\u2584", "art-lower art-fg-sky"],
        ["\u2588", "art-full art-fg-mid"],
      ],
      [
        [" ", ""],
        ["\u2580", "art-upper art-fg-sky art-bg-mid"],
        ["\u2580", "art-upper art-fg-mid art-bg-sky"],
      ],
    ]);
  });

  it("keeps each run's characters in a child that the stylesheet hides, and paints nothing in it", () => {
    const { container } = render(<TextArt piece={piece} />);
    const runs = [...container.querySelectorAll(".text-art-row > span")];
    expect(runs).toHaveLength(6);
    for (const run of runs) {
      expect(run.children).toHaveLength(1);
      expect(run.children[0]?.className).toBe("art-glyphs");
      expect(run.children[0]?.textContent).toBe(run.textContent);
    }
  });

  it("is hidden from assistive technology and has nothing to focus or press", () => {
    const { container } = render(<TextArt piece={piece} />);
    const art = container.querySelector(".text-art");
    expect(art?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("[tabindex], a, button, input, select, textarea, [contenteditable], [role]")).toHaveLength(0);
  });

  it("carries no inline style and no color value, so a color can only come from a token", () => {
    const { container } = render(<TextArt piece={piece} />);
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  });

  it("draws the same markup again for the same piece", () => {
    const first = render(<TextArt piece={piece} />).container.innerHTML;
    cleanup();
    expect(render(<TextArt piece={piece} />).container.innerHTML).toBe(first);
  });
});

/** The custom property that a role class reads, taken from the stylesheet. */
function variableOf(selector: string): string {
  const body = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(stylesheet)?.[1] ?? "";
  const name = /var\((--[A-Za-z0-9-]+)\)/.exec(body)?.[1];
  if (name === undefined) throw new Error(`${selector} reads no custom property`);
  return name;
}

describe("changing the preset recolors the art without touching its markup", () => {
  const manager = new ThemeManager(themeDefaults);
  const presets = manager.listPresets().map((preset) => preset.id);

  it("has two presets to switch between", () => {
    expect(presets.length).toBeGreaterThanOrEqual(2);
  });

  it("writes to the root, for the custom property each role class reads, the value its preset sets and a different one per preset, with identical markup (checks the class-to-token map and the written properties, not painted colors)", () => {
    const { container } = render(<TextArt piece={piece} />);
    const markup = container.innerHTML;
    const unbind = bindThemeToElement(manager, "home", document.documentElement);
    const seen = new Map<string, string[]>();
    for (const id of presets) {
      expect(manager.selectPreset("home", id).ok).toBe(true);
      const tokens = fixtureTokens("editor", id);
      for (const role of ART_ROLES) {
        for (const selector of [`.art-fg-${role}`, `.art-bg-${role}`]) {
          const variable = variableOf(selector);
          expect(variable).toBe(cssVariableName(`color.art.${role}`));
          const resolved = document.documentElement.style.getPropertyValue(variable);
          expect(resolved.toUpperCase()).toBe(stringToken(tokens, `color.art.${role}`).toUpperCase());
          seen.set(selector, [...(seen.get(selector) ?? []), resolved]);
        }
      }
      expect(container.innerHTML).toBe(markup);
    }
    unbind();
    expect(seen.size).toBe(ART_ROLES.length * 2);
    for (const [selector, values] of seen) expect(new Set(values).size, selector).toBe(presets.length);
  });
});
