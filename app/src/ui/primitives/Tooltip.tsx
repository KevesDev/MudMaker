import { useCallback, useSyncExternalStore } from "react";
import { helpOf, isPassive, type Described } from "../actions/types";
import { copy } from "../copy";
import { useUi } from "../UiProvider";
import { useControlRuntime } from "./shared";

function useHelpShown(helpKey: string): boolean {
  const { input } = useUi();
  return useSyncExternalStore(
    useCallback((listener) => input.help.subscribe(listener), [input]),
    () => input.help.isShown(helpKey),
  );
}

function useShortcutLabel(actionId: string | null): string | null {
  const { shortcuts } = useUi();
  useSyncExternalStore(
    useCallback((listener) => shortcuts.subscribe(listener), [shortcuts]),
    () => shortcuts.getVersion(),
  );
  return actionId === null ? null : shortcuts.labelFor(actionId);
}

export interface TooltipProps {
  /** DOM id referenced by the control's aria-describedby. */
  readonly id: string;
  readonly described: Described;
  /** Key the input manager uses for help state: a control id or a local command id. */
  readonly helpKey: string;
}

/**
 * Label, short explanation, why the control is unavailable, and its shortcut. It shows on hover,
 * on keyboard focus and on an explicit help request, and always stays in the accessible description.
 */
export function Tooltip({ id, described, helpKey }: TooltipProps) {
  const passive = isPassive(described);
  const runtime = useControlRuntime(passive ? null : described.id);
  const shown = useHelpShown(helpKey);
  const shortcut = useShortcutLabel(passive ? null : described.actionId);
  return (
    <span role="tooltip" id={id} data-help-for={helpKey} className="ui-tooltip" hidden={!shown}>
      <strong className="ui-tooltip-title">{described.label}</strong>
      <span>{helpOf(described)}</span>
      {runtime.state === "disabled" && runtime.reason !== null ? (
        <span>
          {copy.unavailablePrefix} {runtime.reason}
        </span>
      ) : null}
      {shortcut !== null ? (
        <span>
          {copy.shortcutPrefix} {shortcut}
        </span>
      ) : null}
    </span>
  );
}
