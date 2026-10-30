import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { ControlRuntime, ControlState } from "../actions/ActionBus";
import {
  UiContractError,
  isActionControl,
  type ControlDescriptor,
  type ControlKind,
  type Described,
} from "../actions/types";
import { shownState } from "../actions/stateVariants";
import { useUi } from "../UiProvider";
import { addsDescription, tooltipContent, type TooltipContent } from "./tooltipRule";

const READY: ControlRuntime = Object.freeze({ state: "ready", message: null, code: null, reason: null });

export function useControlRuntime(controlId: string | null): ControlRuntime {
  const { bus } = useUi();
  return useSyncExternalStore(
    useCallback((listener) => bus.subscribe(listener), [bus]),
    () => (controlId === null ? READY : bus.getRuntime(controlId)),
  );
}

/** Keeps the newest callback without making effects that register it run again. */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Registers a local interface command for the lifetime of the component. */
export function useCommand(commandId: string, handler: () => void): void {
  const { input } = useUi();
  const latest = useLatest(handler);
  useEffect(() => input.registerCommand(commandId, () => latest.current()), [input, commandId, latest]);
}

function useShortcutLabel(actionId: string | null): string | null {
  const { shortcuts } = useUi();
  useSyncExternalStore(
    useCallback((listener) => shortcuts.subscribe(listener), [shortcuts]),
    () => shortcuts.getVersion(),
  );
  return actionId === null ? null : shortcuts.labelFor(actionId);
}

export interface ControlAttributes {
  readonly "data-control-id": string;
  readonly "data-testid": string;
  readonly "data-state": string;
  readonly "aria-disabled": true | undefined;
  readonly "aria-busy": true | undefined;
  /** Set only when the tooltip adds a description beyond the accessible name. */
  readonly "aria-describedby": string | undefined;
}

export interface ControlBinding {
  readonly runtime: ControlRuntime;
  /** The state to show, limited to the variants the catalog lists for this control. */
  readonly shown: ControlState;
  readonly tipId: string;
  /** What the tooltip says, or null when the tooltip rule gives this control none. */
  readonly tip: TooltipContent | null;
  readonly attributes: ControlAttributes;
  readonly disabled: boolean;
}

/**
 * Checks that a control comes from the registry, is bound to an action and suits the component,
 * then supplies the shared state and accessibility attributes. Misuse throws with a stable code.
 */
export function useControlBinding(
  control: ControlDescriptor,
  kinds: readonly ControlKind[],
  component: string,
  options: { readonly iconOnly?: boolean } = {},
): ControlBinding {
  const { registry } = useUi();
  const tipId = useId();
  const runtime = useControlRuntime(control.id);
  const shortcut = useShortcutLabel(control.actionId);
  if (registry.control(control.id) === undefined) {
    throw new UiContractError("control-unregistered", control.id, `${component} was given "${control.id}", which is not in the catalogs.`);
  }
  if (!isActionControl(control)) {
    throw new UiContractError("control-passive", control.id, `${component} needs a control with an action, but "${control.id}" is display-only.`);
  }
  if (!kinds.includes(control.kind)) {
    throw new UiContractError(
      "control-kind-mismatch",
      control.id,
      `${component} cannot show "${control.id}" because it is a ${control.kind}; expected ${kinds.join(" or ")}.`,
    );
  }
  if (control.label.trim().length === 0) {
    throw new UiContractError("control-name-missing", control.id, `Control "${control.id}" has no accessible name.`);
  }
  const disabled = runtime.state === "disabled";
  const shown = shownState(control, runtime.state);
  const tip = tooltipContent({ control, runtime, shortcut, iconOnly: options.iconOnly === true });
  return {
    runtime,
    shown,
    tipId,
    tip,
    disabled,
    attributes: {
      "data-control-id": control.id,
      "data-testid": control.testId,
      "data-state": shown,
      "aria-disabled": disabled ? true : undefined,
      "aria-busy": runtime.state === "pending" ? true : undefined,
      "aria-describedby": tip !== null && addsDescription(tip) ? tipId : undefined,
    },
  };
}

/** Words beside a control that say what happened, so state is never shown by color alone. */
export function StateText({ runtime, shown, id }: { readonly runtime: ControlRuntime; readonly shown: ControlState; readonly id?: string }) {
  if (shown === "ready" || shown === "disabled" || runtime.message === null) return null;
  return (
    <span id={id} className="ui-state-text" data-state={shown}>
      {runtime.message}
    </span>
  );
}

/** Rejects a blank name for a control that shows no text, so it can never be announced as nothing. */
export function requireName(named: Pick<Described, "id" | "label">, component: string): string {
  if (named.label.trim().length === 0) {
    throw new UiContractError("name-missing", named.id, `${component} needs a text name because it shows no words.`);
  }
  return named.label;
}
