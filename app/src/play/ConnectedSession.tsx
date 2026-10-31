import { useId, useState } from "react";
import { TabStrip } from "../editor/TabStrip";
import { MENU_CARET } from "../nav/destinations";
import { PassiveText } from "../workspaces/controlParts";
import { ToolbarSlot } from "../workspaces/ToolbarSlot";
import { SILENT, useIntentRouter, useMenuOpeners } from "../workspaces/useIntentRouter";
import { Button, Menu, REGION, TextField, Toolbar, useUi, type ActionHandler, type PassiveDescriptor } from "../ui";
import type { ClientSession, ClientSessions } from "./ClientSessions";
import { CLIENT_OWNER, COMPOSER, GAME, PANEL_CLOSE, PANEL_TABS, TRANSCRIPT } from "./playLayout";
import { playCopy } from "./playCopy";

const GAME_BAR: PassiveDescriptor = { passive: true, id: "play.gameActions", label: playCopy.gameActions, help: "" };
const SESSION_TABS: PassiveDescriptor = { passive: true, id: "play.sessions", label: playCopy.sessionsName, help: "" };

type PanelTab = (typeof PANEL_TABS)[number];

export interface ConnectedSessionProps {
  readonly sessions: ClientSessions;
  readonly all: readonly ClientSession[];
  readonly active: ClientSession;
  readonly timestamps: boolean;
}

/** An open game: the transcript, the composer, and one secondary drawer that the View menu in the frame row chooses. */
export function ConnectedSession({ sessions, all, active, timestamps }: ConnectedSessionProps) {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const panelId = useId();
  const [find, setFind] = useState("");
  const [message, setMessage] = useState("");
  const [panel, setPanel] = useState<PanelTab | null>(null);

  const showPanel = (id: PanelTab): ActionHandler => () => {
    setPanel(id);
    return Promise.resolve(SILENT);
  };
  useMenuOpeners(CLIENT_OWNER, [GAME.view]);
  useIntentRouter(CLIENT_OWNER, {
    [GAME.disconnect]: () => {
      sessions.close(active.id);
      return Promise.resolve(SILENT);
    },
    [PANEL_CLOSE]: () => {
      setPanel(null);
      return Promise.resolve(SILENT);
    },
    ...Object.fromEntries(PANEL_TABS.map((id) => [id, showPanel(id)])),
  });

  const tabs = all.map((session) => ({ id: session.id, title: session.worldName, dirty: false }));
  const tabbed = tabs.length > 1;
  return (
    <div className="play-session">
      <ToolbarSlot>
        <PassiveText control={control(GAME.title)}>{active.worldName}</PassiveText>
        {active.connected ? <PassiveText control={control(GAME.status)}>{playCopy.connected}</PassiveText> : null}
        <Toolbar described={GAME_BAR}>
          <Button control={control(GAME.disconnect)} />
          <TextField control={control(TRANSCRIPT.find)} value={find} onValueChange={setFind} type="search" />
          <Menu opener={control(GAME.view)} items={PANEL_TABS.map(control)} {...(panel === null ? {} : { currentId: panel })} trailingGlyph={MENU_CARET} />
        </Toolbar>
      </ToolbarSlot>
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
          <div
            role="log"
            tabIndex={0}
            aria-label={control(TRANSCRIPT.view).label}
            data-testid={control(TRANSCRIPT.view).testId}
            data-region={REGION.canvas}
            data-timestamps={timestamps ? "true" : "false"}
            className="play-transcript"
          />
          <div className="workspace-bar play-composer" role="group" aria-label={playCopy.composer}>
            <TextField control={control(COMPOSER.message)} value={message} onValueChange={setMessage} />
            <Button control={control(COMPOSER.send)} />
          </div>
        </div>
        {panel === null ? null : (
          <aside aria-label={control(panel).label} data-region={REGION.assets} className="play-drawer">
            <h2 className="play-drawer-title">{control(panel).label}</h2>
            <Button control={control(PANEL_CLOSE)} />
          </aside>
        )}
      </div>
    </div>
  );
}
