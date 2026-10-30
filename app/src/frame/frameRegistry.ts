import actionsDocument from "../../../contracts/ui/v1/actions.v1.json";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import schema from "../../../contracts/ui/v1/ui-control.schema.json";
import { ActionRegistry, CatalogLoadError } from "../ui";
import { FRAME_SURFACE } from "./frameLayout";

let loaded: ActionRegistry | null = null;

/**
 * The frame's controls and their actions, cut from the same catalog files as every other screen and
 * validated on their own. The window controls therefore exist while the full catalogs are still
 * loading and when they fail to load. Throws CatalogLoadError naming every offending id.
 */
export function loadFrameRegistry(): ActionRegistry {
  if (loaded) return loaded;
  const controls = homeCatalog.controls.filter((control) => control.surface === FRAME_SURFACE);
  const used = new Set(controls.flatMap((control) => (control.actionId === null ? [] : [control.actionId])));
  const actions = actionsDocument.actions.filter((action) => used.has(action.id));
  const result = ActionRegistry.create({
    schema,
    actions: { ...actionsDocument, actions },
    catalogs: { home: { ...homeCatalog, controls } },
    workspaces: ["home"],
  });
  if (!result.ok) throw new CatalogLoadError(result.issues);
  loaded = result.registry;
  return loaded;
}
