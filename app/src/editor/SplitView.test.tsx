import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiProvider } from "../ui";
import { createTestUi, renderWithUi } from "../ui/testSupport";
import { clampEndSize } from "./splitMath";
import { SplitView } from "./SplitView";
import { editorToken, stubBox } from "./editorTestSupport";

const MIN = editorToken("layout.panelMinSize");
const DEFAULT = editorToken("layout.panelDefaultSize");
const STEP = editorToken("layout.splitStep");
const LINE = editorToken("shape.borderWidth");
const TOTAL = 1000;
const capture = vi.fn();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  capture.mockReset();
});

function mountSplit(secondary: boolean = true) {
  stubBox(".editor-split", { width: TOTAL });
  HTMLElement.prototype.setPointerCapture = capture;
  const ui = createTestUi();
  renderWithUi(ui, <SplitView separatorLabel="Resize panels" primary={<p>Left</p>} secondary={secondary ? <p>Right</p> : undefined} />);
  const separator = (): HTMLElement => screen.getByRole("separator", { name: "Resize panels" });
  const primarySize = (): number => Number(separator().getAttribute("aria-valuenow"));
  return { separator, primarySize, ui };
}

describe("clamping the end region", () => {
  it.each([
    [1000, 50, 160, 1, 160],
    [1000, 900, 160, 1, 839],
    [1000, 300, 160, 1, 300],
    [300, 250, 160, 1, 160],
    [0, 20, 160, 1, 160],
  ])("a %i wide split asked for %i with least %i and a %i divider gives %i", (total, requested, min, divider, expected) => {
    expect(clampEndSize(total, requested, min, divider)).toBe(expected);
  });
});

describe("the separator", () => {
  it("draws no separator while there is no end region, and exposes the splitter role, name and values when there is", () => {
    const { ui } = mountSplit(false);
    expect(screen.queryByRole("separator")).toBeNull();
    expect(ui.diagnostics).toEqual([]);
    cleanup();
    const { separator } = mountSplit();
    expect(separator().getAttribute("aria-orientation")).toBe("vertical");
    expect(separator().tabIndex).toBe(0);
    expect(separator().getAttribute("aria-valuemin")).toBe(String(MIN));
    expect(separator().getAttribute("aria-valuemax")).toBe(String(TOTAL - LINE - MIN));
    expect(separator().getAttribute("aria-valuenow")).toBe(String(TOTAL - LINE - DEFAULT));
  });

  it("moves by one step per arrow, jumps to both limits with Home and End, and never passes a minimum", () => {
    const { separator, primarySize } = mountSplit();
    const start = primarySize();
    fireEvent.keyDown(separator(), { key: "ArrowLeft" });
    expect(primarySize()).toBe(start - STEP);
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    expect(primarySize()).toBe(start + STEP);
    fireEvent.keyDown(separator(), { key: "Home" });
    expect(primarySize()).toBe(MIN);
    fireEvent.keyDown(separator(), { key: "ArrowLeft" });
    expect(primarySize()).toBe(MIN);
    fireEvent.keyDown(separator(), { key: "End" });
    expect(primarySize()).toBe(TOTAL - LINE - MIN);
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    expect(primarySize()).toBe(TOTAL - LINE - MIN);
  });

  it("leaves other keys to the page", () => {
    const { separator, primarySize } = mountSplit();
    const start = primarySize();
    expect(fireEvent.keyDown(separator(), { key: "ArrowUp" })).toBe(true);
    expect(primarySize()).toBe(start);
  });

  it("resizes by dragging with the pointer, captures the pointer, and agrees with the keyboard on every step and limit", () => {
    const { separator, primarySize } = mountSplit();
    const start = primarySize();
    const drag = (to: number): void => {
      fireEvent.pointerDown(separator(), { pointerId: 1, pointerType: "mouse", clientX: 500 });
      fireEvent.pointerMove(separator(), { pointerId: 1, pointerType: "mouse", clientX: to });
      fireEvent.pointerUp(separator(), { pointerId: 1, pointerType: "mouse", clientX: to });
    };
    drag(500 - STEP);
    expect(capture).toHaveBeenCalledWith(1);
    expect(primarySize()).toBe(start - STEP);
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    expect(primarySize()).toBe(start + STEP);
    drag(-5000);
    expect(primarySize()).toBe(MIN);
    drag(5500);
    expect(primarySize()).toBe(TOTAL - LINE - MIN);
  });

  it("ignores moves from a pointer that did not press the separator and moves after the press ended", () => {
    const { separator, primarySize } = mountSplit();
    const start = primarySize();
    fireEvent.pointerMove(separator(), { pointerId: 1, pointerType: "mouse", clientX: 100 });
    fireEvent.pointerDown(separator(), { pointerId: 1, pointerType: "touch", clientX: 500 });
    fireEvent.pointerMove(separator(), { pointerId: 2, pointerType: "touch", clientX: 100 });
    expect(primarySize()).toBe(start);
    fireEvent.pointerUp(separator(), { pointerId: 1, pointerType: "touch", clientX: 500 });
    fireEvent.pointerMove(separator(), { pointerId: 1, pointerType: "touch", clientX: 100 });
    expect(primarySize()).toBe(start);
  });

  it("keeps the chosen width while the end region is absent and returns", () => {
    stubBox(".editor-split", { width: TOTAL });
    const ui = createTestUi();
    const view = (secondary: boolean) => <SplitView separatorLabel="Resize panels" primary={<p>Left</p>} secondary={secondary ? <p>Right</p> : null} />;
    const { rerender } = renderWithUi(ui, view(true));
    fireEvent.keyDown(screen.getByRole("separator"), { key: "End" });
    const provided = (secondary: boolean) => <UiProvider runtime={ui.runtime}>{view(secondary)}</UiProvider>;
    rerender(provided(false));
    expect(screen.queryByRole("separator")).toBeNull();
    act(() => rerender(provided(true)));
    expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(String(TOTAL - LINE - MIN));
  });
});
