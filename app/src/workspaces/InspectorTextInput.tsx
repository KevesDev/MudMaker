import { StateText, Tooltip, useControlBinding, type ControlDescriptor } from "../ui";
import type { InspectorControlSlot } from "../editor/Inspector";

export interface InspectorTextInputProps {
  readonly control: ControlDescriptor;
  readonly slot: InspectorControlSlot;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
}

/** The value control of an inspector row. The row supplies the label, so this draws only the field. */
export function InspectorTextInput({ control, slot, value, onValueChange }: InspectorTextInputProps) {
  const { attributes, runtime, shown, tipId, tip, disabled } = useControlBinding(control, ["input", "textarea"], "InspectorTextInput");
  return (
    <span className="ui-anchor">
      <input
        id={slot.id}
        type="text"
        className="ui-control ui-hit ui-input"
        value={value}
        readOnly={disabled}
        aria-invalid={slot.invalid ? true : undefined}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        {...attributes}
        aria-describedby={[slot.describedBy, attributes["aria-describedby"]].filter((id) => id !== undefined).join(" ") || undefined}
      />
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}
