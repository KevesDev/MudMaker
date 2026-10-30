import { useSyncExternalStore } from "react";
import type { ClientProfileBook } from "../prefs";
import { clientProfiles } from "./clientProfiles";
import { ConnectedSession } from "./ConnectedSession";
import { clientSessions, type ClientSessions } from "./ClientSessions";
import { WorldLibrary } from "./WorldLibrary";

/** The Play workspace: the World Library while no game is open, and the open game otherwise. */
export function PlayWorkspace({ sessions = clientSessions, profiles = clientProfiles }: { readonly sessions?: ClientSessions; readonly profiles?: ClientProfileBook }) {
  const { sessions: all, activeId } = useSyncExternalStore(sessions.subscribe, sessions.getSnapshot);
  const active = all.find((session) => session.id === activeId);
  return <div className="play-workspace">{active === undefined ? <WorldLibrary profiles={profiles} /> : <ConnectedSession sessions={sessions} all={all} active={active} />}</div>;
}
