import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AppInfo } from "../appInfo";
import { useTheme, type ThemeManager } from "../theme";
import { Button, Menu, Toast, useUi, type ControlDescriptor, type ControlId } from "../ui";
import { ControlNotice } from "./ControlNotice";
import { homeCopy } from "./homeCopy";
import { APPEARANCE, NOTICE_CONTROLS, SPLASH, SPLASH_GLYPHS, WORKSPACE_ACTIONS } from "./homeLayout";
import { Brand } from "./Brand";
import { Ornament } from "./Ornament";
import { Shown } from "./Shown";
import { useNarrowFlag } from "./useNarrowFlag";
import { WordmarkBlock } from "./WordmarkBlock";

interface SplashScreenProps {
  readonly info: AppInfo;
  readonly theme: ThemeManager;
  /** True after a retry: focus goes to the heading so the keyboard is not left on a control that is gone. */
  readonly focusHeading: boolean;
}

/** The launch screen: the wordmark, the three workspace entries, Settings and Quit. */
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
  const actionRow = useNarrowFlag(theme);

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
      <div className="home-above" aria-hidden="true" />
      <header className="home-header">
        <WordmarkBlock
          name={info.name}
          theme={theme}
          stageRef={rootRef}
          heading={{ testId: name.testId, ref: headingRef }}
          version={{
            testId: version.testId,
            lines: [homeCopy.versionLine(version.label, info.version), homeCopy.buildLine(info.buildId)],
            compact: homeCopy.versionCompact(version.label, info.version, info.buildId),
          }}
        />
      </header>
      <div className="home-below">
        <Brand />
        <main className="home-main">
          <nav className="home-actions" aria-label={homeCopy.startNavigation} ref={actionRow.ref} data-narrow={actionRow.narrow}>
            {WORKSPACE_ACTIONS.map(({ id, accent }) => (
              <Shown key={id} control={control(id)} phase="ready">
                <div className="home-action" data-accent={accent}>
                  <Button control={control(id)} showState={false} trailingGlyph={SPLASH_GLYPHS.chevron} />
                </div>
              </Shown>
            ))}
          </nav>
          {notice === null ? null : (
            <Toast
              id="home.notice"
              title={control(notice.controlId).label}
              message={notice.message}
              tone="information"
              {...(notice.code === null ? {} : { code: notice.code })}
              live={false}
              showTitle={false}
              onDismiss={dismissNotice}
            />
          )}
        </main>
        <footer className="home-footer">
          <Ornament width="narrow" />
          <div className="home-footer-actions">
            <Shown control={settings} phase="ready">
              <Menu
                opener={settings}
                items={[]}
                choices={{ control: control(APPEARANCE), options: theme.listPresets().map((preset) => ({ value: preset.id, label: preset.label })), value: presetId }}
              />
            </Shown>
            <span className="home-footer-rule" aria-hidden="true" />
            <Shown control={control(SPLASH.quit)} phase="ready">
              <Button control={control(SPLASH.quit)} />
            </Shown>
          </div>
        </footer>
      </div>
    </div>
  );
}
