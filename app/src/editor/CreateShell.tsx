import { useState } from "react";
import { CANVAS_LIMITS, CanvasState, GraphViewport } from "../canvas";
import { InspectorTextInput } from "../workspaces/InspectorTextInput";
import { SILENT, useIntentRouter } from "../workspaces/useIntentRouter";
import { Button, Toolbar, useUi, type ActionHandler, type PassiveDescriptor } from "../ui";
import { ALL_ASSETS, AssetExplorer, assetFilterOptions } from "./AssetExplorer";
import { DockPanel } from "./DockPanel";
import { EditorShell } from "./EditorShell";
import { editorCopy } from "./editorCopy";
import { ASSETS, EDITOR_OWNER, INSPECTOR, MAP_TOOLS, MAP_VIEW, OUTPUT_VIEWS, PANEL_ARRANGEMENTS, PROJECT_ACTIONS, VIEW_ACTIONS } from "./editorLayout";
import type { InspectorSectionDescriptor } from "./Inspector";
import { ProblemsDrawer } from "./ProblemsDrawer";

const PROJECT_BAR: PassiveDescriptor = { passive: true, id: "create.projectActions", label: editorCopy.projectActions, help: "" };
const VIEW_BAR: PassiveDescriptor = { passive: true, id: "create.viewActions", label: editorCopy.viewActions, help: "" };
const MAP_BAR: PassiveDescriptor = { passive: true, id: "create.mapTools", label: editorCopy.mapTools, help: "" };

type OutputView = (typeof OUTPUT_VIEWS)[number];

/**
 * The Create workspace: the project toolbar, the Asset Explorer drawer, the map canvas with its tool strip, the Inspector
 * and the Problems strip. A control that needs a project, a build or a save has no handler yet, so it does nothing visible;
 * everything that is only layout works now.
 */
export function CreateShell() {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const [canvas] = useState(() => new CanvasState({ min: CANVAS_LIMITS.minZoom, max: CANVAS_LIMITS.maxZoom }));
  const [arrangement, setArrangement] = useState(0);
  const [assetsDismissed, setAssetsDismissed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(ALL_ASSETS);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [outputOpen, setOutputOpen] = useState(false);
  const [view, setView] = useState<OutputView>(OUTPUT_VIEWS[0]);
  const panels = PANEL_ARRANGEMENTS[arrangement] ?? PANEL_ARRANGEMENTS[0];

  /** Choosing the view that is already showing folds the strip back to its tab. */
  const showView = (next: OutputView): ActionHandler => () => {
    setOutputOpen(!(outputOpen && next === view));
    setView(next);
    return Promise.resolve(SILENT);
  };
  useIntentRouter(EDITOR_OWNER, {
    [VIEW_ACTIONS.panels]: () => {
      setArrangement((current) => (current + 1) % PANEL_ARRANGEMENTS.length);
      setAssetsDismissed(false);
      return Promise.resolve(SILENT);
    },
    [ASSETS.filter]: ({ value }) => {
      if (typeof value !== "string" || !assetFilterOptions.some((option) => option.value === value)) {
        return Promise.resolve({ status: "validation-error", code: "asset-filter-invalid", message: editorCopy.assetFilterInvalid });
      }
      setFilter(value);
      return Promise.resolve(SILENT);
    },
    [MAP_VIEW.fit]: () => {
      canvas.resetView();
      return Promise.resolve(SILENT);
    },
    ...Object.fromEntries(OUTPUT_VIEWS.map((id) => [id, showView(id)])),
  });

  const sections: readonly InspectorSectionDescriptor[] = panels.inspector
    ? [
        {
          id: "general",
          label: editorCopy.inspectorGeneral,
          fields: [
            { id: "name", label: control(INSPECTOR.name).label, control: (slot) => <InspectorTextInput control={control(INSPECTOR.name)} slot={slot} value={name} onValueChange={setName} /> },
            {
              id: "description",
              label: control(INSPECTOR.description).label,
              control: (slot) => <InspectorTextInput control={control(INSPECTOR.description)} slot={slot} value={description} onValueChange={setDescription} />,
            },
          ],
        },
        { id: "components", label: editorCopy.inspectorComponents, fields: [{ id: "add", label: editorCopy.inspectorComponents, control: () => <Button control={control(INSPECTOR.addComponent)} /> }] },
      ]
    : [];

  return (
    <div className="create-workspace">
      <div className="workspace-bar">
        <Toolbar described={PROJECT_BAR}>
          {PROJECT_ACTIONS.map((id) => (
            <Button key={id} control={control(id)} />
          ))}
        </Toolbar>
        <span className="workspace-spacer" />
        <Toolbar described={VIEW_BAR}>
          <Button control={control(VIEW_ACTIONS.search)} />
          <Button control={control(VIEW_ACTIONS.panels)} />
          <Button control={control(VIEW_ACTIONS.help)} />
        </Toolbar>
      </div>
      <div className="create-main">
        <EditorShell
          assets={
            <DockPanel described={control(ASSETS.explorer)} open={panels.assets && !assetsDismissed} onClose={() => setAssetsDismissed(true)}>
              <AssetExplorer query={query} onQueryChange={setQuery} filter={filter} />
            </DockPanel>
          }
          surface={
            <div className="editor-canvas-column">
              <Toolbar described={MAP_BAR}>
                {[...MAP_TOOLS, MAP_VIEW.zoomIn, MAP_VIEW.zoomOut, MAP_VIEW.fit].map((id) => (
                  <Button key={id} control={control(id)} />
                ))}
              </Toolbar>
              <GraphViewport state={canvas} />
            </div>
          }
          inspector={{ described: control(INSPECTOR.panel), sections }}
        />
      </div>
      <ProblemsDrawer open={outputOpen} view={view} />
    </div>
  );
}
