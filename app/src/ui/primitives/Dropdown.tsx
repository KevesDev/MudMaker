import { useId } from "react";
import type { ControlDescriptor } from "../actions/types";
import { StateText, useControlBinding } from "./shared";
import { Tooltip } from "./Tooltip";

export interface DropdownOption {
  readonly value: string;
  readonly label: string;
}

export interface DropdownProps {
  readonly control: ControlDescriptor;
  readonly options: readonly DropdownOption[];
  /** The confirmed choice. A pick travels to the owner through the input manager and shows only once the owner updates this. */
  readonly value: string;
}

/** Native choice list, so keyboard, touch and screen readers get the platform behavior. */
export function Dropdown({ control, options, value }: DropdownProps) {
  const { attributes, runtime, shown, tipId, tip } = useControlBinding(control, ["dropdown"], "Dropdown");
  const selectId = useId();
  return (
    <span className="ui-anchor ui-field">
      <label htmlFor={selectId} className="ui-label">
        {control.label}
      </label>
      <select
        id={selectId}
        className="ui-control ui-hit ui-select"
        value={value}
        // The pick has already travelled through the input manager; the list goes back to what the owner confirmed.
        onChange={(event) => {
          event.currentTarget.value = value;
        }}
        {...attributes}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}
