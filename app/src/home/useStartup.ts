import { useCallback, useEffect, useRef, useState } from "react";
import { runStartupChecks, type StartupDependencies, type StartupFailed, type StartupReady, type StartupReport } from "./startupChecks";

type StartupState =
  | { readonly phase: "checking" }
  | { readonly phase: "ready"; readonly report: StartupReady }
  | { readonly phase: "failed"; readonly report: StartupFailed };

interface Run {
  readonly dependencies: StartupDependencies;
  readonly attempt: number;
  readonly report: Promise<StartupReport>;
}

/**
 * Runs the startup checks once per attempt, even when the development build mounts the component twice,
 * so each check is logged once. An answer that arrives after a newer attempt began is dropped.
 */
export function useStartup(dependencies: StartupDependencies): { readonly state: StartupState; readonly attempt: number; readonly retry: () => void } {
  const [attempt, setAttempt] = useState(1);
  const [state, setState] = useState<StartupState>({ phase: "checking" });
  const run = useRef<Run | null>(null);

  useEffect(() => {
    let current = true;
    if (run.current?.attempt !== attempt || run.current.dependencies !== dependencies) {
      run.current = { dependencies, attempt, report: runStartupChecks(dependencies, attempt) };
    }
    void run.current.report.then((report) => {
      if (current) setState(report.ok ? { phase: "ready", report } : { phase: "failed", report });
    });
    return () => {
      current = false;
    };
  }, [dependencies, attempt]);

  const retry = useCallback(() => {
    setState({ phase: "checking" });
    setAttempt((previous) => previous + 1);
  }, []);

  return { state, attempt, retry };
}
