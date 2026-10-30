import type { ReactNode } from "react";
import type { ControlDescriptor } from "../actions/types";
import { StateText, useControlBinding } from "./shared";
import { Tooltip } from "./Tooltip";

export interface ButtonProps {
  readonly control: ControlDescriptor;
  /** Set to false when another part, such as a toast, already carries the outcome words. */
  readonly showState?: boolean;
  /** A decorative character drawn after the label; it is hidden from assistive technology, so the name stays the label. */
  readonly trailingGlyph?: string;
  /** Decorative art drawn before the label, such as an icon; it is hidden from assistive technology, so the name stays the label. */
  readonly leading?: ReactNode;
}

/** A labelled button. It carries no click handler: the input manager activates it by control id. */
export function Button({ control, showState = true, trailingGlyph, leading }: ButtonProps) {
  const { attributes, runtime, shown, tipId, tip } = useControlBinding(control, ["button"], "Button");
  return (
    <span className="ui-anchor">
      <button type="button" className="ui-control ui-hit ui-button" {...attributes}>
        {leading === undefined ? null : (
          <span className="ui-button-leading" aria-hidden="true">
            {leading}
          </span>
        )}
        {control.label}
        {trailingGlyph === undefined ? null : (
          <span className="ui-button-glyph" aria-hidden="true">
            {trailingGlyph}
          </span>
        )}
      </button>
      {showState ? <StateText runtime={runtime} shown={shown} /> : null}
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}
