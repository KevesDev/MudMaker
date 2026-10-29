import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlDescriptor, Described } from "../actions/types";
import { useUi } from "../UiProvider";
import { StateText, useCommand, useControlBinding, requireName } from "./shared";
import { Tooltip } from "./Tooltip";

export interface MenuProps {
  /** The opener's name and help. Its id must be unique among menus on screen. */
  readonly described: Described;
  readonly items: readonly ControlDescriptor[];
}

function MenuItem({ control }: { readonly control: ControlDescriptor }) {
  const { attributes, runtime, shown, tipId } = useControlBinding(control, ["button"], "Menu");
  return (
    <span className="ui-anchor ui-menu-item">
      <button type="button" role="menuitem" className="ui-control ui-hit ui-button" {...attributes}>
        {control.label}
      </button>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} described={control} helpKey={control.id} />
    </span>
  );
}

/**
 * Button that opens a list of actions. Opening, arrow keys, Escape and outside presses all arrive
 * through the input manager, and choosing an item closes the list and returns focus to the opener.
 */
export function Menu({ described, items }: MenuProps) {
  const ui = useUi();
  const name = requireName(described, "Menu");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const commandId = `menu.toggle.${described.id}`;
  const tipId = `${commandId}.help`;
  const toggle = useCallback(() => setOpen((current) => !current), []);
  useCommand(commandId, toggle);

  useEffect(() => {
    const popup = popupRef.current;
    if (!open || popup === null) return;
    const close = (refocus: boolean): void => {
      setOpen(false);
      if (refocus) triggerRef.current?.focus();
    };
    const pop = ui.focus.pushScope({
      key: `popup:${commandId}`,
      kind: "popup",
      container: popup,
      anchor: triggerRef.current,
      onEscape: () => close(true),
      onOutsidePress: () => close(false),
      onActivated: () => close(true),
    });
    popup.querySelector<HTMLElement>("[data-control-id]")?.focus();
    return () => {
      pop();
    };
  }, [open, ui, commandId]);

  return (
    <span className="ui-anchor">
      <button
        ref={triggerRef}
        type="button"
        className="ui-control ui-hit ui-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-describedby={tipId}
        data-ui-command={commandId}
      >
        {name}
      </button>
      {open ? (
        <div ref={popupRef} role="menu" aria-label={name} data-roving-group="vertical" className="ui-menu-popup">
          {items.map((item) => (
            <MenuItem key={item.id} control={item} />
          ))}
        </div>
      ) : null}
      <Tooltip id={tipId} described={described} helpKey={commandId} />
    </span>
  );
}
