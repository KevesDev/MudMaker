/** Keys go through the real input manager and action bus; see testSupport for what jsdom cannot show. */
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { APP_SCOPE, loadShippedRegistry, createUiRuntime, type UiDiagnostic, type UiRuntime } from "../ui";
import { elementBy as element, mountHtml as mount, settle } from "../ui/testSupport";
import { REGION_NEXT_ACTION, REGION_PREVIOUS_ACTION, registerRegionCycling } from "./regionActions";

let runtime: UiRuntime;
let reports: UiDiagnostic[];
let detach: () => void;
let stop: () => void;

beforeEach(() => {
  reports = [];
  runtime = createUiRuntime({ registry: loadShippedRegistry(), document, diagnostics: (record) => reports.push(record) });
  detach = runtime.input.attach();
  stop = registerRegionCycling(runtime, (record) => reports.push(record));
  mount(`
    <div data-region="toolbar"><button id="bar">bar</button></div>
    <input id="text" />
    <div data-region="canvas" tabindex="0" id="canvas"></div>
    <div data-region="inspector"><button id="inspect">inspect</button></div>`);
});

afterEach(() => {
  stop();
  detach();
  document.body.innerHTML = "";
});

const press = async (key: string, shiftKey = false, target: Element = document.activeElement ?? document.body): Promise<boolean> => {
  const notPrevented = fireEvent.keyDown(target, { key, shiftKey });
  await settle();
  return notPrevented;
};
const focused = (): string => document.activeElement?.id ?? "";

describe("F6 region cycling", () => {
  it("moves forward on F6 and back on Shift+F6 and takes the key from the page", async () => {
    expect(await press("F6")).toBe(false);
    expect(focused()).toBe("bar");
    await press("F6");
    expect(focused()).toBe("canvas");
    await press("F6", true);
    expect(focused()).toBe("bar");
    await press("F6", true);
    expect(focused()).toBe("inspect");
    expect(reports).toEqual([]);
  });

  it("leaves F6 to a text field while typing", async () => {
    element("#text").focus();
    expect(await press("F6")).toBe(true);
    expect(focused()).toBe("text");
  });

  it("does nothing under a dialog, which hides the application scope from shortcuts", async () => {
    element("#bar").focus();
    const dialog = document.createElement("div");
    dialog.tabIndex = -1;
    document.body.append(dialog);
    const pop = runtime.focus.pushScope({ key: "dialog:test", kind: "dialog", container: dialog });
    await press("F6");
    expect(focused()).toBe("bar");
    pop();
    await press("F6");
    expect(focused()).toBe("canvas");
  });

  it("reports a chord another owner already holds in the same scope, and leaves it theirs", async () => {
    stop();
    const second = createUiRuntime({ registry: loadShippedRegistry(), document, diagnostics: () => undefined });
    const held = second.shortcuts.register({ scope: APP_SCOPE, chord: "F6", actionId: REGION_PREVIOUS_ACTION, owner: "Other" });
    expect(held.ok).toBe(true);
    const found: UiDiagnostic[] = [];
    registerRegionCycling(second, (record) => found.push(record));
    expect(found.map((record) => [record.code, record.actionId])).toEqual([["shortcut-collision", REGION_NEXT_ACTION]]);
    expect(second.shortcuts.resolve("F6", second.focus.scopes(), () => false, false)?.owner).toBe("Other");
    expect(second.shortcuts.resolve("Shift+F6", second.focus.scopes(), () => false, false)?.actionId).toBe(REGION_PREVIOUS_ACTION);
    stop = () => undefined;
  });
});
