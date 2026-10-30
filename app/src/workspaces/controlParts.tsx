import { Children, type ReactNode } from "react";
import { StateText, Tooltip, useControlBinding, type ControlDescriptor } from "../ui";

/** One choice of a tab list. The owner says which is selected and changes it when the control's action succeeds. */
export function ControlTab({ control, selected }: { readonly control: ControlDescriptor; readonly selected: boolean }) {
  const { attributes, runtime, shown, tipId, tip } = useControlBinding(control, ["tab"], "ControlTab");
  return (
    <span className="ui-anchor">
      <button type="button" role="tab" aria-selected={selected} className="ui-control ui-hit workspace-tab" {...attributes}>
        {control.label}
      </button>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}

export function ControlTabList({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div role="tablist" aria-label={label} data-roving-group="horizontal" className="workspace-tabs">
      {children}
    </div>
  );
}

/** One choice of a single-select button group. The owner says which is chosen and changes it when the control's action succeeds. */
export function ControlChoice({ control, selected }: { readonly control: ControlDescriptor; readonly selected: boolean }) {
  const { attributes, runtime, shown, tipId, tip } = useControlBinding(control, ["tab"], "ControlChoice");
  return (
    <span className="ui-anchor">
      <button type="button" role="radio" aria-checked={selected} className="ui-control ui-hit workspace-choice" {...attributes}>
        {control.label}
      </button>
      <StateText runtime={runtime} shown={shown} />
      <Tooltip id={tipId} helpKey={control.id} title={control.label} content={tip} />
    </span>
  );
}

export function ControlChoiceGroup({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} data-roving-group="horizontal" className="workspace-choices">
      {children}
    </div>
  );
}

/** A list or tree the owner fills. With no rows it draws nothing, so the owner's empty cue stands alone. */
export function ControlList({ control, children }: { readonly control: ControlDescriptor; readonly children?: ReactNode }) {
  const { attributes } = useControlBinding(control, ["list", "tree"], "ControlList");
  if (Children.toArray(children).length === 0) return null;
  return (
    <div role={control.kind === "tree" ? "tree" : "listbox"} aria-label={control.label} tabIndex={0} className="workspace-list" {...attributes}>
      {children}
    </div>
  );
}

/** Display-only catalog text or status. It carries the catalog test id and no control id, because nothing activates it. */
export function PassiveText({ control, children }: { readonly control: ControlDescriptor; readonly children: ReactNode }) {
  return (
    <span data-testid={control.testId} role={control.kind === "status" ? "status" : undefined} className="workspace-passive">
      {children}
    </span>
  );
}

export function EmptyCue({ children }: { readonly children: ReactNode }) {
  return <p className="workspace-cue">{children}</p>;
}
