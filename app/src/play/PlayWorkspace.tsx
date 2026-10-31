import { useSyncExternalStore } from "react";
import { clientDisplay, type ClientDisplay, type ClientProfileBook } from "../prefs";
import { SILENT, useIntentRouter } from "../workspaces/useIntentRouter";
import { clientProfiles } from "./clientProfiles";
import { ConnectedSession } from "./ConnectedSession";
import { clientSessions, type ClientSessions } from "./ClientSessions";
import { playCopy } from "./playCopy";
import { CLIENT_OWNER, TIMESTAMPS } from "./playLayout";
import { WorldLibrary } from "./WorldLibrary";

export interface PlayWorkspaceProps {
  readonly sessions?: ClientSessions;
  readonly profiles?: ClientProfileBook;
  readonly display?: ClientDisplay;
}

/** The Play workspace: the World Library while no game is open, and the open game otherwise. */
export function PlayWorkspace({ sessions = clientSessions, profiles = clientProfiles, display = clientDisplay }: PlayWorkspaceProps) {
  const { sessions: all, activeId } = useSyncExternalStore(sessions.subscribe, sessions.getSnapshot);
  const { timestamps } = useSyncExternalStore(display.subscribe, display.getSnapshot);
  useIntentRouter(CLIENT_OWNER, {
    [TIMESTAMPS]: ({ value }) => {
      if (typeof value !== "boolean") return Promise.resolve({ status: "validation-error", code: "toggle-invalid", message: playCopy.invalidToggle });
      display.setTimestamps(value);
      return Promise.resolve(SILENT);
    },
  });
  const active = all.find((session) => session.id === activeId);
  return <div className="play-workspace">{active === undefined ? <WorldLibrary profiles={profiles} /> : <ConnectedSession sessions={sessions} all={all} active={active} timestamps={timestamps} />}</div>;
}
