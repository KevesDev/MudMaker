import type { ReactNode } from "react";
import type { ControlDescriptor } from "../ui";
import { isVisible, type StartupPhase } from "./homeLayout";

/** Renders its children only when the catalog says the control shows in this phase. */
export function Shown({ control, phase, children }: { readonly control: ControlDescriptor; readonly phase: StartupPhase; readonly children: ReactNode }) {
  return isVisible(control, phase) ? <>{children}</> : null;
}
