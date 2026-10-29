import type { ControlDescriptor } from "../actions/types";
import { StateText, useControlBinding } from "./shared";
import { Tooltip } from "./Tooltip";

export interface ButtonProps {
  readonly control: ControlDescriptor;
  /** Set to false when another part, such as a toast, already carries the outcome words. */
  readonly showState?: boolean;
}

/** A labelled button. It carries no click handler: the input manager activates it by control id. */
export function Button({ control, showState = true }: ButtonProps) {
  const { attributes, runtime, shown, tipId } = useControlBinding(control, ["button"], "Button");
  return (
    <span className="ui-anchor">
      <button type="button" className="ui-control ui-hit ui-button" {...attributes}>
        {control.label}
      </button>
      {showState ? <StateText runtime={runtime} shown={shown} /> : null}
      <Tooltip id={tipId} described={control} helpKey={control.id} />
    </span>
  );
}
