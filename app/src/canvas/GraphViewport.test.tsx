/** jsdom draws nothing and has no real layout, so sizes and the drawing context are supplied by the test; pixels, touch feel and the browser's own scrolling are checked by hand. */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { themeManager } from "../theme";
import { createUiRuntime, loadShippedRegistry, UiProvider, type UiDiagnostic } from "../ui";
import { CANVAS_LIMITS } from "./canvasConfig";
import { fakeContext } from "./canvasTestSupport";
import { CanvasState } from "./CanvasState";
import { GraphViewport } from "./GraphViewport";
import { watchDevicePixelRatio } from "./devicePixelRatio";

const registry = loadShippedRegistry();
const label = (id: string): string => registry.requireControl(id).label;
const PAPER_LEFT = 10;
const PAPER_TOP = 20;
const RANGE = { min: CANVAS_LIMITS.minZoom, max: CANVAS_LIMITS.maxZoom };
let paperBox = { width: 480, height: 240 };
let drawing = fakeContext();
let resizeCallback: (() => void) | null = null;
let ratioQueries: { query: string; listeners: Set<() => void> }[] = [];
const diagnostics: UiDiagnostic[] = [];
const capture = vi.fn();
const initialPreset = themeManager.getSnapshot("editor").themeId;

beforeEach(() => {
  paperBox = { width: 480, height: 240 };
  drawing = fakeContext();
  resizeCallback = null;
  ratioQueries = [];
  diagnostics.length = 0;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => drawing.ctx) as unknown as HTMLCanvasElement["getContext"]);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const sized = this.classList.contains("graph-paper");
    const [width, height, left, top] = sized ? [paperBox.width, paperBox.height, PAPER_LEFT, PAPER_TOP] : [0, 0, 0, 0];
    return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON: () => ({}) };
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resizeCallback = callback;
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => {
    const entry = { query, listeners: new Set<() => void>() };
    ratioQueries.push(entry);
    return { addEventListener: (_type: string, listener: () => void) => entry.listeners.add(listener), removeEventListener: (_type: string, listener: () => void) => entry.listeners.delete(listener) };
  });
  HTMLElement.prototype.setPointerCapture = capture;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  capture.mockReset();
  themeManager.selectPreset("editor", initialPreset);
  document.documentElement.removeAttribute("data-input-modality");
});

function mount(options: { strict?: boolean } = {}) {
  const runtime = createUiRuntime({ registry, document, diagnostics: (record) => diagnostics.push(record) });
  const state = new CanvasState(RANGE);
  render(
    <UiProvider runtime={runtime}>
      <GraphViewport state={state} />
    </UiProvider>,
    { reactStrictMode: options.strict === true },
  );
  const paper = screen.getByRole("application", { name: label("editor.graph.01") });
  return { state, paper, runtime, canvas: paper.querySelector("canvas") as HTMLCanvasElement };
}

const view = (state: CanvasState) => state.getSnapshot().viewport;
const forget = (): void => {
  drawing.calls.length = 0;
  drawing.strokes.length = 0;
};
const flush = (): Promise<void> => act(async () => undefined);

describe("what the canvas shows", () => {
  it("is one focusable, named surface holding a decorative canvas, and the two toggles named by the catalog and both on", () => {
    const { paper, canvas } = mount();
    expect(paper.tabIndex).toBe(0);
    expect(canvas.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("switch", { name: label("editor.graph.10") }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: label("editor.graph.09") }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByRole("switch")).toHaveLength(2);
    expect(diagnostics).toEqual([]);
  });

  it("draws the grid sized to the device: a 480 by 240 view at ratio 2 is a 960 by 480 canvas with token-colored lines", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const { canvas } = mount();
    expect([canvas.width, canvas.height]).toEqual([960, 480]);
    const tokens = themeManager.getSnapshot("editor").tokens;
    const last = drawing.strokes.slice(-2);
    expect(last.map((stroke) => stroke.color)).toEqual([tokens["color.graph.grid.minor"], tokens["color.graph.grid.major"]]);
    expect(last.every((stroke) => stroke.width === 2)).toBe(true);
  });

  it("redraws in the colors of a preset chosen afterwards", async () => {
    mount();
    const other = themeManager.listPresets().find((preset) => preset.id !== initialPreset);
    expect(other).toBeDefined();
    const before = themeManager.getSnapshot("editor").tokens;
    forget();
    act(() => {
      expect(themeManager.selectPreset("editor", other?.id ?? "").ok).toBe(true);
    });
    const after = themeManager.getSnapshot("editor").tokens;
    expect(after["color.graph.grid.minor"]).not.toBe(before["color.graph.grid.minor"]);
    expect(drawing.strokes.slice(-2).map((stroke) => stroke.color)).toEqual([after["color.graph.grid.minor"], after["color.graph.grid.major"]]);
  });
});

describe("the same view from wheel, drag and keys", () => {
  it("zooms about the pointer with the wheel and keeps the world point under it", () => {
    const { state, paper } = mount();
    const anchor = { x: 200, y: 100 };
    const notPrevented = fireEvent.wheel(paper, { deltaY: -100, clientX: PAPER_LEFT + anchor.x, clientY: PAPER_TOP + anchor.y });
    expect(notPrevented).toBe(false);
    const zoom = Math.exp(100 * CANVAS_LIMITS.wheelZoomPerPixel);
    expect(view(state).zoom).toBeCloseTo(zoom, 9);
    expect(view(state).originX).toBeCloseTo(anchor.x - anchor.x / zoom, 9);
    expect(view(state).originY).toBeCloseTo(anchor.y - anchor.y / zoom, 9);
  });

  it("turns a wheel that reports lines into the same zoom as one that reports the equivalent pixels", () => {
    const pixels = mount();
    fireEvent.wheel(pixels.paper, { deltaY: -CANVAS_LIMITS.wheelLinePixels * 3, deltaMode: 0, clientX: PAPER_LEFT, clientY: PAPER_TOP });
    cleanup();
    const lines = mount();
    fireEvent.wheel(lines.paper, { deltaY: -3, deltaMode: 1, clientX: PAPER_LEFT, clientY: PAPER_TOP });
    expect(view(lines.state)).toEqual(view(pixels.state));
  });

  it("pans by dragging with a mouse or a pen, captures the pointer, and ignores other buttons, other pointers and moves after release", () => {
    const { state, paper } = mount();
    const drag = (pointerType: string, from: number, to: number, extra: Record<string, number> = {}): void => {
      fireEvent.pointerDown(paper, { pointerId: 1, pointerType, clientX: from, clientY: 50, ...extra });
      fireEvent.pointerMove(paper, { pointerId: 1, pointerType, clientX: to, clientY: 50 });
      fireEvent.pointerUp(paper, { pointerId: 1, pointerType, clientX: to, clientY: 50 });
    };
    drag("mouse", 300, 250);
    expect(capture).toHaveBeenCalledWith(1);
    expect(view(state)).toEqual({ originX: 50, originY: 0, zoom: 1 });
    drag("pen", 100, 130);
    expect(view(state)).toEqual({ originX: 20, originY: 0, zoom: 1 });
    fireEvent.pointerMove(paper, { pointerId: 1, pointerType: "mouse", clientX: 900, clientY: 900 });
    expect(view(state).originX).toBe(20);
    fireEvent.pointerDown(paper, { pointerId: 2, pointerType: "mouse", clientX: 0, clientY: 0, button: 2 });
    fireEvent.pointerMove(paper, { pointerId: 2, pointerType: "mouse", clientX: 40, clientY: 0 });
    expect(view(state).originX).toBe(20);
    fireEvent.pointerDown(paper, { pointerId: 3, pointerType: "mouse", clientX: 0, clientY: 0 });
    fireEvent.pointerMove(paper, { pointerId: 4, pointerType: "mouse", clientX: 40, clientY: 0 });
    expect(view(state).originX).toBe(20);
    fireEvent.pointerCancel(paper, { pointerId: 3, pointerType: "mouse" });
    fireEvent.pointerMove(paper, { pointerId: 3, pointerType: "mouse", clientX: 80, clientY: 0 });
    expect(view(state).originX).toBe(20);
  });

  it("ignores a pen that only hovers, and the barrel and eraser buttons of a pen", () => {
    const { state, paper } = mount();
    fireEvent.pointerMove(paper, { pointerId: 1, pointerType: "pen", clientX: 200, clientY: 50 });
    fireEvent.pointerMove(paper, { pointerId: 1, pointerType: "pen", clientX: 100, clientY: 50 });
    for (const button of [2, 5]) {
      fireEvent.pointerDown(paper, { pointerId: 1, pointerType: "pen", clientX: 200, clientY: 50, button });
      fireEvent.pointerMove(paper, { pointerId: 1, pointerType: "pen", clientX: 100, clientY: 50 });
      fireEvent.pointerUp(paper, { pointerId: 1, pointerType: "pen", clientX: 100, clientY: 50 });
    }
    expect(view(state)).toEqual({ originX: 0, originY: 0, zoom: 1 });
  });

  it("gives touch, pen and mouse drags of the same distance the identical view", () => {
    const views = (["mouse", "pen", "touch"] as const).map((pointerType) => {
      const { state, paper } = mount();
      fireEvent.pointerDown(paper, { pointerId: 1, pointerType, clientX: 300, clientY: 80 });
      fireEvent.pointerMove(paper, { pointerId: 1, pointerType, clientX: 245, clientY: 95 });
      fireEvent.pointerMove(paper, { pointerId: 1, pointerType, clientX: 230, clientY: 60 });
      fireEvent.pointerUp(paper, { pointerId: 1, pointerType, clientX: 230, clientY: 60 });
      const result = view(state);
      cleanup();
      return result;
    });
    expect(views[0]).toEqual({ originX: 70, originY: 20, zoom: 1 });
    expect(views[1]).toEqual(views[0]);
    expect(views[2]).toEqual(views[0]);
  });

  it("zooms with a two finger pinch about its midpoint exactly as the wheel does, and pans with the midpoint at the same time", () => {
    const pinched = mount();
    const touch = (type: "pointerDown" | "pointerMove", pointerId: number, x: number, y: number): void => {
      fireEvent[type](pinched.paper, { pointerId, pointerType: "touch", clientX: PAPER_LEFT + x, clientY: PAPER_TOP + y });
    };
    touch("pointerDown", 1, 100, 100);
    touch("pointerDown", 2, 200, 100);
    touch("pointerMove", 2, 300, 100);
    const factor = 2;
    const center = { x: 200, y: 100 };
    const afterFirst = view(pinched.state);
    cleanup();
    const wheeled = mount();
    wheeled.state.panBy(50, 0);
    wheeled.state.zoomAbout(factor, center);
    expect(afterFirst.zoom).toBe(factor);
    expect(afterFirst).toEqual(view(wheeled.state));
  });

  it("stops a gesture on cancel, on the window losing focus and on a third finger, leaving the view where it was", () => {
    const { state, paper } = mount();
    const touch = (type: "pointerDown" | "pointerMove" | "pointerCancel", pointerId: number, x: number): void => {
      fireEvent[type](paper, { pointerId, pointerType: "touch", clientX: x, clientY: 50 });
    };
    touch("pointerDown", 1, 100);
    touch("pointerMove", 1, 160);
    touch("pointerCancel", 1, 160);
    touch("pointerMove", 1, 300);
    expect(view(state).originX).toBe(-60);
    touch("pointerDown", 2, 100);
    touch("pointerMove", 2, 130);
    fireEvent.blur(window);
    touch("pointerMove", 2, 200);
    expect(view(state).originX).toBe(-90);
    touch("pointerDown", 3, 0);
    touch("pointerDown", 4, 40);
    touch("pointerDown", 5, 400);
    touch("pointerMove", 5, 0);
    expect(view(state)).toMatchObject({ originX: -90, zoom: 1 });
  });

  it("takes focus on a tap, so the keys work after a touch", () => {
    const { paper } = mount();
    fireEvent.pointerDown(paper, { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50 });
    fireEvent.pointerUp(paper, { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50 });
    expect(document.activeElement).toBe(paper);
  });

  it("pans by one key step per arrow, in the direction the view moves, and a drag of that distance gives the identical view", () => {
    const keys = mount();
    const step = CANVAS_LIMITS.keyPanStep;
    const results = [
      ["ArrowRight", { originX: step, originY: 0 }],
      ["ArrowLeft", { originX: 0, originY: 0 }],
      ["ArrowDown", { originX: 0, originY: step }],
      ["ArrowUp", { originX: 0, originY: 0 }],
    ] as const;
    for (const [key, expected] of results) {
      expect(fireEvent.keyDown(keys.paper, { key })).toBe(false);
      expect(view(keys.state)).toMatchObject(expected);
    }
    fireEvent.keyDown(keys.paper, { key: "ArrowRight" });
    cleanup();
    const dragged = mount();
    fireEvent.pointerDown(dragged.paper, { pointerId: 1, pointerType: "mouse", clientX: 200, clientY: 50 });
    fireEvent.pointerMove(dragged.paper, { pointerId: 1, pointerType: "mouse", clientX: 200 - step, clientY: 50 });
    expect(view(dragged.state)).toEqual(view(keys.state));
  });

  it("zooms about the center with plus and minus, and the wheel notch of the same factor gives the same view", () => {
    const keyed = mount();
    expect(fireEvent.keyDown(keyed.paper, { key: "+" })).toBe(false);
    const center = { x: 240, y: 120 };
    const zoom = CANVAS_LIMITS.keyZoomFactor;
    expect(view(keyed.state).zoom).toBeCloseTo(zoom, 12);
    expect(view(keyed.state).originX).toBeCloseTo(center.x - center.x / zoom, 9);
    fireEvent.keyDown(keyed.paper, { key: "-" });
    expect(view(keyed.state).zoom).toBeCloseTo(1, 12);
    expect(view(keyed.state).originX).toBeCloseTo(0, 9);
    fireEvent.keyDown(keyed.paper, { key: "=" });
    cleanup();
    const wheeled = mount();
    const deltaY = -Math.log(zoom) / CANVAS_LIMITS.wheelZoomPerPixel;
    fireEvent.wheel(wheeled.paper, { deltaY, clientX: PAPER_LEFT + center.x, clientY: PAPER_TOP + center.y });
    expect(view(wheeled.state).zoom).toBeCloseTo(view(keyed.state).zoom, 9);
    expect(view(wheeled.state).originX).toBeCloseTo(view(keyed.state).originX, 9);
    expect(view(wheeled.state).originY).toBeCloseTo(view(keyed.state).originY, 9);
  });

  it("returns to the home view with Home and leaves other keys and modified keys alone", () => {
    const { state, paper } = mount();
    fireEvent.keyDown(paper, { key: "ArrowRight" });
    fireEvent.keyDown(paper, { key: "+" });
    expect(view(state)).not.toEqual({ originX: 0, originY: 0, zoom: 1 });
    expect(fireEvent.keyDown(paper, { key: "Home" })).toBe(false);
    expect(view(state)).toEqual({ originX: 0, originY: 0, zoom: 1 });
    expect(fireEvent.keyDown(paper, { key: "a" })).toBe(true);
    expect(fireEvent.keyDown(paper, { key: "ArrowRight", ctrlKey: true })).toBe(true);
    expect(view(state)).toEqual({ originX: 0, originY: 0, zoom: 1 });
  });

  it("redraws at the new view: the first major line follows the pan", () => {
    const { paper } = mount();
    forget();
    fireEvent.keyDown(paper, { key: "ArrowLeft" });
    const major = drawing.strokes[1];
    const firstX = major?.points[0]?.[1];
    expect(firstX).toBe(CANVAS_LIMITS.keyPanStep + 0.5);
  });
});

describe("the toggles", () => {
  it("hide the grid and stop snapping independently, through the input manager", async () => {
    const { state } = mount();
    const gridSwitch = screen.getByRole("switch", { name: label("editor.graph.10") });
    const snapSwitch = screen.getByRole("switch", { name: label("editor.graph.09") });
    forget();
    fireEvent.click(gridSwitch);
    await flush();
    expect(state.getSnapshot()).toMatchObject({ gridVisible: false, snapEnabled: true });
    expect(gridSwitch.getAttribute("aria-checked")).toBe("false");
    expect(snapSwitch.getAttribute("aria-checked")).toBe("true");
    expect(drawing.strokes).toEqual([]);
    expect(drawing.calls.at(-1)).toMatch(/^clearRect/);
    fireEvent.click(snapSwitch);
    await flush();
    expect(state.getSnapshot()).toMatchObject({ gridVisible: false, snapEnabled: false });
    fireEvent.click(gridSwitch);
    await flush();
    expect(state.getSnapshot()).toMatchObject({ gridVisible: true, snapEnabled: false });
    expect(drawing.strokes.slice(-2).length).toBe(2);
    expect(diagnostics).toEqual([]);
  });

  it("register their actions once even when effects run twice", () => {
    mount({ strict: true });
    expect(diagnostics).toEqual([]);
    expect(screen.getAllByRole("switch")).toHaveLength(2);
  });
});

describe("size and pixel ratio", () => {
  it("follows a resize without clearing when the size is unchanged, and fits the canvas and the lines to the new size", () => {
    const { canvas } = mount();
    const before = drawing.calls.length;
    resizeCallback?.();
    expect(canvas.width).toBe(480);
    expect(drawing.calls.length).toBeGreaterThan(before);
    paperBox = { width: 960, height: 120 };
    forget();
    act(() => resizeCallback?.());
    expect([canvas.width, canvas.height]).toEqual([960, 120]);
    expect(drawing.calls.filter((call) => call.startsWith("clearRect"))).toEqual(["clearRect 0 0 960 120"]);
    const lineEnds = drawing.strokes.flatMap((stroke) => stroke.points.filter(([kind]) => kind === "lineTo"));
    expect(lineEnds.some(([, x]) => x === 960)).toBe(true);
    expect(lineEnds.some(([, x]) => x > 960.5)).toBe(false);
  });

  it("resizes and redraws when the device pixel ratio changes", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const { canvas } = mount();
    expect(ratioQueries.map((entry) => entry.query)).toEqual(["(resolution: 1dppx)"]);
    vi.stubGlobal("devicePixelRatio", 2);
    forget();
    act(() => ratioQueries[0]?.listeners.forEach((listener) => listener()));
    expect([canvas.width, canvas.height]).toEqual([960, 480]);
    expect(drawing.strokes.length).toBe(2);
    expect(ratioQueries.map((entry) => entry.query)).toEqual(["(resolution: 1dppx)", "(resolution: 2dppx)"]);
  });

  it("stops listening for ratio changes and size changes when removed", () => {
    mount();
    cleanup();
    expect(ratioQueries.every((entry) => entry.listeners.size === 0)).toBe(true);
  });
});

describe("watching the device pixel ratio", () => {
  it("calls back once per change, renews its query for the new ratio, and stops when told", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const onChange = vi.fn();
    const stop = watchDevicePixelRatio(window, onChange);
    act(() => ratioQueries[0]?.listeners.forEach((listener) => listener()));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ratioQueries).toHaveLength(2);
    stop();
    expect(ratioQueries.every((entry) => entry.listeners.size === 0)).toBe(true);
  });
});
