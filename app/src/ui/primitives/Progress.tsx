import { useId } from "react";
import { UiContractError, helpOf, type Described } from "../actions/types";
import { copy } from "../copy";
import { requireName } from "./shared";

export interface ProgressProps {
  readonly described: Described;
  /** Fraction complete from 0 to 1, or null while the amount of work is not known. */
  readonly fraction: number | null;
  /** Set to false when the screen already says what is happening and the bar needs only its accessible name. */
  readonly showText?: boolean;
}

const PERCENT = 100;

export function Progress({ described, fraction, showText = true }: ProgressProps) {
  const name = requireName(described, "Progress");
  const helpId = useId();
  const help = helpOf(described);
  if (fraction !== null && !(Number.isFinite(fraction) && fraction >= 0 && fraction <= 1)) {
    throw new UiContractError("progress-range", described.id, `Progress "${described.id}" needs a value from 0 to 1, not ${String(fraction)}.`);
  }
  const percent = fraction === null ? null : Math.round(fraction * PERCENT);
  return (
    <div className="ui-progress" data-indeterminate={fraction === null}>
      {showText ? <span className="ui-progress-label">{name}</span> : null}
      <div
        role="progressbar"
        aria-label={name}
        aria-describedby={help.length > 0 ? helpId : undefined}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={percent === null ? copy.working : copy.progressPercent(percent)}
        className="ui-progress-track"
      >
        <div className="ui-progress-bar" style={percent === null ? undefined : { width: `${percent}%` }} />
      </div>
      {showText ? <span className="ui-progress-value">{percent === null ? copy.working : copy.progressPercent(percent)}</span> : null}
      {help.length > 0 ? (
        <span id={helpId} className="ui-visually-hidden">
          {help}
        </span>
      ) : null}
    </div>
  );
}
