import { useEffect, useRef, type ReactNode } from "react";
import { Button, useUi, type ControlDescriptor } from "../ui";
import { homeCopy } from "./homeCopy";
import { SPLASH } from "./homeLayout";
import { Shown } from "./Shown";
import type { StartupRetryable } from "./startupChecks";

interface FailureScreenProps {
  readonly message: string;
  /** The catalog status the message stands for, when the catalogs loaded and can name it. */
  readonly status?: ControlDescriptor;
  readonly children?: ReactNode;
}

/** One line that names the problem. Focus moves to it when it appears, so a keyboard or screen reader user lands on what went wrong. */
function FailureScreen({ message, status, children }: FailureScreenProps) {
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alertRef.current?.focus();
  }, []);
  return (
    <main className="home" aria-label={homeCopy.productName}>
      <div role="alert" tabIndex={-1} ref={alertRef} className="home-failure" {...(status === undefined ? {} : { "data-testid": status.testId })}>
        <p>{message}</p>
      </div>
      {children}
    </main>
  );
}

/** A failure that running the checks again can fix. Needs the shared interface runtime for its Retry control. */
export function StartupFailure({ report }: { readonly report: StartupRetryable }) {
  const { registry } = useUi();
  const retry = registry.requireControl(SPLASH.retry);
  return (
    <FailureScreen
      message={homeCopy.failure.summary(report.failures.map((failure) => homeCopy.checkNames[failure.id]))}
      status={registry.requireControl(SPLASH.startupStatus)}
    >
      <div className="home-actions">
        <Shown control={retry} phase="failed">
          <Button control={retry} />
        </Shown>
      </div>
    </FailureScreen>
  );
}

/** The screen definitions are bundled with the program, so a failure there cannot be fixed by trying again and offers no control. */
export function InstallDamaged() {
  return <FailureScreen message={homeCopy.failure.damaged} />;
}
