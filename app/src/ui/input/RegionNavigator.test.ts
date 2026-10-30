import { afterEach, describe, expect, it } from "vitest";
import { mountHtml as mount, elementBy as element } from "../testSupport";
import { REGION, RegionNavigator } from "./RegionNavigator";

afterEach(() => {
  document.body.innerHTML = "";
});

/** The tabs come first in the page, as in the editor, but are visited last. */
const SCREEN = `
  <div data-region="${REGION.tabs}"><button id="tab">tab</button></div>
  <div data-region="${REGION.toolbar}"><button id="tool1">one</button><button id="tool2">two</button></div>
  <aside data-region="${REGION.assets}" tabindex="-1" id="assets"><button id="asset">asset</button></aside>
  <div data-region="${REGION.canvas}" tabindex="0" id="canvas"></div>
  <section data-region="${REGION.inspector}"><input id="field" /></section>`;

function focusedId(): string {
  return document.activeElement?.id ?? "";
}

describe("region navigation", () => {
  it("visits toolbar, assets, canvas, inspector and tabs in that order and wraps in both directions", () => {
    mount(SCREEN);
    const regions = new RegionNavigator(document);
    const forward: string[] = [];
    for (let count = 0; count < 6; count += 1) {
      regions.cycle(1);
      forward.push(focusedId());
    }
    expect(forward).toEqual(["tool1", "asset", "canvas", "field", "tab", "tool1"]);
    const backward: string[] = [];
    for (let count = 0; count < 3; count += 1) {
      regions.cycle(-1);
      backward.push(focusedId());
    }
    expect(backward).toEqual(["tab", "field", "canvas"]);
  });

  it("starts at the first region going forward and at the last going back when focus is on no region", () => {
    mount(SCREEN);
    const regions = new RegionNavigator(document);
    regions.cycle(-1);
    expect(focusedId()).toBe("tab");
    (document.activeElement as HTMLElement).blur();
    regions.cycle(1);
    expect(focusedId()).toBe("tool1");
  });

  it("skips a region that is hidden, absent or has nothing to focus", () => {
    mount(`${SCREEN}<div data-region="${REGION.surface}" hidden><button id="hiddenButton">x</button></div><div data-region="empty"><p>none</p></div>`);
    element("#assets").hidden = true;
    const regions = new RegionNavigator(document);
    const visited: string[] = [];
    for (let count = 0; count < 4; count += 1) {
      regions.cycle(1);
      visited.push(focusedId());
    }
    expect(visited).toEqual(["tool1", "canvas", "field", "tab"]);
  });

  it("returns to the control last focused in a region, and to the first once that control is gone", () => {
    mount(SCREEN);
    const regions = new RegionNavigator(document);
    element("#tool2").focus();
    regions.noteFocus(element("#tool2"));
    regions.cycle(1);
    expect(focusedId()).toBe("asset");
    regions.cycle(-1);
    expect(focusedId()).toBe("tool2");
    element("#tool2").remove();
    regions.cycle(1);
    expect(focusedId()).toBe("tool1");
  });

  it("reports nothing moved when no region can take focus", () => {
    mount("<p>nothing</p>");
    expect(new RegionNavigator(document).cycle(1)).toBe(false);
  });
});
