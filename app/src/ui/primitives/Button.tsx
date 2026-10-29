import type { ControlDescriptor } from "../actions/types";
import { StateText, useControlBinding } from "./shared";
import { Tooltip } from "./Tooltip";

/** A labelled button. It carries no click handler: the input manager activates it by control id. */
export function Button({ control }: { readonly control: ControlDescriptor }) {
  const { attributes, runtime, shown, tipId } = useControlBinding(control, ["button"], "Button");
  return (
    <span className="ui-anchor">
      <button type="button" className="ui-control ui-hit ui-button" {...attributes}>
        {control.label}
      </button>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} described={control} helpKey={control.id} />
    </span>
  );
}
