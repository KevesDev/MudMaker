/** Test double for the window the shell owns: it changes state the way a real window does and tells its listeners. */
import { vi, type Mock } from "vitest";
import type { WindowShell } from "./windowShell";

export interface FakeWindowShell extends WindowShell {
  readonly minimize: Mock<() => Promise<void>>;
  readonly toggleMaximize: Mock<() => Promise<void>>;
  readonly isMaximized: Mock<() => Promise<boolean>>;
  readonly onStateChange: Mock<(listener: () => void) => Promise<() => void>>;
  /** Listeners that are currently attached. */
  listenerCount(): number;
  /** The user or the system changes the window without using a frame control, for example by snapping it. */
  changeOutside(maximized: boolean): void;
}

export function fakeWindowShell(initiallyMaximized = false): FakeWindowShell {
  let maximized = initiallyMaximized;
  const listeners = new Set<() => void>();
  const announce = (): void => {
    for (const listener of [...listeners]) listener();
  };
  return {
    minimize: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    toggleMaximize: vi.fn<() => Promise<void>>(() => {
      maximized = !maximized;
      announce();
      return Promise.resolve();
    }),
    isMaximized: vi.fn<() => Promise<boolean>>(() => Promise.resolve(maximized)),
    onStateChange: vi.fn<(listener: () => void) => Promise<() => void>>((listener) => {
      listeners.add(listener);
      return Promise.resolve(() => {
        listeners.delete(listener);
      });
    }),
    listenerCount: () => listeners.size,
    changeOutside: (value) => {
      maximized = value;
      announce();
    },
  };
}
