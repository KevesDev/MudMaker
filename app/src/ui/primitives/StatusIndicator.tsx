import { useId } from "react";
import { helpOf, type Described } from "../actions/types";
import { requireName } from "./shared";

export type StatusTone = "success" | "warning" | "error" | "information";

export interface StatusIndicatorProps {
  readonly described: Described;
  readonly tone: StatusTone;
  /** The state in words, such as "Connected"; the dot color only supports it. */
  readonly text: string;
}

export function StatusIndicator({ described, tone, text }: StatusIndicatorProps) {
  const name = requireName(described, "StatusIndicator");
  const helpId = useId();
  const help = helpOf(described);
  // The help sits beside the live region, not in it, so an update announces the state and not the help again.
  return (
    <>
      <span role="status" aria-label={name} aria-describedby={help.length > 0 ? helpId : undefined} className="ui-status" data-tone={tone}>
        <span aria-hidden="true" className="ui-status-dot" />
        <span className="ui-status-name">{name}:</span> <span className="ui-status-text">{text}</span>
      </span>
      {help.length > 0 ? (
        <span id={helpId} className="ui-visually-hidden">
          {help}
        </span>
      ) : null}
    </>
  );
}
