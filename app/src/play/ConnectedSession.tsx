import { useId, useState } from "react";
import { TabStrip } from "../editor/TabStrip";
import { ControlTab, ControlTabList, PassiveText } from "../workspaces/controlParts";
import { SILENT, useIntentRouter } from "../workspaces/useIntentRouter";
import { Button, REGION, Switch, TextField, Toolbar, useUi, type ActionHandler, type PassiveDescriptor } from "../ui";
import type { ClientSession, ClientSessions } from "./ClientSessions";
import { CLIENT_OWNER, COMPOSER, GAME, PANEL_CLOSE, PANEL_TABS, PANEL_UNAVAILABLE, TRANSCRIPT } from "./playLayout";
import { playCopy } from "./playCopy";

const GAME_BAR: PassiveDescriptor = { passive: true, id: "play.gameActions", label: playCopy.gameActions, help: "" };
const TRANSCRIPT_BAR: PassiveDescriptor = { passive: true, id: "play.transcriptOptions", label: playCopy.transcriptOptions, help: "" };
const SESSION_TABS: PassiveDescriptor = { passive: true, id: "play.sessions", label: playCopy.sessionsName, help: "" };

type PanelTab = (typeof PANEL_TABS)[number];
type Toggle = "timestamps" | "wrap" | "pause";

export interface ConnectedSessionProps {
  readonly sessions: ClientSessions;
  readonly all: readonly ClientSession[];
  readonly active: ClientSession;
}

/** An open game: the transcript with its options, the composer, and one secondary drawer that the toolbar opens. */
export function ConnectedSession({ sessions, all, active }: ConnectedSessionProps) {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const panelId = useId();
  const [find, setFind] = useState("");
  const [message, setMessage] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panel, setPanel] = useState<PanelTab>(PANEL_TABS[0]);
  const [toggles, setToggles] = useState<Readonly<Record<Toggle, boolean>>>({ timestamps: false, wrap: true, pause: false });

  const toggle = (name: Toggle): ActionHandler => ({ value }) => {
    if (typeof value !== "boolean") return Promise.resolve({ status: "validation-error", code: "toggle-invalid", message: playCopy.invalidToggle });
    setToggles((current) => ({ ...current, [name]: value }));
    return Promise.resolve(SILENT);
  };
  const showPanel = (id: PanelTab): ActionHandler => () => {
    setPanel(id);
    return Promise.resolve(SILENT);
  };
  useIntentRouter(CLIENT_OWNER, {
    [GAME.disconnect]: () => {
      sessions.close(active.id);
      return Promise.resolve(SILENT);
    },
    [GAME.panels]: () => {
      setDrawerOpen((open) => !open);
      return Promise.resolve(SILENT);
    },
    [PANEL_CLOSE]: () => {
      setDrawerOpen(false);
      return Promise.resolve(SILENT);
    },
    [TRANSCRIPT.timestamps]: toggle("timestamps"),
    [TRANSCRIPT.wrap]: toggle("wrap"),
    [TRANSCRIPT.pause]: toggle("pause"),
    ...Object.fromEntries(PANEL_TABS.map((id) => [id, showPanel(id)])),
  });

  const tabs = all.map((session) => ({ id: session.id, title: session.worldName, dirty: false }));
  const tabbed = tabs.length > 1;
  return (
    <div className="play-session">
      <div className="workspace-bar">
        <PassiveText control={control(GAME.title)}>{active.worldName}</PassiveText>
        <PassiveText control={control(GAME.status)}>{playCopy.connected}</PassiveText>
        <Toolbar described={GAME_BAR}>
          <Button control={control(GAME.disconnect)} />
          <Button control={control(GAME.panels)} />
          <Button control={control(GAME.help)} />
        </Toolbar>
      </div>
      {tabbed ? (
        <TabStrip
          described={SESSION_TABS}
          tabs={tabs}
          activeId={active.id}
          panelId={panelId}
          onSelect={(id) => sessions.select(id)}
          onClose={(id) => sessions.close(id)}
          onMove={(id, index) => sessions.move(id, index)}
        />
      ) : null}
      <div className="play-body">
        <div className="play-main" {...(tabbed ? { role: "tabpanel", id: panelId } : {})}>
          <div className="workspace-bar">
            <Toolbar described={TRANSCRIPT_BAR}>
              <TextField control={control(TRANSCRIPT.find)} value={find} onValueChange={setFind} type="search" />
              <Button control={control(TRANSCRIPT.copy)} />
              <Switch control={control(TRANSCRIPT.timestamps)} checked={toggles.timestamps} />
              <Switch control={control(TRANSCRIPT.wrap)} checked={toggles.wrap} />
              <Switch control={control(TRANSCRIPT.pause)} checked={toggles.pause} />
              <Button control={control(TRANSCRIPT.latest)} />
            </Toolbar>
          </div>
          <div
            role="log"
            tabIndex={0}
            aria-label={control(TRANSCRIPT.view).label}
            data-testid={control(TRANSCRIPT.view).testId}
            data-region={REGION.canvas}
            data-wrap={toggles.wrap ? "true" : "false"}
            className="play-transcript"
          />
          <div className="workspace-bar play-composer" role="group" aria-label={playCopy.composer}>
            <TextField control={control(COMPOSER.message)} value={message} onValueChange={setMessage} />
            <Button control={control(COMPOSER.send)} />
          </div>
        </div>
        {drawerOpen ? (
          <aside aria-label={playCopy.sidePanel} data-region={REGION.assets} className="play-drawer">
            <ControlTabList label={playCopy.sidePanel}>
              {PANEL_TABS.map((id) => (
                <ControlTab key={id} control={control(id)} selected={id === panel} />
              ))}
            </ControlTabList>
            <PassiveText control={control(PANEL_UNAVAILABLE)}>{control(PANEL_UNAVAILABLE).label}</PassiveText>
            <Button control={control(PANEL_CLOSE)} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
