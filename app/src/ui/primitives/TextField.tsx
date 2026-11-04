import { useId, type ChangeEvent } from "react";
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
  readonly inputMode?: "text" | "decimal";
  readonly error?: string;
  /** A native picker beside editable color/alias text. Its value is the last valid resolved color. */
  readonly colorPickerValue?: string;
}

/**
 * Catalog textarea controls retain native multiline editing; single-line Enter commits through the input manager.
 * Typed text is never cleared
 * by an error, because the value belongs to the owner and only changes through onValueChange.
 */
export function TextField({ control, value, onValueChange, type = "text", constraints, inputMode, error, colorPickerValue }: TextFieldProps) {
  const { attributes, runtime, shown, tipId, tip, disabled } = useControlBinding(control, ["input", "textarea"], "TextField");
  const inputId = useId();
  const hintId = useId();
  const messageId = useId();
  const showsMessage = shown !== "ready" && shown !== "disabled" && runtime.message !== null;
  const describedBy =
    [constraints === undefined ? null : hintId, showsMessage || error !== undefined ? messageId : null, attributes["aria-describedby"] ?? null]
      .filter((id) => id !== null)
      .join(" ") || undefined;
  const entryProps = {
    id: inputId,
    inputMode,
    className: "ui-control ui-hit ui-input",
    value,
    readOnly: disabled,
    "aria-invalid": runtime.state === "validation-error" || error !== undefined ? true as const : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!disabled) onValueChange(event.currentTarget.value);
    },
    ...attributes,
    "aria-describedby": describedBy,
  };
  return (
    <span className="ui-anchor ui-field">
      <label htmlFor={inputId} className="ui-label">
        {control.label}
      </label>
      {control.kind === "textarea" ? <textarea {...entryProps} /> : <input type={type} {...entryProps} />}
      {colorPickerValue === undefined ? null : <input type="color" className="ui-control ui-hit ui-input" aria-label={`${control.label} color`} value={colorPickerValue} disabled={disabled} onChange={(event) => onValueChange(event.currentTarget.value)} {...attributes} />}
      {constraints === undefined ? null : (
        <span id={hintId} className="ui-hint">
          {constraints}
        </span>
      )}
      {error === undefined ? <StateText runtime={runtime} shown={shown} id={messageId} /> : <span id={messageId} role="alert" className="ui-state-text" data-state="validation-error">{error}</span>}
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}
