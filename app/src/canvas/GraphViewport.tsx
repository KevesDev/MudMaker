import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useTheme } from "../theme";
import { Switch, Toolbar, useUi, type PassiveDescriptor } from "../ui";
import { CANVAS_CONTROLS, registerCanvasActions } from "./canvasActions";
import { canvasCopy } from "./canvasCopy";
import type { CanvasState } from "./CanvasState";
import { watchDevicePixelRatio } from "./devicePixelRatio";
import { drawGrid } from "./drawGrid";
import { computeGridLines, readGridStyle, type Size } from "./gridLines";
import { applyCanvasKey, wheelZoomFactor } from "./viewportControls";

const OPTIONS: PassiveDescriptor = { passive: true, id: "canvas.options", label: canvasCopy.options, help: "" };

interface Drag {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

/**
 * The graph paper: continuous grid lines on a pannable, zoomable view, with the grid and snap toggles in a
 * strip above it. All input reaches it through the input manager; touch pan and pinch attach to the same
 * surface registration when the touch gestures are built.
 */
export function GraphViewport({ state }: { readonly state: CanvasState }) {
  const { bus, input, registry } = useUi();
  const { tokens } = useTheme("editor");
  const gridStyle = useMemo(() => readGridStyle(tokens), [tokens]);
  const surfaceId = `canvas:${useId()}`;
  const paperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef<Size>({ width: 0, height: 0 });
  const dragRef = useRef<Drag | null>(null);
  const gridVisible = useSyncExternalStore(state.subscribe, () => state.getSnapshot().gridVisible);
  const snapEnabled = useSyncExternalStore(state.subscribe, () => state.getSnapshot().snapEnabled);

  const draw = useCallback((): void => {
    const canvas = canvasRef.current;
    if (canvas === null || canvas.width === 0 || canvas.height === 0) return;
    const context = canvas.getContext("2d");
    if (context === null) return;
    const { viewport, gridVisible: visible } = state.getSnapshot();
    const lines = visible ? computeGridLines(viewport, sizeRef.current, window.devicePixelRatio, gridStyle) : null;
    drawGrid(context, lines, gridStyle, { width: canvas.width, height: canvas.height });
  }, [state, gridStyle]);

  useEffect(() => {
    draw();
    return state.subscribe(draw);
  }, [state, draw]);

  useLayoutEffect(() => {
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    if (paper === null || canvas === null) return;
    const measure = (): void => {
      const rect = paper.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
      const width = Math.round(rect.width * window.devicePixelRatio);
      const height = Math.round(rect.height * window.devicePixelRatio);
      // Assigning a size clears the canvas, so it is assigned only when it changed.
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      draw();
    };
    measure();
    const stopRatio = watchDevicePixelRatio(window, measure);
    if (typeof ResizeObserver === "undefined") return stopRatio;
    const observer = new ResizeObserver(measure);
    observer.observe(paper);
    return () => {
      observer.disconnect();
      stopRatio();
    };
  }, [draw]);

  useEffect(() => registerCanvasActions(bus, registry, state), [bus, registry, state]);

  useEffect(() => {
    const paper = paperRef.current;
    if (paper === null) return;
    const track = (event: PointerEvent): void => {
      const drag = dragRef.current;
      if (event.type === "pointerdown") {
        if (event.button !== 0) return;
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        paper.setPointerCapture(event.pointerId);
      } else if (drag?.pointerId === event.pointerId) {
        if (event.type === "pointermove") {
          state.panBy(event.clientX - drag.x, event.clientY - drag.y);
          dragRef.current = { pointerId: drag.pointerId, x: event.clientX, y: event.clientY };
        } else if (event.type === "pointerup" || event.type === "pointercancel") {
          dragRef.current = null;
        }
      }
    };
    const wheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = paper.getBoundingClientRect();
      state.zoomAbout(wheelZoomFactor(event.deltaY, event.deltaMode, rect.height), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    const removeSurface = input.registerSurface({ id: surfaceId, element: paper, handlers: { wheel, mouse: track, pen: track } });
    const removeKeys = input.registerKeys(surfaceId, (event) => applyCanvasKey(state, event, sizeRef.current));
    return () => {
      removeSurface();
      removeKeys();
      dragRef.current = null;
    };
  }, [input, state, surfaceId]);

  return (
    <div className="graph-canvas">
      <div className="graph-canvas-strip">
        <Toolbar described={OPTIONS}>
          <Switch control={registry.requireControl(CANVAS_CONTROLS.grid)} checked={gridVisible} />
          <Switch control={registry.requireControl(CANVAS_CONTROLS.snap)} checked={snapEnabled} />
        </Toolbar>
      </div>
      <div ref={paperRef} className="graph-paper" role="application" tabIndex={0} aria-label={registry.requireControl(CANVAS_CONTROLS.paper).label} data-ui-keys={surfaceId}>
        <canvas ref={canvasRef} className="graph-paper-lines" aria-hidden="true" />
      </div>
    </div>
  );
}
