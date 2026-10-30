import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { APP_MARK } from "../art/library";
import { TextArt } from "../art/TextArt";
import { createUiRuntime, UiProvider, type ActionRegistry, type Correlation, type DiagnosticSink, type UiRuntime } from "../ui";
import { AppFrame, AppWindow } from "./AppFrame";
import { registerFrameActions } from "./frameActions";
import { FRAME } from "./frameLayout";
import type { WindowController } from "./WindowController";
import { WindowControls } from "./WindowControls";

export interface FrameWindowProps {
  /** Holds at least the frame controls: the full catalogs, or the frame's own registry while those are not available. */
  readonly registry: ActionRegistry;
  /** Owned by the caller, so what is known of the window survives a change of screen. */
  readonly controller: WindowController;
  readonly quit: () => Promise<void>;
  readonly report: DiagnosticSink;
  readonly correlation: Correlation;
  /** Registers the actions of the screen inside the window and returns the function that removes them. */
  readonly registerScreen?: (runtime: UiRuntime) => () => void;
  readonly children: ReactNode;
}

/**
 * The window of every screen: its border, the frame row with the window controls, and the screen below.
 * It owns the interface runtime of the window, so the window controls always go through the one input
 * manager and the one action bus, whichever catalogs the screen was able to load.
 */
export function FrameWindow({ registry, controller, quit, report, correlation, registerScreen, children }: FrameWindowProps) {
  /** The launch id can arrive after the window first appears, so records read the newest correlation. */
  const latest = useRef(correlation);
  useLayoutEffect(() => {
    latest.current = correlation;
  }, [correlation]);
  const [runtime] = useState(() => createUiRuntime({ registry, document, diagnostics: report, correlation: () => latest.current }));
  useLayoutEffect(() => {
    const removeFrame = registerFrameActions(runtime.bus, registry, { quit, window: controller });
    const removeScreen = registerScreen?.(runtime);
    return () => {
      removeScreen?.();
      removeFrame();
    };
  }, [runtime, registry, quit, controller, registerScreen]);
  const title = registry.requireControl(FRAME.title);
  return (
    <UiProvider runtime={runtime}>
      <AppWindow frame={<AppFrame leading={<TextArt piece={APP_MARK} size="icon" />} title={title.label} titleTestId={title.testId} windowControls={<WindowControls controller={controller} />} />}>
        {children}
      </AppWindow>
    </UiProvider>
  );
}
