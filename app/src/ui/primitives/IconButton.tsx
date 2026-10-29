import type { ReactNode } from "react";
import type { ControlDescriptor } from "../actions/types";
import { StateText, useControlBinding } from "./shared";
import { Tooltip } from "./Tooltip";

export interface IconButtonProps {
  readonly control: ControlDescriptor;
  /** Decorative glyph; the control's label is its accessible name and its tooltip title. */
  readonly icon: ReactNode;
}

export function IconButton({ control, icon }: IconButtonProps) {
  const { attributes, runtime, shown, tipId } = useControlBinding(control, ["button"], "IconButton");
  return (
    <span className="ui-anchor">
      <button type="button" className="ui-control ui-hit ui-icon-button" aria-label={control.label} {...attributes}>
        <span aria-hidden="true" className="ui-icon">
          {icon}
        </span>
      </button>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} described={control} helpKey={control.id} />
    </span>
  );
}
