import actions from "../../../../contracts/ui/v1/actions.v1.json";
import clientCatalog from "../../../../contracts/ui/v1/client-controls.v1.json";
import editorCatalog from "../../../../contracts/ui/v1/editor-controls.v1.json";
import homeCatalog from "../../../../contracts/ui/v1/home-controls.v1.json";
import hostCatalog from "../../../../contracts/ui/v1/host-controls.v1.json";
import schema from "../../../../contracts/ui/v1/ui-control.schema.json";
import { ActionRegistry, CatalogLoadError, type RegistryResult } from "./ActionRegistry";

/** The four catalogs and the action table exactly as shipped in the contracts folder. */
export function validateShippedCatalogs(): RegistryResult {
  return ActionRegistry.create({
    schema,
    actions,
    catalogs: { home: homeCatalog, editor: editorCatalog, client: clientCatalog, host: hostCatalog },
  });
}

let shipped: ActionRegistry | null = null;

/** Throws CatalogLoadError naming every offending id when the shipped catalogs are invalid. */
export function loadShippedRegistry(): ActionRegistry {
  if (shipped) return shipped;
  const result = validateShippedCatalogs();
  if (!result.ok) throw new CatalogLoadError(result.issues);
  shipped = result.registry;
  return shipped;
}
