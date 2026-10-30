import { useSyncExternalStore } from "react";
import { IconButton, UiContractError, useUi, type ActionRegistry, type ControlDescriptor } from "../ui";
import { FRAME, GLYPHS, MODE_CONDITION, TOGGLE_CONTROLS, TOGGLE_GLYPH } from "./frameLayout";
import type { WindowController, WindowMode } from "./WindowController";

/** The toggle entry the catalog shows in this mode; a catalog that names none is a defect, not a reason to show nothing. */
function toggleControlFor(registry: ActionRegistry, mode: WindowMode): ControlDescriptor {
  const found = TOGGLE_CONTROLS.map((id) => registry.requireControl(id)).find((control) => control.visibleWhen === MODE_CONDITION[mode]);
  if (found === undefined) {
    throw new UiContractError("visible-when-unknown", FRAME.maximize, `No window control is shown when "${MODE_CONDITION[mode]}".`);
  }
  return found;
}

/**
 * Minimize, Maximize or Restore, and Close. The toggle is one button whose catalog entry follows the real
 * window mode, so keyboard focus stays on it when the mode changes.
 */
export function WindowControls({ controller }: { readonly controller: WindowController }) {
  const { registry } = useUi();
  const mode = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const toggle = toggleControlFor(registry, mode);
  return (
    <div className="app-frame-controls">
      <IconButton control={registry.requireControl(FRAME.minimize)} icon={GLYPHS.minimize} />
      <IconButton control={toggle} icon={TOGGLE_GLYPH[mode]} />
      <IconButton control={registry.requireControl(FRAME.close)} icon={GLYPHS.close} />
    </div>
  );
}
