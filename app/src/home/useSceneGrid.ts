import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { FALLBACK_GRID, gridFor, type SceneGrid } from "./sceneLayout";

/**
 * Measures the scene in whole text cells: the scene's own area against one cell of the art font, which a probe
 * inside it draws with the same rules as the art. It measures again when either changes, so a window resize, a
 * text scale change and a new font all rebuild the generated layers. Where nothing can be measured the fallback
 * grid is kept.
 */
export function useSceneGrid(): {
  readonly sceneRef: RefObject<HTMLDivElement | null>;
  readonly probeRef: RefObject<HTMLSpanElement | null>;
  readonly grid: SceneGrid;
} {
  const sceneRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [grid, setGrid] = useState<SceneGrid>(FALLBACK_GRID);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const probe = probeRef.current;
    if (scene === null || probe === null || typeof ResizeObserver === "undefined") return;
    const measure = (): void => {
      const next = gridFor(scene.getBoundingClientRect(), probe.getBoundingClientRect());
      if (next !== null) setGrid((current) => (current.cols === next.cols && current.rows === next.rows ? current : next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    observer.observe(probe);
    measure();
    return () => observer.disconnect();
  }, []);

  return { sceneRef, probeRef, grid };
}
