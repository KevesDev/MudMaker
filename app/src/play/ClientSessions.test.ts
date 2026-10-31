import { describe, expect, it, vi } from "vitest";
import { ClientSessions } from "./ClientSessions";

const ids = (sessions: ClientSessions): string[] => sessions.getSnapshot().sessions.map((session) => session.id);

describe("the open game sessions", () => {
  it("shows the newest session, falls back to the one before it on close, and to none when the last closes", () => {
    const sessions = new ClientSessions();
    const heard = vi.fn();
    sessions.subscribe(heard);
    sessions.open({ id: "a", worldName: "Ashenvale", connected: true });
    sessions.open({ id: "b", worldName: "Brackwater", connected: true });
    expect(sessions.getSnapshot().activeId).toBe("b");
    sessions.close("b");
    expect(sessions.getSnapshot().activeId).toBe("a");
    sessions.close("a");
    expect(sessions.getSnapshot()).toEqual({ sessions: [], activeId: null });
    expect(heard).toHaveBeenCalledTimes(4);
  });

  it("reorders sessions, ignores an unknown id, and keeps the showing session", () => {
    const sessions = new ClientSessions();
    for (const id of ["a", "b", "c"]) sessions.open({ id, worldName: id, connected: true });
    sessions.move("c", 0);
    expect(ids(sessions)).toEqual(["c", "a", "b"]);
    sessions.select("a");
    sessions.select("missing");
    sessions.move("missing", 1);
    sessions.close("missing");
    expect(ids(sessions)).toEqual(["c", "a", "b"]);
    expect(sessions.getSnapshot().activeId).toBe("a");
  });
});
