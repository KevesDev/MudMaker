import type { ControlDescriptor } from "../actions/types";
import { StateText, useControlBinding } from "./shared";
import { Tooltip } from "./Tooltip";

export interface SwitchProps {
  readonly control: ControlDescriptor;
  /** The confirmed value. The switch never flips itself; the owner changes it after confirming. */
  readonly checked: boolean;
}

export function Switch({ control, checked }: SwitchProps) {
  const { attributes, runtime, shown, tipId } = useControlBinding(control, ["toggle"], "Switch");
  return (
    <span className="ui-anchor">
      <button type="button" role="switch" aria-checked={checked} className="ui-control ui-hit ui-switch" {...attributes}>
        <span aria-hidden="true" className="ui-switch-track" data-on={checked}>
          <span className="ui-switch-thumb" />
        </span>
        <span>{control.label}</span>
      </button>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} described={control} helpKey={control.id} />
    </span>
  );
}
