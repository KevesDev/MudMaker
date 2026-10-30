import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { copy } from "../copy";
import { focusableWithin } from "../input/dom";
import { useUi } from "../UiProvider";
import { useCommand, useLatest } from "./shared";

export interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  /**
   * A destructive dialog ignores Escape and shows no Close button: the user must pick one of
   * the explicit options supplied as children, so a stray key cannot cancel or confirm it.
   */
  readonly destructive?: boolean;
  /** Set to false when the dialog's own options already include a way to cancel, so the dialog does not offer two. Escape still closes it. */
  readonly closeButton?: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/** The opener first, then the elements around it, so focus can land close by if the opener is removed. */
function focusReturnTargets(opener: Element | null): HTMLElement[] {
  if (!(opener instanceof HTMLElement)) return [];
  const targets: HTMLElement[] = [];
  const { body, documentElement } = opener.ownerDocument;
  for (let node: HTMLElement | null = opener; node !== null && node !== body && node !== documentElement; node = node.parentElement) {
    targets.push(node);
  }
  return targets;
}

/**
 * Modal dialog. While open it owns keyboard focus: Tab stays inside, Escape closes it when it is
 * not destructive, and closing returns focus to whatever opened it, or the nearest element around it.
 */
export function Dialog({ open, title, description, destructive = false, closeButton = true, onClose, children }: DialogProps) {
  const ui = useUi();
  const uid = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // The opener is read while rendering, on the closed-to-open change, because the dialog's own children may
  // take focus (autoFocus) before any effect runs. The read changes nothing, and keeping it in state means the
  // repeated effects of development builds see the same opener and a closed dialog holds no reference to it.
  const [wasOpen, setWasOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<readonly HTMLElement[]>([]);
  if (open !== wasOpen) {
    setWasOpen(open);
    setReturnTo(open ? focusReturnTargets(ui.focus.openerCandidate()) : []);
  }
  const titleId = `${uid}-title`;
  const descriptionId = `${uid}-description`;
  const closeCommand = `dialog.close.${uid}`;
  const requestClose = useLatest(onClose);
  useCommand(closeCommand, () => requestClose.current());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || dialog === null) return;
    const pop = ui.focus.pushScope({
      key: `dialog:${uid}`,
      kind: "dialog",
      container: dialog,
      onEscape: destructive ? () => ui.announcer.announce(copy.chooseAnOption) : () => requestClose.current(),
    });
    ui.focus.endActivation();
    const depth = ui.focus.scopes().length;
    const body = bodyRef.current;
    const first = body ? focusableWithin(body)[0] : undefined;
    (first ?? dialog).focus();
    return () => {
      pop();
      ui.focus.releaseLayer(depth, returnTo);
    };
  }, [open, destructive, uid, ui, requestClose, returnTo]);

  if (!open) return null;
  return (
    <div className="ui-dialog-backdrop">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
        className="ui-dialog"
      >
        <h2 id={titleId} className="ui-dialog-title">
          {title}
        </h2>
        {description === undefined ? null : (
          <p id={descriptionId} className="ui-dialog-description">
            {description}
          </p>
        )}
        <div ref={bodyRef} className="ui-dialog-body">
          {children}
        </div>
        {destructive || !closeButton ? null : (
          <button type="button" className="ui-control ui-hit ui-button" data-ui-command={closeCommand}>
            {copy.close}
          </button>
        )}
      </div>
    </div>
  );
}
