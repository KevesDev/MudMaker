import { useLayoutEffect, useState } from "react";
import { createUiRuntime, UiProvider } from "../ui";
import type { HomeDependencies } from "./homeDependencies";
import { registerHomeRouter } from "./HomeRouter";
import { SplashScreen } from "./SplashScreen";
import { StartupFailure } from "./StartupFailure";
import type { StartupReady, StartupRetryable } from "./startupChecks";

export interface HomeWorkspaceProps {
  readonly report: StartupReady | StartupRetryable;
  readonly dependencies: HomeDependencies;
  readonly retry: () => void;
  /** True after a retry, so focus lands on the heading and a keyboard user is not left on nothing. */
  readonly focusHeading: boolean;
}

/** Builds the one shared interface runtime for the window and gives the home router its actions before the first paint. */
export function HomeWorkspace({ report, dependencies, retry, focusHeading }: HomeWorkspaceProps) {
  const { quit, theme } = dependencies;
  const { info, registry } = report;
  const [runtime] = useState(() =>
    createUiRuntime({
      registry,
      document,
      diagnostics: dependencies.report,
      ...(info === null ? {} : { correlation: () => ({ launchId: info.launchId }) }),
    }),
  );
  useLayoutEffect(() => registerHomeRouter(runtime.bus, registry, { quit, theme, retryStartup: retry }), [runtime, registry, quit, theme, retry]);
  return (
    <UiProvider runtime={runtime}>
      {report.ok ? <SplashScreen info={report.info} theme={theme} focusHeading={focusHeading} /> : <StartupFailure report={report} />}
    </UiProvider>
  );
}
