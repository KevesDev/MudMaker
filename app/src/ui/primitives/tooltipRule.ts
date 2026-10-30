import type { ControlRuntime } from "../actions/ActionBus";
import type { ControlDescriptor } from "../actions/types";

/** What a tooltip says beyond the control's name. Each part is present only when its own condition holds. */
export interface TooltipContent {
  readonly explanation: string | null;
  /** Why the control cannot be used right now. */
  readonly reason: string | null;
  readonly shortcut: string | null;
}

interface TooltipFacts {
  readonly control: ControlDescriptor;
  readonly runtime: ControlRuntime;
  readonly shortcut: string | null;
  /** True when the control shows no text, so its name is the only way a sighted user learns what it is. */
  readonly iconOnly: boolean;
}

/**
 * The tooltip rule: a tooltip exists only for a control disabled before the user acts, an icon-only control,
 * a control with an assigned shortcut, or a catalog entry that sets showHelp. The result of an activation
 * (refusal, unavailable, error) is reported once by the owner's notice and never repeated here.
 */
export function tooltipContent({ control, runtime, shortcut, iconOnly }: TooltipFacts): TooltipContent | null {
  const reason = runtime.state === "disabled" ? runtime.reason : null;
  if (reason === null && shortcut === null && !control.showHelp && !iconOnly) return null;
  return { explanation: control.showHelp ? control.tooltip : null, reason, shortcut };
}

/** A tooltip that only repeats the accessible name adds nothing to a screen reader, so it is not made a description. */
export function addsDescription(content: TooltipContent): boolean {
  return content.explanation !== null || content.reason !== null || content.shortcut !== null;
}
