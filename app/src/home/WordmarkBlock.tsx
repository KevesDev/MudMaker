import type { CSSProperties, RefObject } from "react";
import type { ThemeManager } from "../theme";
import { useWordmarkFit } from "./useWordmarkFit";
import { WORDMARK_STEP_PROPERTY, WORDMARK_TEXT } from "./wordmark";

export interface WordmarkProps {
  readonly name: string;
  readonly theme: ThemeManager;
  /** The screen element the banner is centered in, whose room beside the banner decides where the version hangs. */
  readonly stageRef: RefObject<HTMLElement | null>;
  /** The heading of the loaded screen. Elsewhere the name is a paragraph, so the page has one heading at most. */
  readonly heading?: { readonly testId: string; readonly ref: RefObject<HTMLHeadingElement | null> };
  /**
   * The installed version and build, small. With room beside the banner they hang at its lower right as the two
   * lines; without it they are the one compact string under it.
   */
  readonly version?: { readonly testId: string; readonly lines: readonly [string, string]; readonly compact: string };
}

/**
 * The block-letter banner centered on the screen's axis, with the product name for assistive technology beside it
 * as hidden text. The banner is decoration and is hidden from assistive technology.
 */
export function WordmarkBlock({ name, theme, stageRef, heading, version }: WordmarkProps) {
  const fit = useWordmarkFit(theme, stageRef);
  const art = (
    <>
      <span className="ui-visually-hidden">{name}</span>
      <span className="home-wordmark-art" aria-hidden="true" ref={fit.artRef} style={{ [WORDMARK_STEP_PROPERTY]: fit.step } as CSSProperties}>
        {WORDMARK_TEXT}
      </span>
    </>
  );
  return (
    <div className="home-wordmark" ref={fit.rowRef}>
      <div className="home-wordmark-box">
        {heading === undefined ? (
          <p className="home-wordmark-title">{art}</p>
        ) : (
          <h1 className="home-wordmark-title" data-testid={heading.testId} tabIndex={-1} ref={heading.ref}>
            {art}
          </h1>
        )}
        {version === undefined ? null : (
          <>
            <p className="home-version" data-testid={version.testId} data-placement={fit.placement} ref={fit.versionRef}>
              {fit.placement === "beside" ? version.lines.map((line) => <span key={line}>{line}</span>) : version.compact}
            </p>
            {/* Never seen: it gives the width of the two lines, so the room beside the banner is judged the same whichever form is showing. */}
            <span className="home-version-probe" aria-hidden="true" style={{ visibility: "hidden" }} ref={fit.probeRef}>
              {version.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
