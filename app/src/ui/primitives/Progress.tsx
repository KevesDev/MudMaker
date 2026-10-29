import { useId } from "react";
import { UiContractError, helpOf, type Described } from "../actions/types";
import { copy } from "../copy";
import { requireName } from "./shared";

export interface ProgressProps {
  readonly described: Described;
  /** Fraction complete from 0 to 1, or null while the amount of work is not known. */
  readonly fraction: number | null;
}

const PERCENT = 100;

export function Progress({ described, fraction }: ProgressProps) {
  const name = requireName(described, "Progress");
  const helpId = useId();
  if (fraction !== null && !(Number.isFinite(fraction) && fraction >= 0 && fraction <= 1)) {
    throw new UiContractError("progress-range", described.id, `Progress "${described.id}" needs a value from 0 to 1, not ${String(fraction)}.`);
  }
  const percent = fraction === null ? null : Math.round(fraction * PERCENT);
  return (
    <div className="ui-progress" data-indeterminate={fraction === null}>
      <span className="ui-progress-label">{name}</span>
      <div
        role="progressbar"
        aria-label={name}
        aria-describedby={helpId}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={percent === null ? copy.working : copy.progressPercent(percent)}
        className="ui-progress-track"
      >
        <div className="ui-progress-bar" style={percent === null ? undefined : { width: `${percent}%` }} />
      </div>
      <span className="ui-progress-value">{percent === null ? copy.working : copy.progressPercent(percent)}</span>
      <span id={helpId} className="ui-visually-hidden">
        {helpOf(described)}
      </span>
    </div>
  );
}
