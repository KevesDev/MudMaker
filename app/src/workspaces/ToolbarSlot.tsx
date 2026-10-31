import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Where the active workspace's frequent actions are drawn: the middle of the frame row. */
export const ToolbarTargetContext = createContext<{ readonly element: HTMLElement | null } | undefined>(undefined);

/** Whether the workspace around a part is the one showing; a hidden workspace draws nothing into the frame row. */
export const WorkspaceActiveContext = createContext(true);

/**
 * Draws a workspace's frequent actions into the single frame row. Without a frame around it, the actions
 * stay where they are written.
 */
export function ToolbarSlot({ children }: { readonly children: ReactNode }) {
  const target = useContext(ToolbarTargetContext);
  const active = useContext(WorkspaceActiveContext);
  if (!active) return null;
  if (target === undefined) return <>{children}</>;
  return target.element === null ? null : createPortal(children, target.element);
}
