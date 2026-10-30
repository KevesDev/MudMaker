import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTabletLayout } from "../frame/useTabletLayout";
import { useLatest, useUi } from "../ui";
import { clampEndSize } from "./splitMath";
import { useEditorLayout } from "./useEditorLayout";

export interface SplitViewProps {
  /** The accessible name of the separator. */
  readonly separatorLabel: string;
  /** The dominant region; it takes all the width the end region does not. */
  readonly primary: ReactNode;
  /** The end region. While it is absent there is no separator and the primary region fills the view. */
  readonly secondary?: ReactNode;
}

interface Drag {
  readonly pointerId: number;
  readonly startX: number;
  readonly startSize: number;
}

/**
 * Two regions side by side with a separator between them. The end region keeps its width when the window
 * resizes; neither region can be made narrower than the theme's least panel size. Keys and pointer both go
 * through one clamped resize, and both reach the separator only through the input manager. At the tablet
 * layout the end region lies over the primary one as a drawer, so the primary region is never squeezed and
 * there is nothing to resize.
 */
export function SplitView({ separatorLabel, primary, secondary }: SplitViewProps) {
  const { input } = useUi();
  const layout = useEditorLayout();
  const overlay = useTabletLayout();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const separatorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [requested, setRequested] = useState(layout.panelDefaultSize);
  const [total, setTotal] = useState(0);
  const present = secondary !== undefined && secondary !== null;
  const resizable = present && !overlay;
  const size = clampEndSize(total, requested, layout.panelMinSize, layout.separatorSize);
  const sizeRef = useLatest(size);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const measure = (): void => setTotal(root.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const separator = separatorRef.current;
    if (!resizable || separator === null) return;
    const resize = (next: number): void => {
      const width = rootRef.current?.getBoundingClientRect().width ?? 0;
      if (width <= 0) return;
      setRequested(clampEndSize(width, next, layout.panelMinSize, layout.separatorSize));
    };
    const trackPointer = (event: PointerEvent): void => {
      const drag = dragRef.current;
      if (event.type === "pointerdown") {
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startSize: sizeRef.current };
        separator.setPointerCapture(event.pointerId);
      } else if (drag?.pointerId === event.pointerId) {
        if (event.type === "pointermove") resize(drag.startSize - (event.clientX - drag.startX));
        else if (event.type === "pointerup" || event.type === "pointercancel") dragRef.current = null;
      }
    };
    const removeSurface = input.registerSurface({ id: `split:${id}`, element: separator, handlers: { mouse: trackPointer, touch: trackPointer, pen: trackPointer } });
    const removeKeys = input.registerKeys(`split:${id}`, (event) => {
      const keyed: Readonly<Record<string, number>> = {
        ArrowLeft: sizeRef.current + layout.splitStep,
        ArrowRight: sizeRef.current - layout.splitStep,
        Home: Number.POSITIVE_INFINITY,
        End: 0,
      };
      const next = keyed[event.key];
      if (next === undefined) return false;
      resize(next);
      return true;
    });
    return () => {
      removeSurface();
      removeKeys();
      dragRef.current = null;
    };
  }, [resizable, input, id, layout, sizeRef]);

  const measured = total > 0;
  return (
    <div ref={rootRef} className="editor-split">
      <div className="editor-split-primary">{primary}</div>
      {present && overlay ? <div className="editor-split-secondary editor-split-secondary-overlay">{secondary}</div> : null}
      {resizable ? (
        <>
          <div
            ref={separatorRef}
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label={separatorLabel}
            aria-valuemin={measured ? layout.panelMinSize : undefined}
            aria-valuemax={measured ? Math.max(layout.panelMinSize, total - layout.separatorSize - layout.panelMinSize) : undefined}
            aria-valuenow={measured ? total - layout.separatorSize - size : undefined}
            data-ui-keys={`split:${id}`}
            className="editor-separator"
          />
          <div className="editor-split-secondary" style={{ inlineSize: size }}>
            {secondary}
          </div>
        </>
      ) : null}
    </div>
  );
}
