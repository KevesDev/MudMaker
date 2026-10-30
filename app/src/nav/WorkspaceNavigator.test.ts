/** Fake services stand in for the editor, client and host services that later phases provide. */
import { describe, expect, it, vi } from "vitest";
import type { UiDiagnostic } from "../ui";
import type { Destination } from "./destinations";
import { STALE_IMPACT, type ClientSessionController, type EditorSessionController, type HostLeaveImpact, type HostSupervisorSession, type LeaveImpact, type ServiceOutcome } from "./leaveImpact";
import { navCopy } from "./navCopy";
import { WorkspaceNavigator, type NavigationOutcome } from "./WorkspaceNavigator";

const live = (): AbortSignal => new AbortController().signal;
const confirmed = (revision: number): Promise<ServiceOutcome> => Promise.resolve({ ok: true, revision });
const refused = (code: string, message: string): Promise<ServiceOutcome> => Promise.resolve({ ok: false, code, message });

/** A service whose state can be changed by the test between the question and the answer. */
class FakeEditor implements EditorSessionController {
  revision = 1;
  /** Leaving anywhere else costs the editor nothing, as the real service decides. */
  affectedFrom: Destination = "create";
  dirty: readonly string[] = ["Ashenvale"];
  saveResult: () => Promise<ServiceOutcome> = () => confirmed(this.revision + 1);
  describeLeaveImpact = vi.fn((request: { from: Destination }): Promise<LeaveImpact | null> =>
    Promise.resolve(this.dirty.length === 0 || request.from !== this.affectedFrom ? null : { revision: this.revision, resources: this.dirty }),
  );
  retainDraft = vi.fn((revision: number): Promise<ServiceOutcome> => (revision === this.revision ? confirmed(this.revision) : refused(STALE_IMPACT, "stale")));
  save = vi.fn((revision: number): Promise<ServiceOutcome> => {
    if (revision !== this.revision) return refused(STALE_IMPACT, "stale");
    const result = this.saveResult();
    return result.then((outcome) => {
      if (outcome.ok) {
        this.revision = outcome.revision;
        this.dirty = [];
      }
      return outcome;
    });
  });
}

class FakeClient implements ClientSessionController {
  revision = 1;
  affectedFrom: Destination = "play";
  worlds: readonly string[] = ["Ashenvale", "Northwatch"];
  describeLeaveImpact = vi.fn((request: { from: Destination }): Promise<LeaveImpact | null> =>
    Promise.resolve(this.worlds.length === 0 || request.from !== this.affectedFrom ? null : { revision: this.revision, resources: this.worlds }),
  );
  disconnectAll = vi.fn((revision: number): Promise<ServiceOutcome> => {
    if (revision !== this.revision) return refused(STALE_IMPACT, "stale");
    this.worlds = [];
    return confirmed(++this.revision);
  });
}

class FakeHost implements HostSupervisorSession {
  revision = 1;
  players = 2;
  running = true;
  describeLeaveImpact = vi.fn((request: { from: Destination }): Promise<HostLeaveImpact | null> =>
    Promise.resolve(this.running && request.from === "host" ? { revision: this.revision, resources: ["Ashenvale"], connectedPlayers: this.players } : null),
  );
  continueHosting = vi.fn((revision: number): Promise<ServiceOutcome> => (revision === this.revision ? confirmed(this.revision) : refused(STALE_IMPACT, "stale")));
  requestStop = vi.fn((revision: number): Promise<ServiceOutcome> => {
    if (revision !== this.revision) return refused(STALE_IMPACT, "stale");
    this.running = false;
    return confirmed(++this.revision);
  });
}

function setup(services: ConstructorParameters<typeof WorkspaceNavigator>[0] = {}) {
  const records: UiDiagnostic[] = [];
  const navigator = new WorkspaceNavigator(services, (record) => records.push(record), () => ({ launchId: "test" }));
  const destination = () => navigator.getSnapshot().destination;
  const go = async (to: Parameters<WorkspaceNavigator["request"]>[0]): Promise<NavigationOutcome> => navigator.request(to, live());
  return { navigator, records, destination, go };
}

const failure = (outcome: NavigationOutcome): { code: string; message: string } => {
  if (outcome.ok) throw new Error("Expected a refusal.");
  return { code: outcome.code, message: outcome.message };
};

describe("switching with nothing to protect", () => {
  it("switches at once, remembers each opened workspace in catalog order, and does nothing for the current destination", async () => {
    const { navigator, go, destination } = setup();
    expect(await go("host")).toEqual({ ok: true });
    expect(await go("create")).toEqual({ ok: true });
    expect(destination()).toBe("create");
    expect(navigator.getSnapshot().opened).toEqual(["create", "host"]);
    expect(await go("splash")).toEqual({ ok: true });
    expect(navigator.getSnapshot().opened).toEqual(["create", "host"]);
    const listener = vi.fn();
    navigator.subscribe(listener);
    expect(await go("splash")).toEqual({ ok: true });
    expect(listener).not.toHaveBeenCalled();
  });

  it("switches when every service reports no impact", async () => {
    const editor = new FakeEditor();
    editor.dirty = [];
    const { go, destination } = setup({ editor });
    await go("create");
    expect(await go("play")).toEqual({ ok: true });
    expect(destination()).toBe("play");
    expect(editor.describeLeaveImpact).toHaveBeenCalledWith({ from: "create", to: "play" });
  });

  it("refuses a second request while the first is still asking the services", async () => {
    const editor = new FakeEditor();
    let release: (value: LeaveImpact | null) => void = () => undefined;
    editor.describeLeaveImpact.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    const { go, destination } = setup({ editor });
    const first = go("create");
    expect(failure(await go("play")).code).toBe("navigation-busy");
    release(null);
    await first;
    expect(destination()).toBe("create");
  });
});

describe("Create with unsaved work", () => {
  async function guarded() {
    const editor = new FakeEditor();
    const setupResult = setup({ editor });
    await setupResult.go("create");
    expect(await setupResult.go("play")).toEqual({ ok: true });
    return { ...setupResult, editor };
  }

  it("holds the switch and lists what is unsaved", async () => {
    const { navigator, destination } = await guarded();
    expect(destination()).toBe("create");
    expect(navigator.getSnapshot().transition?.impacts).toEqual([
      { kind: "editor", revision: 1, resources: ["Ashenvale"], connectedPlayers: 0, stage: "deciding", resolvedRevision: null },
    ]);
  });

  it("keeps the draft and switches, asking the service with the revision it was shown", async () => {
    const { navigator, editor, destination } = await guarded();
    expect(await navigator.choose("editor-keep", live())).toEqual({ ok: true });
    expect(editor.retainDraft).toHaveBeenCalledWith(1);
    expect(destination()).toBe("play");
    expect(navigator.getSnapshot().transition).toBeNull();
  });

  it("switches after the save is confirmed and not before", async () => {
    const { navigator, editor, destination } = await guarded();
    let finish: (outcome: ServiceOutcome) => void = () => undefined;
    editor.saveResult = () => new Promise((resolve) => (finish = resolve));
    const saving = navigator.choose("editor-save", live());
    await Promise.resolve();
    expect(destination()).toBe("create");
    finish({ ok: true, revision: 2 });
    expect(await saving).toEqual({ ok: true });
    expect(destination()).toBe("play");
  });

  it("stays, reports the service's error and logs it when the save fails, then switches on a retry", async () => {
    const { navigator, editor, destination, records } = await guarded();
    editor.saveResult = () => refused("project-save-failed", "The project could not be saved.");
    expect(failure(await navigator.choose("editor-save", live()))).toEqual({ code: "project-save-failed", message: "The project could not be saved." });
    expect(destination()).toBe("create");
    expect(navigator.getSnapshot().transition?.impacts[0]?.stage).toBe("deciding");
    expect(records).toEqual([expect.objectContaining({ severity: "warning", code: "project-save-failed", correlation: { launchId: "test" } })]);
    editor.saveResult = () => confirmed(2);
    expect(await navigator.choose("editor-save", live())).toEqual({ ok: true });
    expect(destination()).toBe("play");
  });

  it("leaves everything untouched on Cancel", async () => {
    const { navigator, editor, destination } = await guarded();
    expect(navigator.cancel()).toEqual({ ok: true });
    expect(destination()).toBe("create");
    expect(navigator.getSnapshot().transition).toBeNull();
    expect(editor.save).not.toHaveBeenCalled();
    expect(editor.retainDraft).not.toHaveBeenCalled();
  });

  it("asks again and shows the new state when the draft changed after the question, and does not switch", async () => {
    const { navigator, editor, destination } = await guarded();
    editor.revision = 2;
    editor.dirty = ["Ashenvale", "Northwatch"];
    expect(failure(await navigator.choose("editor-save", live())).code).toBe(STALE_IMPACT);
    expect(editor.save).toHaveBeenCalledWith(1);
    expect(destination()).toBe("create");
    expect(navigator.getSnapshot().transition?.impacts[0]).toMatchObject({ revision: 2, resources: ["Ashenvale", "Northwatch"], stage: "deciding" });
    expect(await navigator.choose("editor-save", live())).toEqual({ ok: true });
    expect(editor.save).toHaveBeenLastCalledWith(2);
    expect(destination()).toBe("play");
  });

  it("does not switch when the service reports something other than what it confirmed just before the switch", async () => {
    const { navigator, editor, destination } = await guarded();
    editor.describeLeaveImpact.mockImplementationOnce(() => Promise.resolve({ revision: 1, resources: ["Ashenvale"] })).mockImplementationOnce(() =>
      Promise.resolve({ revision: 9, resources: ["Edited meanwhile"] }),
    );
    await navigator.cancel();
    await navigator.request("play", live());
    expect(failure(await navigator.choose("editor-save", live())).code).toBe(STALE_IMPACT);
    expect(destination()).toBe("create");
    expect(navigator.getSnapshot().transition?.impacts[0]).toMatchObject({ revision: 9, stage: "deciding" });
  });

  it("does not switch when the person cancels while a save is still running", async () => {
    const { navigator, editor, destination } = await guarded();
    let finish: (outcome: ServiceOutcome) => void = () => undefined;
    editor.saveResult = () => new Promise((resolve) => (finish = resolve));
    const saving = navigator.choose("editor-save", live());
    await Promise.resolve();
    navigator.cancel();
    finish({ ok: true, revision: 2 });
    expect(failure(await saving).code).toBe("navigation-cancelled");
    expect(destination()).toBe("create");
  });
});

describe("Play with connections", () => {
  it("disconnects every game, then switches; a failed disconnect blocks the switch and can be retried; Cancel keeps the connections", async () => {
    const client = new FakeClient();
    const { navigator, go, destination } = setup({ client });
    await go("play");
    await go("host");
    expect(navigator.getSnapshot().transition?.impacts[0]).toMatchObject({ kind: "client", resources: ["Ashenvale", "Northwatch"] });
    client.disconnectAll.mockImplementationOnce(() => refused("disconnect-failed", "One game did not disconnect."));
    expect(failure(await navigator.choose("client-disconnect", live())).code).toBe("disconnect-failed");
    expect(destination()).toBe("play");
    navigator.cancel();
    expect(client.worlds).toHaveLength(2);
    await go("host");
    expect(await navigator.choose("client-disconnect", live())).toEqual({ ok: true });
    expect(destination()).toBe("host");
    expect(client.worlds).toEqual([]);
  });
});

describe("Host while running", () => {
  async function guarded(players: number) {
    const host = new FakeHost();
    host.players = players;
    const setupResult = setup({ host });
    await setupResult.go("host");
    await setupResult.go("create");
    return { ...setupResult, host };
  }

  it("keeps hosting and switches without stopping anything", async () => {
    const { navigator, host, destination } = await guarded(2);
    expect(await navigator.choose("host-keep", live())).toEqual({ ok: true });
    expect(destination()).toBe("create");
    expect(host.requestStop).not.toHaveBeenCalled();
    expect(host.running).toBe(true);
  });

  it("asks a second time before stopping a host with players, and going back stops nothing", async () => {
    const { navigator, host, destination } = await guarded(2);
    expect(await navigator.choose("host-stop", live())).toEqual({ ok: true });
    expect(navigator.getSnapshot().transition?.impacts[0]?.stage).toBe("confirmingStop");
    expect(host.requestStop).not.toHaveBeenCalled();
    await navigator.choose("host-keep-running", live());
    expect(navigator.getSnapshot().transition?.impacts[0]?.stage).toBe("deciding");
    await navigator.choose("host-stop", live());
    expect(failure(await navigator.choose("host-keep", live())).code).toBe("choice-not-offered");
    expect(host.continueHosting).not.toHaveBeenCalled();
    expect(destination()).toBe("host");
    expect(await navigator.choose("host-confirm-stop", live())).toEqual({ ok: true });
    expect(host.requestStop).toHaveBeenCalledTimes(1);
    expect(destination()).toBe("create");
  });

  it("stops at once when nobody is connected, and refuses the confirmation step before it was asked for", async () => {
    const { navigator, host, destination } = await guarded(0);
    expect(failure(await navigator.choose("host-confirm-stop", live())).code).toBe("choice-not-offered");
    expect(await navigator.choose("host-stop", live())).toEqual({ ok: true });
    expect(host.requestStop).toHaveBeenCalledWith(1);
    expect(destination()).toBe("create");
  });
});

describe("several services at once", () => {
  it("shows one transition for everything affected and switches only after each one is resolved", async () => {
    const editor = new FakeEditor();
    const client = new FakeClient();
    editor.affectedFrom = "play";
    const { navigator, go, destination } = setup({ editor, client });
    await go("play");
    await go("host");
    expect(navigator.getSnapshot().transition?.impacts.map((impact) => impact.kind)).toEqual(["editor", "client"]);
    expect(await navigator.choose("client-disconnect", live())).toEqual({ ok: true });
    expect(destination()).toBe("play");
    expect(navigator.getSnapshot().transition?.impacts.map((impact) => impact.stage)).toEqual(["deciding", "resolved"]);
    expect(await navigator.choose("editor-save", live())).toEqual({ ok: true });
    expect(destination()).toBe("host");
  });
});

describe("services that fail or never answer", () => {
  it("stays where it is and logs the cause when a service cannot say what leaving affects", async () => {
    const editor = new FakeEditor();
    editor.describeLeaveImpact.mockRejectedValueOnce(new Error("session store unreadable"));
    const { go, destination, records } = setup({ editor });
    expect(failure(await go("create"))).toEqual({ code: "leave-check-failed", message: navCopy.checkFailed });
    expect(destination()).toBe("splash");
    expect(records).toEqual([expect.objectContaining({ severity: "error", code: "leave-check-failed", detail: "session store unreadable" })]);
    expect(await go("create")).toEqual({ ok: true });
    expect(destination()).toBe("create");
  });

  it("stops waiting when the signal fires and then accepts the next request", async () => {
    const editor = new FakeEditor();
    editor.describeLeaveImpact.mockImplementationOnce(() => new Promise(() => undefined));
    const { navigator, destination } = setup({ editor });
    const controller = new AbortController();
    const pending = navigator.request("create", controller.signal);
    controller.abort();
    expect(failure(await pending).code).toBe("navigation-timeout");
    expect(destination()).toBe("splash");
    expect(await navigator.request("create", live())).toEqual({ ok: true });
    expect(destination()).toBe("create");
  });
});
