import type { ReactNode } from "react";
import { helpOf, type Described } from "../actions/types";
import { requireName } from "./shared";

export interface ToolbarProps {
  readonly described: Described;
  readonly orientation?: "horizontal" | "vertical";
  readonly children: ReactNode;
}

/** Groups related controls. The input manager moves focus between them with the arrow keys. */
export function Toolbar({ described, orientation = "horizontal", children }: ToolbarProps) {
  const name = requireName(described, "Toolbar");
  return (
    <div
      role="toolbar"
      aria-label={name}
      aria-description={helpOf(described)}
      aria-orientation={orientation}
      data-roving-group={orientation}
      className="ui-toolbar"
    >
      {children}
    </div>
  );
}
