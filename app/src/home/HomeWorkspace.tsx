import { useCallback } from "react";
import { FrameWindow } from "../frame/FrameWindow";
import type { WindowController } from "../frame/WindowController";
import type { UiRuntime } from "../ui";
import type { HomeDependencies } from "./homeDependencies";
import { registerHomeRouter } from "./HomeRouter";
import { SplashScreen } from "./SplashScreen";
import { StartupFailure } from "./StartupFailure";
import type { StartupReady, StartupRetryable } from "./startupChecks";

export interface HomeWorkspaceProps {
  readonly report: StartupReady | StartupRetryable;
  readonly dependencies: HomeDependencies;
  readonly controller: WindowController;
  readonly retry: () => void;
  /** True after a retry, so focus lands on the heading and a keyboard user is not left on nothing. */
  readonly focusHeading: boolean;
}

/** The window with the full catalogs: the home router gets its actions before the first paint. */
export function HomeWorkspace({ report, dependencies, controller, retry, focusHeading }: HomeWorkspaceProps) {
  const { theme } = dependencies;
  const { info, registry } = report;
  const registerScreen = useCallback((runtime: UiRuntime) => registerHomeRouter(runtime.bus, registry, { theme, retryStartup: retry }), [registry, theme, retry]);
  return (
    <FrameWindow
      registry={registry}
      controller={controller}
      quit={dependencies.quit}
      report={dependencies.report}
      correlation={info === null ? {} : { launchId: info.launchId }}
      registerScreen={registerScreen}
    >
      {report.ok ? <SplashScreen info={report.info} theme={theme} focusHeading={focusHeading} /> : <StartupFailure report={report} theme={theme} />}
    </FrameWindow>
  );
}
