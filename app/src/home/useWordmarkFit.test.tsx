/** jsdom does no layout, so widths are supplied by the test and the observer is driven by hand; only the arithmetic and wiring are proved here, not what a real font and window do. */
import { act, cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager } from "../theme";
import { fixtureBaseTokens, numberToken } from "../theme/fixtures";
import { visibleText } from "./homeTestSupport";
import { WordmarkBlock } from "./WordmarkBlock";
import { WORDMARK_STEP_PROPERTY } from "./wordmark";

/** A banner of 76 columns whose advance is rounded to whole pixels: 304 wide at step 4, 456 at step 5, 532 at step 6. */
const COLUMNS = 76;
const bannerWidth = (step: number): number => COLUMNS * Math.round(1.1 * step);
const VERSION_WIDTH = 96.5;
const VERSION_GAP = 8;
const COMPACT_WIDTH = 190.5;
const STAGE_PADDING = 16;
const realComputedStyle = window.getComputedStyle.bind(window);

/** jsdom does not resolve logical padding and margin, so the values a stylesheet would give are supplied. */
const STYLE_VALUES: Readonly<Record<string, string>> = {
  marginInlineStart: `${VERSION_GAP}px`,
  paddingInlineStart: `${STAGE_PADDING}px`,
  paddingInlineEnd: `${STAGE_PADDING}px`,
};
const LINES = ["Version 1.0.0", "Build 123"] as const;
const COMPACT = "Version 1.0.0, build 123";
const DEFAULT_STEP = numberToken(fixtureBaseTokens("editor"), "wordmark.defaultStep");

class FakeResizeObserver {
  static live = new Set<FakeResizeObserver>();
  private readonly callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    FakeResizeObserver.live.add(this);
  }
  observe(): void {}
  disconnect(): void {
    FakeResizeObserver.live.delete(this);
  }
  static fire(): void {
    for (const observer of [...FakeResizeObserver.live]) observer.callback();
  }
}

interface Room {
  row: number;
  stage: number;
}

function Harness({ withVersion, stage }: { readonly withVersion: boolean; readonly stage: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={stage} data-testid="stage">
      <WordmarkBlock
        name="MudMaker"
        theme={new ThemeManager(themeDefaults)}
        stageRef={stage}
        {...(withVersion ? { version: { testId: "version", lines: LINES, compact: COMPACT } } : {})}
      />
    </div>
  );
}

/** The observer reports and the answer is written one task later. */
const settle = (): void => {
  act(() => {
    FakeResizeObserver.fire();
    vi.runAllTimers();
  });
};

const art = (): HTMLElement => document.querySelector(".home-wordmark-art") as HTMLElement;
const appliedStep = (): string => art().style.getPropertyValue(WORDMARK_STEP_PROPERTY);
const placement = (): string | null => screen.queryByTestId("version")?.getAttribute("data-placement") ?? null;

const rect = (element: Element, width: () => number): void => {
  Object.defineProperty(element, "getBoundingClientRect", { configurable: true, value: () => ({ width: width() }) });
};

/** Supplies the widths a laid-out screen would have: the banner follows the step it is given. */
function layOut(room: Room): void {
  rect(document.querySelector(".home-wordmark") as Element, () => room.row);
  rect(art(), () => bannerWidth(Number(appliedStep())));
  const stage = screen.getByTestId("stage");
  Object.defineProperty(stage, "clientWidth", { configurable: true, get: () => room.stage });
  const version = screen.queryByTestId("version");
  // The compact line is wider than the two lines it has when hung beside the banner; the room is judged for the two lines.
  if (version !== null) rect(version, () => (version.dataset.placement === "beside" ? VERSION_WIDTH : COMPACT_WIDTH));
  const probe = document.querySelector(".home-version-probe");
  if (probe !== null) rect(probe, () => VERSION_WIDTH);
}

function mount(withVersion: boolean, room: Room): void {
  render(<Harness withVersion={withVersion} stage={createRef<HTMLDivElement>()} />);
  layOut(room);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const real = realComputedStyle(element);
    return new Proxy(real, { get: (target, key) => (typeof key === "string" && key in STYLE_VALUES ? STYLE_VALUES[key] : (Reflect.get(target, key) as unknown)) });
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  FakeResizeObserver.live.clear();
});

describe("the wordmark fit", () => {
  it("takes the largest step whose measured banner fits the row, and follows the room as it changes", () => {
    const room = { row: 400, stage: 1000 };
    mount(false, room);
    settle();
    expect(appliedStep()).toBe("4");
    room.row = 460;
    settle();
    expect(appliedStep()).toBe("5");
    room.row = 160;
    settle();
    expect(appliedStep()).toBe("2");
    room.row = 20;
    settle();
    expect(appliedStep()).toBe("1");
  });

  it("does not flip between two steps when the same room is measured again and again", () => {
    const room = { row: 400, stage: 1000 };
    mount(false, room);
    const seen: string[] = [];
    for (let count = 0; count < 6; count += 1) {
      settle();
      seen.push(appliedStep());
    }
    expect(seen).toEqual(Array.from({ length: 6 }, () => "4"));
  });

  it("writes nothing inside the observer callback: the step and the placement change one task later", () => {
    const room = { row: 400, stage: 1000 };
    mount(true, room);
    act(() => FakeResizeObserver.fire());
    expect(appliedStep()).toBe(String(DEFAULT_STEP));
    expect(placement()).toBe("below");
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.runAllTimers();
    });
    expect(appliedStep()).toBe("4");
    expect(placement()).toBe("beside");
  });

  it("leaves the banner and the version as it found them after measuring", () => {
    const room = { row: 460, stage: 1000 };
    mount(true, room);
    settle();
    const before = [appliedStep(), placement()];
    room.row = 300;
    act(() => FakeResizeObserver.fire());
    expect([appliedStep(), placement()]).toEqual(before);
  });

  it("shows the two lines beside the banner and the one compact string below it, in the text a person sees", () => {
    const padding = 2 * STAGE_PADDING;
    const room = { row: 460, stage: 456 + padding + 2 * (VERSION_WIDTH + VERSION_GAP) };
    mount(true, room);
    expect(visibleText()).toContain(COMPACT);
    expect(visibleText()).not.toContain(LINES[0]);
    settle();
    expect(placement()).toBe("beside");
    expect(visibleText()).toEqual(expect.arrayContaining([...LINES]));
    expect(visibleText()).not.toContain(COMPACT);
    expect([...screen.getByTestId("version").children].map((line) => line.textContent)).toEqual([...LINES]);
    room.stage -= 1;
    settle();
    expect(placement()).toBe("below");
    expect(visibleText()).toContain(COMPACT);
    expect(screen.getByTestId("version").children).toHaveLength(0);
    expect(visibleText().filter((text) => LINES.some((line) => text === line))).toEqual([]);
  });

  it("never shows the placement attribute and the version's content out of step: the answer reaches both in one commit", () => {
    const padding = 2 * STAGE_PADDING;
    const room = { row: 460, stage: 456 + padding + 2 * (VERSION_WIDTH + VERSION_GAP) };
    mount(true, room);
    const consistent = (): boolean => {
      const version = screen.getByTestId("version");
      const beside = version.getAttribute("data-placement") === "beside";
      return beside ? version.children.length === LINES.length : version.children.length === 0 && version.textContent === COMPACT;
    };
    expect(consistent()).toBe(true);
    // Fire the observer and the deferred write outside act, so React's own update is not flushed with them: this is the moment a frame could paint.
    const environment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    environment.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      FakeResizeObserver.fire();
      vi.runAllTimers();
      expect(consistent()).toBe(true);
    } finally {
      environment.IS_REACT_ACT_ENVIRONMENT = true;
    }
    settle();
    expect(placement()).toBe("beside");
    expect(consistent()).toBe(true);
  });

  it("judges the room for the version hung beside the banner, not for the compact line it may be showing", () => {
    // Step 5 is 456 wide. The beside block needs 96.5 + 8; the compact line would need 190.5 + 8.
    const padding = 2 * STAGE_PADDING;
    const room = { row: 460, stage: 456 + padding + 2 * (VERSION_WIDTH + VERSION_GAP) };
    mount(true, room);
    settle();
    expect(placement()).toBe("beside");
    settle();
    expect(placement()).toBe("beside");
  });

  it("keeps only the newest answer when the observer reports twice before the next task, and cancels a pending answer when the screen goes away", () => {
    const room = { row: 400, stage: 1000 };
    const { unmount } = render(<Harness withVersion={false} stage={createRef<HTMLDivElement>()} />);
    layOut(room);
    act(() => FakeResizeObserver.fire());
    room.row = 460;
    act(() => FakeResizeObserver.fire());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("writes the first answer before the first paint, with no wait", () => {
    const rects = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.classList.contains("home-wordmark-art")) return { width: bannerWidth(Number((this as HTMLElement).style.getPropertyValue(WORDMARK_STEP_PROPERTY))) } as DOMRect;
      return { width: 400 } as DOMRect;
    });
    try {
      render(<Harness withVersion={false} stage={createRef<HTMLDivElement>()} />);
      expect(appliedStep()).toBe("4");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      rects.mockRestore();
    }
  });

  it("starts each search from the step it already has, measuring that step and the next instead of probing up from one", () => {
    const room = { row: 400, stage: 1000 };
    mount(false, room);
    settle();
    expect(appliedStep()).toBe("4");
    const measuredAt: string[] = [];
    rect(art(), () => {
      measuredAt.push(appliedStep());
      return bannerWidth(Number(appliedStep()));
    });
    settle();
    expect(measuredAt).toEqual(["4", "4", "5"]);
    expect(appliedStep()).toBe("4");
  });

  it("gives the banner the same step and width with a version as without one", () => {
    const room = { row: 460, stage: 1000 };
    mount(false, room);
    settle();
    const without = appliedStep();
    cleanup();
    mount(true, room);
    settle();
    expect(appliedStep()).toBe(without);
    expect(without).toBe("5");
  });

  it("hangs the version beside the banner when the stage has room for it past the banner's right edge, and drops it below when it has not", () => {
    // Step 5 is 456 wide. The version needs its width and the gap before it on each side of the banner's center axis.
    const padding = 2 * STAGE_PADDING;
    const room = { row: 460, stage: 456 + padding + 2 * (VERSION_WIDTH + 100) };
    mount(true, room);
    settle();
    expect(placement()).toBe("beside");
    room.stage = 456 + padding + 2 * (VERSION_WIDTH + VERSION_GAP) - 0.5;
    settle();
    expect(placement()).toBe("below");
    room.stage = 456 + padding + 2 * (VERSION_WIDTH + VERSION_GAP);
    settle();
    expect(placement()).toBe("beside");
    room.stage = 456 + padding;
    settle();
    expect(placement()).toBe("below");
  });

  it("leaves the step alone while nothing has been laid out", () => {
    render(<Harness withVersion stage={createRef<HTMLDivElement>()} />);
    rect(art(), () => 0);
    settle();
    expect(appliedStep()).toBe(String(DEFAULT_STEP));
    expect(placement()).toBe("below");
  });

  it("stops observing when the screen goes away", () => {
    const { unmount } = render(<Harness withVersion stage={createRef<HTMLDivElement>()} />);
    expect(FakeResizeObserver.live.size).toBeGreaterThan(0);
    unmount();
    expect(FakeResizeObserver.live.size).toBe(0);
  });
});

describe("an environment without a resize observer", () => {
  it("draws the banner at the token's default step, with the version below it", () => {
    vi.unstubAllGlobals();
    expect(typeof ResizeObserver).toBe("undefined");
    render(<Harness withVersion stage={createRef<HTMLDivElement>()} />);
    expect(appliedStep()).toBe(String(DEFAULT_STEP));
    expect(DEFAULT_STEP).toBeGreaterThan(1);
    expect(placement()).toBe("below");
  });
});
