import { useCallback, useEffect, useSyncExternalStore } from "react";
import { copy } from "../copy";
import { useUi } from "../UiProvider";
import type { TooltipContent } from "./tooltipRule";

function useHelpShown(helpKey: string): boolean {
  const { input } = useUi();
  return useSyncExternalStore(
    useCallback((listener) => input.help.subscribe(listener), [input]),
    () => input.help.isShown(helpKey),
  );
}

export interface TooltipProps {
  /** DOM id referenced by the control's aria-describedby when the tooltip adds a description. */
  readonly id: string;
  /** Key the input manager uses for help state: a control id or a local command id. */
  readonly helpKey: string;
  /** The control's name. */
  readonly title: string;
  /** Null when the tooltip rule gives this control no tooltip; nothing is rendered then. */
  readonly content: TooltipContent | null;
}

/**
 * The name plus whatever the tooltip rule calls for. It shows on hover, on keyboard focus and on an
 * explicit help request, so it is never hover-only.
 */
export function Tooltip({ id, helpKey, title, content }: TooltipProps) {
  const { input } = useUi();
  const shown = useHelpShown(helpKey);
  const hasContent = content !== null;
  useEffect(() => (hasContent ? input.help.register(helpKey) : undefined), [input, helpKey, hasContent]);
  if (content === null) return null;
  return (
    <span role="tooltip" id={id} data-help-for={helpKey} className="ui-tooltip" hidden={!shown}>
      <strong className="ui-tooltip-title">{title}</strong>
      {content.explanation === null ? null : <span>{content.explanation}</span>}
      {content.reason === null ? null : (
        <span>
          {copy.unavailablePrefix} {content.reason}
        </span>
      )}
      {content.shortcut === null ? null : (
        <span>
          {copy.shortcutPrefix} {content.shortcut}
        </span>
      )}
    </span>
  );
}
