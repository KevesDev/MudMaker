import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { AppFrame, AppWindow } from "./frame/AppFrame";
import { frameCopy } from "./frame/frameCopy";
import { FrameWindow } from "./frame/FrameWindow";
import { WindowController } from "./frame/WindowController";
import { HomeWorkspace } from "./home/HomeWorkspace";
import { homeCopy } from "./home/homeCopy";
import { productionDependencies, type HomeDependencies } from "./home/homeDependencies";
import { WorkspaceNavigator } from "./nav/WorkspaceNavigator";
import { InstallDamaged } from "./home/StartupFailure";
import { LoadingAnnouncement, StartupLoading } from "./home/StartupLoading";
import { useStartup } from "./home/useStartup";
import type { ActionRegistry, Correlation } from "./ui";

interface StartupWindowProps {
  readonly frameRegistry: ActionRegistry | null;
  readonly dependencies: HomeDependencies;
  readonly controller: WindowController;
  readonly correlation: Correlation;
  readonly children: ReactNode;
}

/**
 * The window around the screens that appear before the full catalogs are available. Its window controls come
 * from the frame's own registry; only if that cannot load either is the frame reduced to a title and a drag region.
 */
function StartupWindow({ frameRegistry, dependencies, controller, correlation, children }: StartupWindowProps) {
  if (frameRegistry === null) return <AppWindow frame={<AppFrame title={homeCopy.productName} />}>{children}</AppWindow>;
  return (
    <FrameWindow registry={frameRegistry} controller={controller} quit={dependencies.quit} report={dependencies.report} correlation={correlation}>
      {children}
    </FrameWindow>
  );
}

/** Loads the frame's own registry once. A failure is logged, never hidden, and leaves the frame without controls. */
function loadFrameRegistryOrReport(dependencies: HomeDependencies): ActionRegistry | null {
  try {
    return dependencies.loadFrameRegistry();
  } catch (failure) {
    dependencies.report({
      severity: "error",
      code: "frame-catalog-invalid",
      actionId: null,
      controlId: null,
      message: frameCopy.controlsUnloaded,
      detail: failure instanceof Error ? failure.message : String(failure),
      correlation: {},
    });
    return null;
  }
}

export function App({ dependencies = productionDependencies }: { readonly dependencies?: HomeDependencies }) {
  const { state, attempt, retry } = useStartup(dependencies);
  const [frameRegistry] = useState(() => loadFrameRegistryOrReport(dependencies));
  /** The launch id is kept once the shell has given it, through every later check and Retry. */
  const info = state.phase === "checking" ? null : state.report.info;
  const [launchId, setLaunchId] = useState<string | null>(null);
  useEffect(() => {
    if (info !== null) setLaunchId(info.launchId);
  }, [info]);
  const correlation = useMemo<Correlation>(() => (launchId === null ? {} : { launchId }), [launchId]);
  const latest = useRef(correlation);
  useEffect(() => {
    latest.current = correlation;
  }, [correlation]);
  /** Owned here, above every screen, so what is known of the window survives the loading and Retry screens. */
  const [controller] = useState(() => new WindowController({ shell: dependencies.windowShell, report: dependencies.report, correlation: () => latest.current }));
  /** Owned here too, so opened workspaces outlive the loading and Retry screens. */
  const [navigator] = useState(() => new WorkspaceNavigator(dependencies.leaveServices, dependencies.report, () => latest.current));
  let screen: ReactElement;
  if (state.phase === "checking") {
    screen = (
      <StartupWindow frameRegistry={frameRegistry} dependencies={dependencies} controller={controller} correlation={correlation}>
        <StartupLoading theme={dependencies.theme} />
      </StartupWindow>
    );
  } else if (state.report.registry === null) {
    screen = (
      <StartupWindow frameRegistry={frameRegistry} dependencies={dependencies} controller={controller} correlation={correlation}>
        <InstallDamaged theme={dependencies.theme} />
      </StartupWindow>
    );
  } else {
    screen = <HomeWorkspace report={state.report} dependencies={dependencies} controller={controller} navigator={navigator} retry={retry} focusHeading={attempt > 1} />;
  }
  return (
    <>
      {screen}
      <LoadingAnnouncement checking={state.phase === "checking"} />
    </>
  );
}
