import { helpOf, type Described } from "../actions/types";
import { copy } from "../copy";
import { requireName, useCommand, useLatest } from "./shared";

export type ToastTone = keyof typeof copy.toneLabel;

export interface ToastProps {
  /** The title and message. The id must be unique among toasts on screen. */
  readonly described: Described;
  readonly tone: ToastTone;
  /** Stable error code shown so the user can quote it to support. */
  readonly code?: string;
  readonly onDismiss: () => void;
}

/**
 * A notice that stays until dismissed, so nothing disappears before it is read. Problems use an
 * alert role and everything else a polite status; the tone is also spelled out in words.
 */
export function Toast({ described, tone, code, onDismiss }: ToastProps) {
  const title = requireName(described, "Toast");
  const dismissCommand = `toast.dismiss.${described.id}`;
  const dismiss = useLatest(onDismiss);
  useCommand(dismissCommand, () => dismiss.current());
  return (
    <div role={tone === "error" ? "alert" : "status"} className="ui-toast" data-tone={tone}>
      <strong className="ui-toast-title">
        {copy.toneLabel[tone]}: {title}
      </strong>
      <span className="ui-toast-message">{helpOf(described)}</span>
      {code === undefined ? null : <span className="ui-toast-code">{copy.reference(code)}</span>}
      <button type="button" className="ui-control ui-hit ui-button" data-ui-command={dismissCommand}>
        {copy.dismiss}
      </button>
    </div>
  );
}
