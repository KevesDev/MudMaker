/** jsdom does no layout, so the widths a font would give are supplied by the test and the observer is driven by hand. */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager } from "../theme";
import { OVERFLOW_TOLERANCE, useNarrowFlag } from "./useNarrowFlag";

class FakeResizeObserver {
  static live = new Set<FakeResizeObserver>();
  static observed = 0;
  private readonly callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    FakeResizeObserver.live.add(this);
  }
  observe(): void {
    FakeResizeObserver.observed += 1;
  }
  disconnect(): void {
    FakeResizeObserver.live.delete(this);
  }
  static fire(): void {
    for (const observer of [...FakeResizeObserver.live]) observer.callback();
  }
}

const ENTRIES = 3;

function Harness({ theme }: { readonly theme: ThemeManager }) {
  const { ref, narrow } = useNarrowFlag(theme);
  return (
    <nav ref={ref} data-testid="row" data-narrow={narrow}>
      {Array.from({ length: ENTRIES }, (_, index) => (
        <div key={index} />
      ))}
    </nav>
  );
}

/** The observer reports and the answer is written one task later. */
const settle = (): void => {
  act(() => {
    FakeResizeObserver.fire();
    vi.runAllTimers();
  });
};

const row = (): HTMLElement => screen.getByTestId("row");
const flag = (): string | null => row().getAttribute("data-narrow");

interface Page {
  /** The width the row has. */
  available: number;
  /** The width the three entries need in one line, which depends on the font and the text scale. */
  required: () => number;
}

/** Lays the row out like a browser would: in one line the last entry ends where the entries end, stacked it ends at the row's edge. */
function layOut(page: Page): void {
  Object.defineProperty(row(), "getBoundingClientRect", { configurable: true, value: () => ({ width: page.available, right: page.available }) });
  const last = row().lastElementChild as HTMLElement;
  Object.defineProperty(last, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ right: row().dataset.narrow === "false" ? Math.max(page.available, page.required()) : page.available }),
  });
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  FakeResizeObserver.live.clear();
  FakeResizeObserver.observed = 0;
});

describe("the action row stacking", () => {
  it("stacks only when the last entry runs past the row by more than the tolerance, at binary fractions of a pixel", () => {
    // Multiples of 1/64, which a browser's layout and a double hold exactly.
    const SIXTY_FOURTH = 1 / 64;
    const row0 = 479.75;
    const page: Page = { available: row0, required: () => row0 };
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    layOut(page);
    for (const [over, expected] of [
      [0, "false"],
      [OVERFLOW_TOLERANCE - SIXTY_FOURTH, "false"],
      [OVERFLOW_TOLERANCE, "false"],
      [OVERFLOW_TOLERANCE + SIXTY_FOURTH, "true"],
      [OVERFLOW_TOLERANCE, "false"],
    ] as const) {
      page.required = () => row0 + over;
      settle();
      expect(flag(), `${over} over`).toBe(expected);
    }
  });

  it("writes nothing inside the observer callback: the page is as it was until the next task", () => {
    const page: Page = { available: 300, required: () => 400 };
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    layOut(page);
    act(() => FakeResizeObserver.fire());
    expect(flag()).toBe("false");
    expect(row().dataset.narrow).toBe("false");
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.runAllTimers();
    });
    expect(flag()).toBe("true");
    expect(row().dataset.narrow).toBe("true");
  });

  it("leaves the page as it found it after measuring, even while stacked", () => {
    const page: Page = { available: 300, required: () => 400 };
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    layOut(page);
    settle();
    expect(row().dataset.narrow).toBe("true");
    act(() => FakeResizeObserver.fire());
    expect(row().dataset.narrow).toBe("true");
  });

  it("keeps only the newest answer when the observer reports twice before the next task", () => {
    const page: Page = { available: 300, required: () => 400 };
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    layOut(page);
    act(() => FakeResizeObserver.fire());
    page.available = 500;
    act(() => FakeResizeObserver.fire());
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.runAllTimers();
    });
    expect(flag()).toBe("false");
  });

  it("writes the first answer before the first paint, with no wait", () => {
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const narrowRow = this.tagName === "NAV";
      const dataset = (this.parentElement ?? this) as HTMLElement;
      const available = 300;
      const required = 400;
      if (narrowRow) return { width: available, right: available } as DOMRect;
      return { right: (dataset.dataset.narrow === "false" ? Math.max(available, required) : available) } as DOMRect;
    });
    try {
      render(<Harness theme={new ThemeManager(themeDefaults)} />);
      expect(flag()).toBe("true");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      rect.mockRestore();
    }
  });

  it("gives the right answer for fonts of different advance, because it measures what the entries need", () => {
    const outcome = (requiredByFont: number, available: number): string | null => {
      cleanup();
      render(<Harness theme={new ThemeManager(themeDefaults)} />);
      layOut({ available, required: () => requiredByFont });
      settle();
      return flag();
    };
    const NARROW_FONT = 280;
    const WIDE_FONT = 460;
    expect(outcome(NARROW_FONT, 446)).toBe("false");
    expect(outcome(WIDE_FONT, 446)).toBe("true");
    expect(outcome(WIDE_FONT, 460)).toBe("false");
  });

  it("measures the row in one line even while it is stacked, so a wider row un-stacks it", () => {
    const page: Page = { available: 300, required: () => 400 };
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    layOut(page);
    settle();
    expect(flag()).toBe("true");
    page.available = 400;
    settle();
    expect(flag()).toBe("false");
  });

  it("follows the text scale, which changes what the entries need, as soon as the theme changes", () => {
    const theme = new ThemeManager(themeDefaults);
    const NEEDED_AT_ONE = 300;
    const page: Page = { available: 500, required: () => NEEDED_AT_ONE * theme.getSnapshot("home").accessibility.textScale };
    render(<Harness theme={theme} />);
    layOut(page);
    settle();
    expect(flag()).toBe("false");
    act(() => {
      theme.setAccessibility("home", { textScale: 2, contrast: "normal", reducedMotion: false });
    });
    expect(flag()).toBe("true");
  });

  it("does not change its answer when the same measurements arrive again and again", () => {
    const page: Page = { available: 300, required: () => 400 };
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    layOut(page);
    const seen: (string | null)[] = [];
    for (let count = 0; count < 5; count += 1) {
      settle();
      seen.push(flag());
    }
    expect(seen).toEqual(Array.from({ length: 5 }, () => "true"));
  });

  it("watches the row and each entry, so a font change that does not resize the row is seen", () => {
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    expect(FakeResizeObserver.observed).toBe(1 + ENTRIES);
  });

  it("stays in one line while nothing has been laid out", () => {
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    layOut({ available: 0, required: () => 400 });
    settle();
    expect(flag()).toBe("false");
  });

  it("stops observing when the screen goes away", () => {
    const { unmount } = render(<Harness theme={new ThemeManager(themeDefaults)} />);
    expect(FakeResizeObserver.live.size).toBe(1);
    layOut({ available: 300, required: () => 400 });
    act(() => FakeResizeObserver.fire());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(FakeResizeObserver.live.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("an environment without a resize observer", () => {
  it("lays the row out in one line", () => {
    vi.unstubAllGlobals();
    expect(typeof ResizeObserver).toBe("undefined");
    render(<Harness theme={new ThemeManager(themeDefaults)} />);
    expect(flag()).toBe("false");
  });
});
