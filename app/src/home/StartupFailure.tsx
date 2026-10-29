import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, useUi } from "../ui";
import { CheckList } from "./CheckList";
import { homeCopy } from "./homeCopy";
import { SPLASH } from "./homeLayout";
import type { CheckResult, StartupDamaged, StartupRetryable } from "./startupChecks";

/** The failure layout. Focus moves to the alert when it appears, so a keyboard or screen reader user lands on what went wrong. */
function FailureScreen({ results, message, children }: { readonly results: readonly CheckResult[]; readonly message: string; readonly children?: ReactNode }) {
  const titleId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alertRef.current?.focus();
  }, []);
  return (
    <main className="home" aria-labelledby={titleId}>
      <h1 id={titleId}>{homeCopy.failure.title}</h1>
      <div role="alert" tabIndex={-1} ref={alertRef} className="home-failure">
        <p>{message}</p>
      </div>
      <CheckList results={results} />
      {children}
    </main>
  );
}

/** A failure that running the checks again can fix. Needs the shared interface runtime for its Retry control. */
export function StartupFailure({ report }: { readonly report: StartupRetryable }) {
  const { registry } = useUi();
  return (
    <FailureScreen results={report.results} message={homeCopy.failure.summary(report.failures.map((failure) => homeCopy.checks[failure.id].label))}>
      <div className="home-actions">
        <Button control={registry.requireControl(SPLASH.retry)} />
      </div>
    </FailureScreen>
  );
}

/** The screen definitions are bundled with the program, so a failure there cannot be fixed by trying again and offers no control. */
export function InstallDamaged({ report }: { readonly report: StartupDamaged }) {
  return <FailureScreen results={report.results} message={homeCopy.failure.damaged} />;
}
