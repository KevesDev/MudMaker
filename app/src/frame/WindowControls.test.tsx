/** jsdom draws nothing: this shows the refusal of a catalog that names no toggle for the window's mode, not how the controls look. */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import actions from "../../../contracts/ui/v1/actions.v1.json";
import clientCatalog from "../../../contracts/ui/v1/client-controls.v1.json";
import editorCatalog from "../../../contracts/ui/v1/editor-controls.v1.json";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import hostCatalog from "../../../contracts/ui/v1/host-controls.v1.json";
import schema from "../../../contracts/ui/v1/ui-control.schema.json";
import { ActionRegistry, createUiRuntime, UiProvider } from "../ui";
import { fakeWindowShell } from "./frameTestSupport";
import { FRAME } from "./frameLayout";
import { WindowController } from "./WindowController";
import { WindowControls } from "./WindowControls";

afterEach(cleanup);

function registryWith(change: (id: string) => Record<string, unknown>): ActionRegistry {
  const controls = homeCatalog.controls.map((control) => ({ ...control, ...change(control.id) }));
  const result = ActionRegistry.create({ schema, actions, catalogs: { home: { ...homeCatalog, controls }, editor: editorCatalog, client: clientCatalog, host: hostCatalog } });
  if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join(" "));
  return result.registry;
}

function mount(registry: ActionRegistry): void {
  const runtime = createUiRuntime({ registry, document, diagnostics: () => undefined });
  const controller = new WindowController({ shell: fakeWindowShell(), report: () => undefined, correlation: () => ({}) });
  render(
    <UiProvider runtime={runtime}>
      <WindowControls controller={controller} />
    </UiProvider>,
  );
}

describe("WindowControls", () => {
  it("refuses a catalog in which no toggle entry is shown for the current mode, instead of drawing no toggle", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const broken = registryWith((id) => (id === FRAME.maximize ? { visibleWhen: "invented" } : {}));
      expect(() => mount(broken)).toThrowError(expect.objectContaining({ code: "visible-when-unknown" }));
    } finally {
      quiet.mockRestore();
    }
  });

  it("draws the toggle the catalog names for the mode when the catalog is whole", () => {
    mount(registryWith(() => ({})));
    expect(document.querySelector(`[data-control-id="${FRAME.maximize}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-control-id="${FRAME.restore}"]`)).toBeNull();
  });
});
