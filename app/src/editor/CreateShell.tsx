import { useState, useSyncExternalStore } from "react";
import { CANVAS_LIMITS, CanvasState, GraphViewport } from "../canvas";
import { SILENT, useIntentRouter, useMenuOpeners } from "../workspaces/useIntentRouter";
import { ToolbarSlot } from "../workspaces/ToolbarSlot";
import { MENU_CARET } from "../nav/destinations";
import { Button, Menu, Switch, Toolbar, useUi, type ActionHandler, type PassiveDescriptor } from "../ui";
import { AssetExplorer } from "./AssetExplorer";
import { DockPanel } from "./DockPanel";
import { EditorShell } from "./EditorShell";
import { editorCopy } from "./editorCopy";
import { ASSETS, BUILD_MENU, EDITOR_OWNER, MAP_TOOLS, MAP_VIEW, OUTPUT_VIEWS, PROJECT_ACTIONS, SEARCH, VIEW_MENU } from "./editorLayout";
import { ProblemsDrawer } from "./ProblemsDrawer";

const PROJECT_BAR: PassiveDescriptor = { passive: true, id: "create.projectActions", label: editorCopy.projectActions, help: "" };
const MAP_BAR: PassiveDescriptor = { passive: true, id: "create.mapTools", label: editorCopy.mapTools, help: "" };

type OutputView = (typeof OUTPUT_VIEWS)[number];

/**
 * The Create workspace: its frequent actions sit in the frame row, below it the Asset Explorer drawer, the map canvas
 * with its one tool strip and the Problems strip. The Inspector appears beside the canvas once something can be
 * selected. A control that needs a project, a build or a save has no handler yet, so it does nothing visible.
 */
export function CreateShell() {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const [canvas] = useState(() => new CanvasState({ min: CANVAS_LIMITS.minZoom, max: CANVAS_LIMITS.maxZoom }));
  const { gridVisible, snapEnabled } = useSyncExternalStore(canvas.subscribe, canvas.getSnapshot);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [outputOpen, setOutputOpen] = useState(false);
  const [view, setView] = useState<OutputView>(OUTPUT_VIEWS[0]);

  /** Choosing the view that is already showing folds the strip away. */
  const showView = (next: OutputView): ActionHandler => () => {
    setOutputOpen(!(outputOpen && next === view));
    setView(next);
    return Promise.resolve(SILENT);
  };
  const flag = (apply: (on: boolean) => void): ActionHandler => ({ value }) => {
    if (typeof value !== "boolean") return Promise.resolve({ status: "validation-error", code: "map-toggle-invalid", message: editorCopy.mapToggleInvalid });
    apply(value);
    return Promise.resolve(SILENT);
  };
  useMenuOpeners(EDITOR_OWNER, [BUILD_MENU.opener, VIEW_MENU.opener]);
  useIntentRouter(EDITOR_OWNER, {
    [VIEW_MENU.assets]: () => {
      setAssetsOpen((open) => !open);
      return Promise.resolve(SILENT);
    },
    [MAP_VIEW.fit]: () => {
      canvas.resetView();
      return Promise.resolve(SILENT);
    },
    [MAP_VIEW.grid]: flag((on) => canvas.setGridVisible(on)),
    [MAP_VIEW.snap]: flag((on) => canvas.setSnapEnabled(on)),
    ...Object.fromEntries(OUTPUT_VIEWS.map((id) => [id, showView(id)])),
  });

  return (
    <div className="create-workspace">
      <ToolbarSlot>
        <Toolbar described={PROJECT_BAR}>
          {PROJECT_ACTIONS.map((id) => (
            <Button key={id} control={control(id)} />
          ))}
          <Menu opener={control(BUILD_MENU.opener)} items={BUILD_MENU.items.map(control)} trailingGlyph={MENU_CARET} />
          <Menu opener={control(VIEW_MENU.opener)} items={[control(VIEW_MENU.assets), control(VIEW_MENU.inspector), ...OUTPUT_VIEWS.map(control)]} trailingGlyph={MENU_CARET} />
          <Button control={control(SEARCH)} />
        </Toolbar>
      </ToolbarSlot>
      <div className="create-main">
        <EditorShell
          assets={
            <DockPanel described={control(ASSETS.explorer)} open={assetsOpen} onClose={() => setAssetsOpen(false)}>
              <AssetExplorer query={query} onQueryChange={setQuery} />
            </DockPanel>
          }
          surface={
            <div className="editor-canvas-column">
              <Toolbar described={MAP_BAR}>
                {MAP_TOOLS.map((id) => (
                  <Button key={id} control={control(id)} />
                ))}
                <Switch control={control(MAP_VIEW.grid)} checked={gridVisible} />
                <Switch control={control(MAP_VIEW.snap)} checked={snapEnabled} />
                {[MAP_VIEW.zoomIn, MAP_VIEW.zoomOut, MAP_VIEW.fit].map((id) => (
                  <Button key={id} control={control(id)} />
                ))}
              </Toolbar>
              <GraphViewport state={canvas} />
            </div>
          }
        />
      </div>
      <ProblemsDrawer open={outputOpen} view={view} />
    </div>
  );
}
