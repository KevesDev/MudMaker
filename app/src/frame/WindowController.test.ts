/** The fake window never draws or resizes anything: these tests show how the controller follows the answers a window gives. */
import { describe, expect, it } from "vitest";
import type { UiDiagnostic } from "../ui";
import { deferred, settle } from "../ui/testSupport";
import { fakeWindowShell, type FakeWindowShell } from "./frameTestSupport";
import { WindowController } from "./WindowController";

const CORRELATION = { launchId: "launch-frame-1" };

function controllerFor(shell: FakeWindowShell = fakeWindowShell()): { controller: WindowController; shell: FakeWindowShell; records: UiDiagnostic[] } {
  const records: UiDiagnostic[] = [];
  return { controller: new WindowController({ shell, report: (record) => records.push(record), correlation: () => CORRELATION }), shell, records };
}

describe("the window mode", () => {
  it("reads the real mode from the window when someone starts watching", async () => {
    const { controller } = controllerFor(fakeWindowShell(true));
    expect(controller.getSnapshot()).toBe("restored");
    const stop = controller.subscribe(() => undefined);
    await settle();
    expect(controller.getSnapshot()).toBe("maximized");
    stop();
  });

  it("follows a change made outside the frame controls, such as snapping the window", async () => {
    const { controller, shell } = controllerFor();
    const heard: string[] = [];
    const stop = controller.subscribe(() => heard.push(controller.getSnapshot()));
    await settle();
    shell.changeOutside(true);
    await settle();
    expect(controller.getSnapshot()).toBe("maximized");
    shell.changeOutside(false);
    await settle();
    expect(controller.getSnapshot()).toBe("restored");
    expect(heard).toEqual(["maximized", "restored"]);
    stop();
  });

  it("does not tell listeners again when a re-read gives the same mode", async () => {
    const { controller } = controllerFor();
    let calls = 0;
    const stop = controller.subscribe(() => (calls += 1));
    await settle();
    await controller.refresh();
    expect(calls).toBe(0);
    stop();
  });

  it("keeps one listener on the window however many parts watch, and removes it when the last stops", async () => {
    const { controller, shell } = controllerFor();
    const stopFirst = controller.subscribe(() => undefined);
    const stopSecond = controller.subscribe(() => undefined);
    await settle();
    expect(shell.listenerCount()).toBe(1);
    stopFirst();
    expect(shell.listenerCount()).toBe(1);
    stopSecond();
    await settle();
    expect(shell.listenerCount()).toBe(0);
  });

  it("removes the window listener even when the last watcher leaves before the window has answered", async () => {
    const shell = fakeWindowShell();
    const gate = deferred<void>();
    const attach = shell.onStateChange.getMockImplementation();
    expect(attach).toBeDefined();
    shell.onStateChange.mockImplementationOnce((listener) => gate.promise.then(() => (attach ? attach(listener) : Promise.resolve(() => undefined))));
    const { controller } = controllerFor(shell);
    const stop = controller.subscribe(() => undefined);
    stop();
    gate.resolve();
    await settle();
    expect(shell.onStateChange).toHaveBeenCalledTimes(1);
    expect(shell.listenerCount()).toBe(0);
  });

  it("answers a refresh with the mode that read found", async () => {
    const { controller, shell } = controllerFor(fakeWindowShell(true));
    expect(await controller.refresh()).toBe("maximized");
    shell.changeOutside(false);
    expect(await controller.refresh()).toBe("restored");
  });

  it("applies reads in order, so a slow first read can never overwrite what a later read found", async () => {
    const shell = fakeWindowShell();
    const slow = deferred<boolean>();
    shell.isMaximized.mockImplementationOnce(() => slow.promise);
    const { controller } = controllerFor(shell);
    const first = controller.refresh();
    shell.isMaximized.mockImplementationOnce(() => Promise.resolve(true));
    const second = controller.refresh();
    expect(shell.isMaximized).toHaveBeenCalledTimes(1);
    slow.resolve(false);
    expect(await first).toBe("restored");
    expect(await second).toBe("maximized");
    expect(controller.getSnapshot()).toBe("maximized");
  });
});

describe("a burst of window changes", () => {
  it("asks the window once at a time and once more after the burst, however many changes arrive meanwhile", async () => {
    const shell = fakeWindowShell();
    const gate = deferred<boolean>();
    shell.isMaximized.mockImplementationOnce(() => gate.promise);
    const { controller } = controllerFor(shell);
    const stop = controller.subscribe(() => undefined);
    await settle();
    expect(shell.isMaximized).toHaveBeenCalledTimes(1);
    for (let index = 0; index < 50; index += 1) shell.changeOutside(index % 2 === 0);
    await settle();
    expect(shell.isMaximized).toHaveBeenCalledTimes(1);
    gate.resolve(false);
    await settle();
    expect(shell.isMaximized).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot()).toBe("restored");
    stop();
  });

  it("reads the window after a change that arrived during a read, so the last change is never missed", async () => {
    const shell = fakeWindowShell();
    const gate = deferred<boolean>();
    shell.isMaximized.mockImplementationOnce(() => gate.promise);
    const { controller } = controllerFor(shell);
    const stop = controller.subscribe(() => undefined);
    await settle();
    shell.changeOutside(true);
    gate.resolve(false);
    await settle();
    expect(controller.getSnapshot()).toBe("maximized");
    stop();
  });
});

describe("window commands", () => {
  it("minimize asks the window once and changes no mode", async () => {
    const { controller, shell } = controllerFor();
    await controller.minimize();
    expect(shell.minimize).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toBe("restored");
  });

  it("toggling answers with nothing when the mode could not be read afterwards, rather than a mode nobody read", async () => {
    const { controller, shell } = controllerFor();
    shell.isMaximized.mockRejectedValueOnce(new Error("no window"));
    expect(await controller.toggleMaximize()).toBeNull();
    expect(shell.toggleMaximize).toHaveBeenCalledTimes(1);
  });

  it("toggling asks the window once and answers with the mode the window reports afterwards", async () => {
    const { controller, shell } = controllerFor();
    expect(await controller.toggleMaximize()).toBe("maximized");
    expect(await controller.toggleMaximize()).toBe("restored");
    expect(shell.toggleMaximize).toHaveBeenCalledTimes(2);
  });

  it("passes a refused command on as a failure and keeps the mode", async () => {
    const { controller, shell } = controllerFor();
    shell.toggleMaximize.mockRejectedValueOnce(new Error("window command denied"));
    await expect(controller.toggleMaximize()).rejects.toThrow("window command denied");
    expect(controller.getSnapshot()).toBe("restored");
  });
});

describe("when the window cannot be read", () => {
  it("keeps the last mode, answers a refresh with nothing and logs one structured record with the launch id", async () => {
    const { controller, shell, records } = controllerFor(fakeWindowShell(true));
    await controller.refresh();
    expect(controller.getSnapshot()).toBe("maximized");
    shell.isMaximized.mockRejectedValueOnce(new Error("no window"));
    expect(await controller.refresh()).toBeNull();
    expect(controller.getSnapshot()).toBe("maximized");
    expect(records).toEqual([
      expect.objectContaining({ severity: "error", code: "window-state-unreadable", actionId: null, controlId: null, detail: "no window", correlation: CORRELATION }),
    ]);
    expect(records[0]?.message).toMatch(/window/i);
  });

  it("logs a failure that repeats on every change once, and again only when the failure differs or after a good read", async () => {
    const { controller, shell, records } = controllerFor();
    shell.isMaximized.mockRejectedValue(new Error("no window"));
    for (let index = 0; index < 5; index += 1) await controller.refresh();
    expect(records.map((record) => record.detail)).toEqual(["no window"]);
    shell.isMaximized.mockRejectedValue(new Error("window locked"));
    await controller.refresh();
    expect(records.map((record) => record.detail)).toEqual(["no window", "window locked"]);
    shell.isMaximized.mockResolvedValue(false);
    expect(await controller.refresh()).toBe("restored");
    shell.isMaximized.mockRejectedValue(new Error("window locked"));
    await controller.refresh();
    expect(records.map((record) => record.detail)).toEqual(["no window", "window locked", "window locked"]);
  });

  it("logs a window that refuses to report changes", async () => {
    const shell = fakeWindowShell();
    shell.onStateChange.mockRejectedValueOnce(new Error("listen denied"));
    const { controller, records } = controllerFor(shell);
    const stop = controller.subscribe(() => undefined);
    await settle();
    expect(records.map((record) => [record.code, record.detail])).toEqual([["window-watch-failed", "listen denied"]]);
    expect(records[0]?.correlation).toEqual(CORRELATION);
    stop();
  });
});
