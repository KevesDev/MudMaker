import { UiContractError } from "../actions/types";
import { copy } from "../copy";
import { requireName, useCommand, useLatest } from "./shared";

export type ToastTone = keyof typeof copy.toneLabel;

export interface ToastProps {
  /** Must be unique among toasts on screen. */
  readonly id: string;
  readonly title: string;
  /** The notice itself. A toast never shows without one. */
  readonly message: string;
  readonly tone: ToastTone;
  /** Stable error code shown so the user can quote it to support. */
  readonly code?: string;
  readonly onDismiss: () => void;
  /** Set to false when the owner has already announced the same words, so they are not read twice. */
  readonly live?: boolean;
  /** Set to false when the message is a complete sentence on its own and a tone label and title would only repeat it. */
  readonly showTitle?: boolean;
}

/**
 * A notice that stays until dismissed, so nothing disappears before it is read. Problems use an
 * alert role and everything else a polite status; the tone is also spelled out in words.
 */
export function Toast({ id, title: name, message, tone, code, onDismiss, live = true, showTitle = true }: ToastProps) {
  const title = requireName({ id, label: name }, "Toast");
  if (message.trim().length === 0) {
    throw new UiContractError("message-missing", id, `Toast "${id}" has no message to show.`);
  }
  const dismissCommand = `toast.dismiss.${id}`;
  const dismiss = useLatest(onDismiss);
  useCommand(dismissCommand, () => dismiss.current());
  return (
    <div role={live ? (tone === "error" ? "alert" : "status") : undefined} className="ui-toast" data-tone={tone}>
      {showTitle ? (
        <strong className="ui-toast-title">
          {copy.toneLabel[tone]}: {title}
        </strong>
      ) : null}
      <span className="ui-toast-message">{message}</span>
      {code === undefined ? null : <span className="ui-toast-code">{copy.reference(code)}</span>}
      <button type="button" className="ui-control ui-hit ui-button" data-ui-command={dismissCommand}>
        {copy.dismiss}
      </button>
    </div>
  );
}
