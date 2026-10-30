/** The `MudMaker` banner: one string per text row, one character per column, in a fixed-width grid. Solid rows use full and half blocks; the rows below them use shade characters for the dithered lower edge. */
export const WORDMARK_ROWS: readonly string[] = [
  "███▄   ▄███               ███ ███▄   ▄███          ███                      ",
  "███████████               ███ ███████████          ███                      ",
  "███ ███ ███ ███  ███  ▄██████ ███ ███ ███  ▀▀▀▀██▄ ███ ▄██▀ ▄██▀▀██▄ ███▄███",
  "███  ▀  ███ ███  ███ ███  ███ ███  ▀  ███ ▄██▀▀███ █████▀   ███▄▄███ ███▀   ",
  "███     ███ ███  ███ ███  ███ ███     ███ ███  ███ ███▀██▄  ███▀▀▀▀▀ ███    ",
  "███     ███  ▀██████  ▀██████ ███     ███  ▀██████ ███  ███  ▀█████▀ ███    ",
  "▒░▒     ▒░▒   ▒░▒░▒░   ░▒░▒░▒ ▒░▒     ▒░▒   ▒░▒░▒░ ░▒░  ▒░▒   ▒░▒░▒  ░▒░    ",
  "░ ░     ░ ░   ░ ░ ░     ░ ░ ░ ░ ░     ░ ░   ░ ░ ░   ░   ░ ░   ░ ░ ░   ░     ",
];

/** The banner as the one block of text the screen draws. */
export const WORDMARK_TEXT: string = WORDMARK_ROWS.join("\n");

/** The custom property that carries the current whole step from the component to the stylesheet. */
export const WORDMARK_STEP_PROPERTY = "--wordmark-step";

/**
 * The largest step whose drawn banner fits the room. Each candidate is measured, because a font rounds its
 * character advance and the width does not grow evenly with the step. The search starts at the step now drawn
 * and moves up or down until the answer is stable, so a stable window costs two measurements. Whatever the
 * starting step, the answer depends only on the room and the measurements, so it cannot flip between two steps.
 * Never less than one: a window too narrow for the smallest step clips the decoration instead of blurring it.
 */
export function largestFittingStep(widthAt: (step: number) => number, available: number, from: number): number {
  let step = Math.max(1, Math.floor(from));
  let width = widthAt(step);
  if (!Number.isFinite(available) || !(width > 0)) return 1;
  if (width > available) {
    while (step > 1) {
      step -= 1;
      width = widthAt(step);
      if (width <= available) break;
    }
    return step;
  }
  for (;;) {
    const next = widthAt(step + 1);
    if (!(next > width) || next > available) return step;
    step += 1;
    width = next;
  }
}
