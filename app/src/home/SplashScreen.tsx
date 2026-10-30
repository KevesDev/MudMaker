import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AppInfo } from "../appInfo";
import { useTheme, type ThemeManager } from "../theme";
import { Button, Menu, Toast, useUi, type ControlDescriptor, type ControlId } from "../ui";
import { ControlNotice } from "./ControlNotice";
import { homeCopy } from "./homeCopy";
import { APPEARANCE, NOTICE_CONTROLS, SPLASH, WORKSPACE_ENTRIES } from "./homeLayout";
import { Shown } from "./Shown";

interface SplashScreenProps {
  readonly info: AppInfo;
  readonly theme: ThemeManager;
  /** True after a retry: focus goes to the heading so the keyboard is not left on a control that is gone. */
  readonly focusHeading: boolean;
}

/** The launch screen: the three workspace entries, Settings and Quit. */
export function SplashScreen({ info, theme, focusHeading }: SplashScreenProps) {
  const { registry, bus } = useUi();
  const control = (id: ControlId): ControlDescriptor => registry.requireControl(id);
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [notices] = useState(() => new ControlNotice(bus, NOTICE_CONTROLS));
  const notice = useSyncExternalStore(notices.subscribe, notices.getSnapshot);
  const presetId = useTheme("home", theme).themeId;
  const name = control(SPLASH.name);
  const version = control(SPLASH.version);
  const settings = control(SPLASH.settings);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  /** The control that raised the message may be inside a closed menu, so focus falls back to the Settings opener. */
  const dismissNotice = (): void => {
    if (notice !== null) {
      const root = rootRef.current;
      (root?.querySelector<HTMLElement>(`[data-control-id="${notice.controlId}"]`) ?? root?.querySelector<HTMLElement>(`[data-testid="${settings.testId}"]`))?.focus();
    }
    notices.dismiss();
  };

  return (
    <div className="home" ref={rootRef}>
      <header className="home-header">
        <h1 data-testid={name.testId} tabIndex={-1} ref={headingRef}>
          {info.name}
        </h1>
        <p className="home-version" data-testid={version.testId}>
          {homeCopy.versionLine(version.label, info.version, info.buildId)}
        </p>
      </header>
      <main className="home-main">
        <nav className="home-actions" aria-label={homeCopy.startNavigation}>
          {WORKSPACE_ENTRIES.map((id) => (
            <Shown key={id} control={control(id)} phase="ready">
              <Button control={control(id)} showState={false} />
            </Shown>
          ))}
        </nav>
        {notice === null ? null : (
          <Toast
            described={{ passive: true, id: "home.notice", label: control(notice.controlId).label, help: notice.message }}
            tone="information"
            {...(notice.code === null ? {} : { code: notice.code })}
            live={false}
            showTitle={false}
            onDismiss={dismissNotice}
          />
        )}
      </main>
      <footer className="home-actions">
        <Shown control={settings} phase="ready">
          <Menu
            opener={settings}
            items={[]}
            choices={{ control: control(APPEARANCE), options: theme.listPresets().map((preset) => ({ value: preset.id, label: preset.label })), value: presetId }}
          />
        </Shown>
        <Shown control={control(SPLASH.quit)} phase="ready">
          <Button control={control(SPLASH.quit)} />
        </Shown>
      </footer>
    </div>
  );
}
