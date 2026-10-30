import { focusableWithin } from "./dom";

/** The part of a screen a keyboard user can jump to; screens mark their regions with `data-region`. */
export const REGION = {
  toolbar: "toolbar",
  assets: "assets",
  canvas: "canvas",
  inspector: "inspector",
  tabs: "tabs",
  surface: "surface",
} as const;

/** The order F6 visits the regions that are on screen. */
const REGION_ORDER: readonly string[] = [REGION.toolbar, REGION.assets, REGION.canvas, REGION.inspector, REGION.tabs, REGION.surface];
const REGION_SELECTOR = "[data-region]";

/**
 * Moves keyboard focus from region to region of the screen and remembers the control last focused in each,
 * so coming back to a region lands where the user left it. A region that is hidden, absent or has nothing
 * to focus is skipped.
 */
export class RegionNavigator {
  private readonly lastFocused = new WeakMap<Element, HTMLElement>();

  constructor(private readonly document: Document) {}

  /** Called for every focus change so the region around the target remembers it. */
  noteFocus(target: EventTarget | null): void {
    if (!(target instanceof HTMLElement)) return;
    const region = target.closest(REGION_SELECTOR);
    if (region !== null && region !== target) this.lastFocused.set(region, target);
  }

  /** Focuses the next region (1) or the previous one (-1), wrapping around; returns whether focus was moved. */
  cycle(step: 1 | -1): boolean {
    const regions = this.reachable();
    if (regions.length === 0) return false;
    const current = regions.findIndex((region) => region.contains(this.document.activeElement));
    const index = current < 0 ? (step === 1 ? 0 : regions.length - 1) : (current + step + regions.length) % regions.length;
    const region = regions[index];
    const target = region === undefined ? null : this.focusTarget(region);
    if (target === null) return false;
    target.focus();
    return this.document.activeElement === target;
  }

  private reachable(): HTMLElement[] {
    const rank = (region: HTMLElement): number => {
      const position = REGION_ORDER.indexOf(region.dataset["region"] ?? "");
      return position < 0 ? REGION_ORDER.length : position;
    };
    return [...this.document.querySelectorAll<HTMLElement>(REGION_SELECTOR)]
      .filter((region) => region.isConnected && region.closest("[hidden]") === null && this.focusTarget(region) !== null)
      .sort((first, second) => rank(first) - rank(second));
  }

  private focusTarget(region: HTMLElement): HTMLElement | null {
    const remembered = this.lastFocused.get(region);
    if (remembered?.isConnected === true && region.contains(remembered) && remembered.closest("[hidden]") === null) return remembered;
    const inside = focusableWithin(region)[0];
    if (inside !== undefined) return inside;
    return region.hasAttribute("tabindex") ? region : null;
  }
}
