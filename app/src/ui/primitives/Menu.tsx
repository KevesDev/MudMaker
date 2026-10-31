import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ActionHandler } from "../actions/ActionBus";
import type { ControlDescriptor } from "../actions/types";
import { copy } from "../copy";
import { useUi } from "../UiProvider";
import type { DropdownOption } from "./Dropdown";
import { StateText, useControlBinding } from "./shared";
import { Tooltip } from "./Tooltip";

export interface MenuProps {
  /** The catalog control that opens the menu; activating it runs its action, and the menu opens once the owner answers success. */
  readonly opener: ControlDescriptor;
  readonly items: readonly ControlDescriptor[];
  /** The item that names the current choice, such as the section being shown; it is marked. */
  readonly currentId?: string;
  /** On/off settings listed with the items. Each is marked while its confirmed value is on. */
  readonly checks?: readonly MenuCheck[];
  /** A list of values for one control, such as a preset. Choosing one sends it to that control's action. */
  readonly choices?: MenuChoices;
  /** Decorative art drawn before the opener's label; it is hidden from assistive technology. */
  readonly leading?: ReactNode;
  /** A decorative character drawn after the opener's label, such as a caret; it is hidden from assistive technology. */
  readonly trailingGlyph?: string;
}

export interface MenuCheck {
  readonly control: ControlDescriptor;
  /** The confirmed value. Activating the item asks the owner to flip it; the mark follows only once the owner updates this. */
  readonly checked: boolean;
}

export interface MenuChoices {
  /** The dropdown control whose action receives the chosen value; its label names the group. */
  readonly control: ControlDescriptor;
  readonly options: readonly DropdownOption[];
  /** The confirmed choice, which is marked. A pick shows as chosen only once the owner updates this. */
  readonly value: string;
  /** Related on/off appearance settings stay inside this named group. */
  readonly checks?: readonly MenuCheck[];
}

/**
 * What an owner registers for a menu opener's action. Opening is a presentation change that needs no
 * decision, and the menu takes focus itself, so the answer is silent instead of announcing "Done".
 */
export const openMenuHandler: ActionHandler = () => Promise.resolve({ status: "success", message: "" });

function MenuItem({ control, current }: { readonly control: ControlDescriptor; readonly current: boolean }) {
  const { attributes, runtime, shown, tipId, tip } = useControlBinding(control, ["button", "tab"], "Menu");
  return (
    <span className="ui-anchor ui-menu-item">
      <button type="button" role="menuitem" aria-current={current ? "true" : undefined} className="ui-control ui-hit ui-button" {...attributes}>
        <span className="ui-menu-mark" aria-hidden="true">
          {current ? copy.chosenMark : ""}
        </span>
        {control.label}
      </button>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}

function MenuCheckItem({ check }: { readonly check: MenuCheck }) {
  const { control, checked } = check;
  const { attributes, runtime, shown, tipId, tip } = useControlBinding(control, ["toggle"], "Menu");
  return (
    <span className="ui-anchor ui-menu-item">
      <button type="button" role="menuitemcheckbox" aria-checked={checked} className="ui-control ui-hit ui-button" {...attributes}>
        <span className="ui-menu-mark" aria-hidden="true">
          {checked ? copy.chosenMark : ""}
        </span>
        {control.label}
      </button>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}

function MenuChoiceGroup({ choices }: { readonly choices: MenuChoices }) {
  const { control, options, value } = choices;
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} data-testid={control.testId} className="ui-menu-group">
      <span id={labelId} className="ui-menu-group-label">
        {control.label}
      </span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="menuitemradio"
          aria-checked={option.value === value}
          className="ui-control ui-hit ui-button ui-menu-choice"
          data-control-id={control.id}
          data-value={option.value}
        >
          <span className="ui-menu-mark" aria-hidden="true">
            {option.value === value ? copy.chosenMark : ""}
          </span>
          {option.label}
        </button>
      ))}
      {choices.checks?.map((check) => <MenuCheckItem key={check.control.id} check={check} />)}
    </div>
  );
}

/**
 * Button that opens a list of actions. Activating the opener runs its catalog action through the
 * input manager, so its pending, disabled and error states are the control's own; the list opens
 * when the owner answers success and closes when the opener is activated again. Arrow keys, Escape
 * and outside presses arrive through the input manager, and choosing an item closes the list and
 * returns focus to the opener.
 */
export function Menu({ opener, items, currentId, checks, choices, leading, trailingGlyph }: MenuProps) {
  const ui = useUi();
  const { attributes, runtime, shown, tipId, tip } = useControlBinding(opener, ["dropdown", "button"], "Menu");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const scopeKey = `popup:${opener.id}`;

  const listening = useRef(false);

  // A success that was already there when this menu appeared answered an earlier menu, so it is cleared without opening.
  // This effect is declared before the one that starts listening so the first run counts as stale.
  useEffect(() => {
    if (runtime.state !== "success") return;
    ui.bus.reset(opener.id);
    if (listening.current) setOpen((current) => !current);
  }, [runtime, ui.bus, opener.id]);

  useEffect(() => {
    listening.current = true;
    return () => {
      listening.current = false;
    };
  }, []);

  useEffect(() => {
    const popup = popupRef.current;
    if (!open || popup === null) return;
    const close = (refocus: boolean): void => {
      setOpen(false);
      if (refocus) triggerRef.current?.focus();
    };
    const pop = ui.focus.pushScope({
      key: scopeKey,
      kind: "popup",
      container: popup,
      anchor: triggerRef.current,
      onEscape: () => close(true),
      onOutsidePress: () => close(false),
      onActivated: () => close(true),
    });
    (popup.querySelector<HTMLElement>('[aria-checked="true"]') ?? popup.querySelector<HTMLElement>("[data-control-id]"))?.focus();
    return () => {
      pop();
    };
  }, [open, ui, scopeKey]);

  return (
    <span className="ui-anchor">
      <button ref={triggerRef} type="button" className="ui-control ui-hit ui-button" aria-haspopup="menu" aria-expanded={open} {...attributes}>
        {leading === undefined ? null : (
          <span className="ui-button-leading" aria-hidden="true">
            {leading}
          </span>
        )}
        {opener.label}
        {trailingGlyph === undefined ? null : (
          <span className="ui-button-glyph" aria-hidden="true">
            {trailingGlyph}
          </span>
        )}
      </button>
      {runtime.state === "success" ? null : <StateText runtime={runtime} shown={shown} />}
      {open ? (
        <div ref={popupRef} role="menu" aria-label={opener.label} data-roving-group="vertical" className="ui-menu-popup">
          {choices === undefined ? null : <MenuChoiceGroup choices={choices} />}
          {checks?.map((check) => (
            <MenuCheckItem key={check.control.id} check={check} />
          ))}
          {items.map((item) => (
            <MenuItem key={item.id} control={item} current={item.id === currentId} />
          ))}
        </div>
      ) : null}
      <Tooltip id={tipId} helpKey={opener.id} title={opener.label} content={tip} />
    </span>
  );
}
