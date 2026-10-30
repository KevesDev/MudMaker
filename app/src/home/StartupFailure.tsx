import { useEffect, useRef, type ReactNode } from "react";
import type { ThemeManager } from "../theme";
import { Button, useUi, type ControlDescriptor } from "../ui";
import { Brand } from "./Brand";
import { homeCopy } from "./homeCopy";
import { SPLASH } from "./homeLayout";
import { Shown } from "./Shown";
import type { StartupRetryable } from "./startupChecks";
import { WordmarkBlock } from "./WordmarkBlock";

interface FailureScreenProps {
  readonly theme: ThemeManager;
  readonly message: string;
  /** The catalog status the message stands for, when the catalogs loaded and can name it. */
  readonly status?: ControlDescriptor;
  readonly children?: ReactNode;
}

/**
 * The launch composition with its action row replaced by one line that names the problem. Focus moves to the line
 * when it appears, so a keyboard or screen reader user lands on what went wrong.
 */
function FailureScreen({ theme, message, status, children }: FailureScreenProps) {
  const stageRef = useRef<HTMLElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alertRef.current?.focus();
  }, []);
  return (
    <main className="home" aria-label={homeCopy.productName} ref={stageRef}>
      <div className="home-above" aria-hidden="true" />
      <div className="home-header">
        <WordmarkBlock name={homeCopy.productName} theme={theme} stageRef={stageRef} />
      </div>
      <div className="home-below">
        <Brand />
        <div role="alert" tabIndex={-1} ref={alertRef} className="home-failure" {...(status === undefined ? {} : { "data-testid": status.testId })}>
          <p>{message}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

/** A failure that running the checks again can fix. Needs the shared interface runtime for its Retry control. */
export function StartupFailure({ report, theme }: { readonly report: StartupRetryable; readonly theme: ThemeManager }) {
  const { registry } = useUi();
  const retry = registry.requireControl(SPLASH.retry);
  return (
    <FailureScreen
      theme={theme}
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
export function InstallDamaged({ theme }: { readonly theme: ThemeManager }) {
  return <FailureScreen theme={theme} message={homeCopy.failure.damaged} />;
}
