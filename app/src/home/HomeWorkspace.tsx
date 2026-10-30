import { useCallback, useSyncExternalStore } from "react";
import { FrameWindow } from "../frame/FrameWindow";
import type { WindowController } from "../frame/WindowController";
import { isWorkspace } from "../nav/destinations";
import { GuardDialog } from "../nav/GuardDialog";
import { registerShellRouter } from "../nav/ShellRouter";
import { WorkspaceIdentity, WorkspaceMenus } from "../nav/WorkspaceToolbar";
import type { WorkspaceNavigator } from "../nav/WorkspaceNavigator";
import type { UiRuntime } from "../ui";
import { WorkspaceStage } from "../workspaces/WorkspaceStage";
import type { HomeDependencies } from "./homeDependencies";
import { registerHomeRouter } from "./HomeRouter";
import { SplashScreen } from "./SplashScreen";
import { StartupFailure } from "./StartupFailure";
import type { StartupReady, StartupRetryable } from "./startupChecks";

export interface HomeWorkspaceProps {
  readonly report: StartupReady | StartupRetryable;
  readonly dependencies: HomeDependencies;
  readonly controller: WindowController;
  readonly navigator: WorkspaceNavigator;
  readonly retry: () => void;
  /** True after a retry, so focus lands on the heading and a keyboard user is not left on nothing. */
  readonly focusHeading: boolean;
}

/** The window with the full catalogs: the shell's actions are registered before the first paint, then the launch screen or the open workspace shows. */
export function HomeWorkspace({ report, dependencies, controller, navigator, retry, focusHeading }: HomeWorkspaceProps) {
  const { theme } = dependencies;
  const { info, registry } = report;
  const snapshot = useSyncExternalStore(navigator.subscribe, navigator.getSnapshot);
  const registerScreen = useCallback(
    (runtime: UiRuntime) => {
      const removers = [registerHomeRouter(runtime.bus, registry, { retryStartup: retry }), registerShellRouter(runtime.bus, registry, { theme, navigator })];
      return () => {
        for (const remove of removers) remove();
      };
    },
    [registry, theme, retry, navigator],
  );
  const { destination } = snapshot;
  const workspace = isWorkspace(destination) ? destination : null;
  return (
    <FrameWindow
      registry={registry}
      controller={controller}
      quit={dependencies.quit}
      report={dependencies.report}
      correlation={info === null ? {} : { launchId: info.launchId }}
      registerScreen={registerScreen}
      middle={workspace === null ? undefined : <WorkspaceIdentity workspace={workspace} />}
      end={workspace === null ? undefined : <WorkspaceMenus key={workspace} workspace={workspace} theme={theme} />}
    >
      {report.ok ? (
        <>
          {destination === "splash" ? <SplashScreen info={report.info} theme={theme} focusHeading={focusHeading || snapshot.opened.length > 0} /> : null}
          <WorkspaceStage snapshot={snapshot} surfaces={dependencies.surfaces} />
          <GuardDialog navigator={navigator} />
        </>
      ) : (
        <StartupFailure report={report} theme={theme} />
      )}
    </FrameWindow>
  );
}
