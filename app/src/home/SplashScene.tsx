import { useMemo } from "react";
import { TextArt } from "../art/TextArt";
import { SCENE_PIECES } from "../art/library";
import { generatedLayers } from "./sceneLayout";
import { useSceneGrid } from "./useSceneGrid";

/**
 * The landscape behind the launch screen, drawn from the back to the front: stars, the hills and lake along the
 * foot, the castle at the left edge and the mountains at the right. Each layer is anchored to an edge, so any window
 * size shows the scene cropped to what fits. It is decoration only: hidden from assistive technology, out of the tab
 * order, and never the target of a pointer.
 */
export function SplashScene() {
  const { sceneRef, probeRef, grid } = useSceneGrid();
  const { stars, lake } = useMemo(() => generatedLayers(grid), [grid]);
  return (
    <div className="home-scene" aria-hidden="true" inert ref={sceneRef}>
      <span className="text-art home-scene-probe" ref={probeRef}>
        M
      </span>
      <div className="home-scene-layer" data-anchor="top-left">
        <TextArt piece={stars} />
      </div>
      <div className="home-scene-layer" data-anchor="bottom-left">
        <TextArt piece={lake} />
      </div>
      <div className="home-scene-layer" data-anchor="bottom-left">
        <TextArt piece={SCENE_PIECES.castle} />
      </div>
      <div className="home-scene-layer" data-anchor="bottom-right">
        <TextArt piece={SCENE_PIECES.mountains} />
      </div>
    </div>
  );
}
