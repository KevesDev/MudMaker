import { memo } from "react";
import { GLYPHS, cellRuns, type ArtRun } from "./artRuns";
import type { ArtPiece } from "./parsePiece";
import "./art.css";

const SHAPE_CLASS: Readonly<Record<string, string>> = {
  [GLYPHS.full]: "art-full",
  [GLYPHS.upper]: "art-upper",
  [GLYPHS.lower]: "art-lower",
};

/** The classes of a run: the shape its cell is painted in, then the token colors it names. A run of spaces has none. */
function classesOf(run: ArtRun): string | undefined {
  const shape = SHAPE_CLASS[run.text.charAt(0)];
  const classes = [shape, run.fg === null ? undefined : `art-fg-${run.fg}`, run.bg === null ? undefined : `art-bg-${run.bg}`].filter((name) => name !== undefined);
  return classes.length === 0 ? undefined : classes.join(" ");
}

/**
 * Draws a parsed piece as text, two pixels per cell. The characters stay in the text, hidden, so they give each run
 * its exact width; the pixels themselves are painted as backgrounds, which the browser aligns to whole device
 * pixels, so neighbouring cells meet without a seam. It is decoration: hidden from assistive technology, never
 * focusable and never the target of a pointer. Colors come from role classes only, so the same output is recolored
 * by the theme.
 */
export const TextArt = memo(function TextArt({ piece }: { readonly piece: ArtPiece }) {
  return (
    <div className="text-art" aria-hidden="true">
      {cellRuns(piece).map((runs, row) => (
        <span key={row} className="text-art-row">
          {runs.map((run, index) => (
            <span key={index} className={classesOf(run)}>
              <span className="art-glyphs">{run.text}</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
});
