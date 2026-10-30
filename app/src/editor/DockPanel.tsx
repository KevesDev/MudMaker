import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { focusableWithin, requireName, useLatest, useUi, type Described } from "../ui";
import { useTabletWidth } from "./useEditorLayout";

export interface DockPanelProps {
  readonly described: Described;
  /** A drawer is collapsed until its owner asks for it; while collapsed it draws nothing and holds no focus stop. */
  readonly open: boolean;
  /** Asks the owner to collapse the drawer, from Escape or, at the tablet width, a press outside it. */
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * A drawer on the leading edge of the work area. It shares the row with the work surface, and at the tablet
 * width it lies over the surface instead, so the surface is never squeezed. Opening moves focus into it; closing
 * returns focus to whatever opened it.
 */
export function DockPanel({ described, open, onClose, children }: DockPanelProps) {
  const ui = useUi();
  const name = requireName(described, "DockPanel");
  const overlay = useTabletWidth();
  const uid = useId();
  const ref = useRef<HTMLElement>(null);
  const requestClose = useLatest(onClose);
  // The opener is read while rendering, on the closed-to-open change, because the drawer's own content may take focus first.
  const [wasOpen, setWasOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  if (open !== wasOpen) {
    setWasOpen(open);
    setOpener(open ? ui.focus.openerCandidate() : null);
  }

  useEffect(() => {
    const drawer = ref.current;
    if (!open || drawer === null) return;
    ui.focus.endActivation();
    (focusableWithin(drawer)[0] ?? drawer).focus();
  }, [open, ui]);

  useEffect(() => {
    const drawer = ref.current;
    if (!open || drawer === null) return;
    const pop = ui.focus.pushScope({
      key: `drawer:${uid}`,
      kind: "panel",
      container: drawer,
      onEscape: () => requestClose.current(),
      ...(overlay ? { onOutsidePress: () => requestClose.current() } : {}),
    });
    const depth = ui.focus.scopes().length;
    return () => {
      pop();
      ui.focus.releaseLayer(depth, opener === null ? [] : [opener]);
    };
  }, [open, overlay, ui, uid, requestClose, opener]);

  if (!open) return null;
  return (
    <aside ref={ref} aria-label={name} tabIndex={-1} className={overlay ? "editor-drawer editor-drawer-overlay" : "editor-drawer"}>
      {children}
    </aside>
  );
}
