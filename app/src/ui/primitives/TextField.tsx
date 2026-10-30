import { useId } from "react";
import type { ControlDescriptor } from "../actions/types";
import { StateText, useControlBinding } from "./shared";
import { Tooltip } from "./Tooltip";

export interface TextFieldProps {
  readonly control: ControlDescriptor;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly type?: "text" | "search" | "password" | "email" | "url";
  /** Rules the entry must meet, shown beside the field before the user types. */
  readonly constraints?: string;
}

/**
 * Single-line field. Enter commits through the input manager; typed text is never cleared
 * by an error, because the value belongs to the owner and only changes through onValueChange.
 */
export function TextField({ control, value, onValueChange, type = "text", constraints }: TextFieldProps) {
  const { attributes, runtime, shown, tipId, tip, disabled } = useControlBinding(control, ["input", "textarea"], "TextField");
  const inputId = useId();
  const hintId = useId();
  const messageId = useId();
  const showsMessage = shown !== "ready" && shown !== "disabled" && runtime.message !== null;
  const describedBy =
    [constraints === undefined ? null : hintId, showsMessage ? messageId : null, attributes["aria-describedby"] ?? null]
      .filter((id) => id !== null)
      .join(" ") || undefined;
  return (
    <span className="ui-anchor ui-field">
      <label htmlFor={inputId} className="ui-label">
        {control.label}
      </label>
      <input
        id={inputId}
        type={type}
        className="ui-control ui-hit ui-input"
        value={value}
        readOnly={disabled}
        aria-invalid={runtime.state === "validation-error" ? true : undefined}
        onChange={(event) => {
          if (!disabled) onValueChange(event.currentTarget.value);
        }}
        {...attributes}
        aria-describedby={describedBy}
      />
      {constraints === undefined ? null : (
        <span id={hintId} className="ui-hint">
          {constraints}
        </span>
      )}
      <StateText runtime={runtime} shown={shown} id={messageId} />
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}
