import { useCallback, useEffect, useState } from "react";
import { runStartupChecks, type StartupDependencies, type StartupFailed, type StartupReady } from "./startupChecks";

type StartupState =
  | { readonly phase: "checking" }
  | { readonly phase: "ready"; readonly report: StartupReady }
  | { readonly phase: "failed"; readonly report: StartupFailed };

/** Runs the startup checks once per attempt; an answer that arrives after a newer attempt began is dropped. */
export function useStartup(dependencies: StartupDependencies): { readonly state: StartupState; readonly attempt: number; readonly retry: () => void } {
  const [attempt, setAttempt] = useState(1);
  const [state, setState] = useState<StartupState>({ phase: "checking" });

  useEffect(() => {
    let current = true;
    void runStartupChecks(dependencies, attempt).then((report) => {
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
