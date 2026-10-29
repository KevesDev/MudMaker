import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AppInfo } from "../appInfo";
import { useTheme, type ThemeManager } from "../theme";
import { Button, Dropdown, StatusIndicator, Toast, uiCopy, useUi, type ControlDescriptor, type ControlId } from "../ui";
import { CheckList } from "./CheckList";
import { homeCopy } from "./homeCopy";
import { SPLASH, WORKSPACE_ENTRIES } from "./homeLayout";
import type { CheckResult } from "./startupChecks";
import { UnavailableNotice } from "./UnavailableNotice";

/** Help for display-only text sits beside it, so it describes the text without becoming part of its name. */
function Help({ id, control }: { readonly id: string; readonly control: ControlDescriptor }) {
  return (
    <span id={id} className="ui-visually-hidden">
      {control.tooltip}
    </span>
  );
}

function Section({ control, title, children }: { readonly control?: ControlDescriptor; readonly title: string; readonly children: ReactNode }) {
  const titleId = useId();
  const helpId = useId();
  return (
    <section
      className="home-section"
      aria-labelledby={titleId}
      {...(control ? { "data-testid": control.testId, "aria-describedby": helpId } : {})}
    >
      <h2 id={titleId}>{title}</h2>
      {control ? <Help id={helpId} control={control} /> : null}
      {children}
    </section>
  );
}

interface SplashScreenProps {
  readonly info: AppInfo;
  readonly results: readonly CheckResult[];
  readonly theme: ThemeManager;
  /** True after a retry: focus goes to the heading so the keyboard is not left on a control that is gone. */
  readonly focusHeading: boolean;
}

/** The first screen: honest startup status, the three workspace entries and the appearance choice. */
export function SplashScreen({ info, results, theme, focusHeading }: SplashScreenProps) {
  const { registry, bus } = useUi();
  const control = (id: ControlId): ControlDescriptor => registry.requireControl(id);
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [unavailable] = useState(() => new UnavailableNotice(bus, WORKSPACE_ENTRIES));
  const notice = useSyncExternalStore(unavailable.subscribe, unavailable.getSnapshot);
  const presetId = useTheme("home", theme).themeId;
  const nameHelpId = useId();
  const versionHelpId = useId();
  const name = control(SPLASH.name);
  const version = control(SPLASH.version);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  const dismissNotice = (): void => {
    if (notice !== null) {
      rootRef.current?.querySelector<HTMLElement>(`[data-control-id="${notice.controlId}"]`)?.focus();
    }
    unavailable.dismiss();
  };

  return (
    <div className="home" ref={rootRef}>
      <header className="home-header">
        <h1 data-testid={name.testId} aria-describedby={nameHelpId} tabIndex={-1} ref={headingRef}>
          {info.name}
        </h1>
        <Help id={nameHelpId} control={name} />
        <p className="home-version" data-testid={version.testId} aria-describedby={versionHelpId}>
          {homeCopy.versionLine(version.label, info.version, info.buildId)}
        </p>
        <Help id={versionHelpId} control={version} />
      </header>
      <main className="home-main">
        <nav className="home-actions" aria-label={homeCopy.sections.start}>
          {WORKSPACE_ENTRIES.map((id) => (
            <Button key={id} control={control(id)} showState={false} />
          ))}
        </nav>
        {notice === null ? null : (
          <Toast
            described={{ passive: true, id: "home.notice", label: control(notice.controlId).label, help: notice.message }}
            tone="information"
            live={false}
            onDismiss={dismissNotice}
          />
        )}
        <Section title={homeCopy.sections.recent}>
          <div className="home-actions">
            <Button control={control(SPLASH.recentProjects)} />
            <Button control={control(SPLASH.recentWorlds)} />
          </div>
        </Section>
        <Section title={homeCopy.sections.appearance}>
          <Dropdown
            control={control(SPLASH.appearance)}
            options={theme.listPresets().map((preset) => ({ value: preset.id, label: preset.label }))}
            value={presetId}
          />
          <p className="home-note">{homeCopy.appearanceNotSaved}</p>
        </Section>
        <Section control={control(SPLASH.loadingStatus)} title={control(SPLASH.loadingStatus).label}>
          <CheckList results={results}>
            {[SPLASH.backgroundHosting, SPLASH.connectedWorlds].map((id) => (
              <li key={id} data-testid={control(id).testId}>
                <StatusIndicator described={control(id)} tone="information" text={uiCopy.notInThisBuildState} />
              </li>
            ))}
          </CheckList>
        </Section>
      </main>
      <footer className="home-actions">
        <Button control={control(SPLASH.quit)} />
      </footer>
    </div>
  );
}
