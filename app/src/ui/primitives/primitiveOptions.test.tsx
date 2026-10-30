/** See testSupport.tsx for what these tests cannot prove. */
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ActionHandler, ActionRequest } from "../actions/ActionBus";
import type { PassiveDescriptor } from "../actions/types";
import { EDITOR, GO_HELP, GO_TO, LAYOUT, NAVIGATOR, ORPHAN, createTestUi, deferred, renderWithUi } from "../testSupport";
import { Button } from "./Button";
import { copy } from "../copy";
import { Menu, openMenuHandler } from "./Menu";
import { Progress } from "./Progress";
import { Toast } from "./Toast";

afterEach(cleanup);

const notice: PassiveDescriptor = { passive: true, id: "notice", label: "Heads up", help: "Something happened" };

describe("Toast live role", () => {
  it("keeps a live role by default, so a notice that nothing else announces still reaches assistive technology", () => {
    const ui = createTestUi();
    renderWithUi(ui, <Toast id="notice" title="Heads up" message="Something happened" tone="information" onDismiss={() => undefined} />);
    expect(document.querySelector(".ui-toast")?.getAttribute("role")).toBe("status");
    expect(document.querySelector(".ui-toast")?.textContent).toContain("Something happened");
  });

  it("drops the live role when the owner has already announced the same words", () => {
    const ui = createTestUi();
    renderWithUi(ui, <Toast id="notice" title="Heads up" message="Something happened" tone="error" live={false} onDismiss={() => undefined} />);
    expect(document.querySelector(".ui-toast")?.hasAttribute("role")).toBe(false);
    expect(document.querySelector(".ui-toast")?.textContent).toContain("Something happened");
  });
});

describe("Progress text", () => {
  it("draws its label and value by default", () => {
    renderWithUi(createTestUi(), <Progress described={notice} fraction={0.5} />);
    expect(document.querySelector(".ui-progress-label")?.textContent).toBe("Heads up");
    expect(document.querySelector(".ui-progress-value")?.textContent).toBe("50 percent");
  });

  it("draws no words but keeps its accessible name and value, and adds no description because help is not asked for", () => {
    renderWithUi(createTestUi(), <Progress described={notice} fraction={null} showText={false} />);
    expect(document.querySelector(".ui-progress-label")).toBeNull();
    expect(document.querySelector(".ui-progress-value")).toBeNull();
    const bar = screen.getByRole("progressbar", { name: "Heads up" });
    expect(bar.getAttribute("aria-valuetext")).toBe(copy.working);
    expect(bar.hasAttribute("aria-describedby")).toBe(false);
    expect(document.querySelector(".ui-progress .ui-visually-hidden")).toBeNull();
  });
});

describe("Toast title", () => {
  it("names the tone and the title by default", () => {
    renderWithUi(createTestUi(), <Toast id="notice" title="Heads up" message="Something happened" tone="information" onDismiss={() => undefined} />);
    expect(document.querySelector(".ui-toast-title")?.textContent).toBe(`${copy.toneLabel.information}: Heads up`);
  });

  it("shows only the message when the owner's sentence is complete on its own", () => {
    renderWithUi(createTestUi(), <Toast id="notice" title="Heads up" message="Something happened" tone="information" showTitle={false} onDismiss={() => undefined} />);
    expect(document.querySelector(".ui-toast-title")).toBeNull();
    expect(document.querySelector(".ui-toast")?.textContent?.startsWith("Something happened")).toBe(true);
    expect(document.querySelector(".ui-toast")?.textContent).not.toContain(copy.toneLabel.information);
  });
});

describe("Menu opener", () => {
  const SETTLE = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

  function render(handler: ActionHandler | null) {
    const ui = createTestUi();
    const seen: string[] = [];
    if (handler !== null) {
      ui.runtime.bus.registerHandler(NAVIGATOR, "ui.nav.openMenu", (request) => {
        seen.push(request.actionId);
        return handler(request);
      });
    }
    renderWithUi(ui, <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_HELP)]} />);
    return { ui, seen, opener: screen.getByRole("button", { name: "Go To" }) };
  }

  it("carries the catalog test id and control id, and runs the control's action when activated", async () => {
    const { seen, opener } = render(openMenuHandler);
    expect(opener.getAttribute("data-testid")).toBe("UI-home-menu-03");
    expect(opener.getAttribute("data-control-id")).toBe(GO_TO);
    fireEvent.click(opener);
    await SETTLE();
    expect(seen).toEqual(["ui.nav.openMenu"]);
  });

  it("opens only after the owner answers success, silently, and leaves the control ready", async () => {
    const { ui, opener } = render(openMenuHandler);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(opener);
    await SETTLE();
    expect(screen.queryByRole("menu")).not.toBeNull();
    expect(ui.runtime.announcer.getLast()?.text).toBe("");
    expect(opener.getAttribute("data-state")).toBe("ready");
    expect(document.querySelectorAll(".ui-state-text")).toHaveLength(0);
  });

  it("stays closed and shows the control's error when the owner fails", async () => {
    const { opener } = render(() => Promise.resolve({ status: "recoverable-error", code: "menu-broken", message: "Go To could not open." }));
    fireEvent.click(opener);
    await SETTLE();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(opener.getAttribute("data-state")).toBe("recoverable-error");
    expect(document.querySelector(".ui-state-text")?.textContent).toBe("Go To could not open.");
  });

  it("stays closed and shows busy while the owner is still answering, then opens", async () => {
    const gate = deferred<void>();
    const { opener } = render(async () => {
      await gate.promise;
      return { status: "success", message: "" };
    });
    fireEvent.click(opener);
    await SETTLE();
    expect(opener.getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("menu")).toBeNull();
    gate.resolve();
    await SETTLE();
    expect(screen.queryByRole("menu")).not.toBeNull();
    expect(opener.hasAttribute("aria-busy")).toBe(false);
  });

  it("does not open or ask the owner when the control is disabled, and says why", async () => {
    const { ui, seen, opener } = render(openMenuHandler);
    ui.runtime.bus.setDisabled(GO_TO, "Go To is not available while saving.");
    fireEvent.click(opener);
    await SETTLE();
    expect(seen).toEqual([]);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(opener.getAttribute("aria-disabled")).toBe("true");
    expect(ui.runtime.announcer.getLast()?.text).toBe("Go To is not available. Go To is not available while saving.");
  });

  it("opens once when the opener is activated again while the owner is still answering", async () => {
    const gate = deferred<void>();
    let calls = 0;
    const { opener } = render(async () => {
      calls += 1;
      await gate.promise;
      return { status: "success", message: "" };
    });
    fireEvent.click(opener);
    fireEvent.click(opener);
    await SETTLE();
    fireEvent.click(opener);
    await SETTLE();
    gate.resolve();
    await SETTLE();
    expect(calls).toBe(1);
    expect(screen.queryAllByRole("menu")).toHaveLength(1);
    expect(opener.getAttribute("aria-expanded")).toBe("true");
  });

  it("stays closed when a mounted menu is removed before the owner answers and the control is shown again", async () => {
    const gate = deferred<void>();
    const ui = createTestUi();
    ui.runtime.bus.registerHandler(NAVIGATOR, "ui.nav.openMenu", async () => {
      await gate.promise;
      return { status: "success", message: "" };
    });
    const view = renderWithUi(ui, <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_HELP)]} />);
    fireEvent.click(screen.getByRole("button", { name: "Go To" }));
    await SETTLE();
    view.unmount();
    gate.resolve();
    await SETTLE();
    expect(ui.runtime.bus.getRuntime(GO_TO).state).toBe("success");
    renderWithUi(ui, <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_HELP)]} />);
    await SETTLE();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Go To" }).getAttribute("aria-expanded")).toBe("false");
    expect(ui.runtime.bus.getRuntime(GO_TO).state).toBe("ready");
  });

  it("reports aria-expanded as false, true after opening, false after Escape and after toggling closed", async () => {
    const { opener } = render(openMenuHandler);
    expect(opener.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(opener);
    await SETTLE();
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(opener.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(opener);
    await SETTLE();
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(opener);
    await SETTLE();
    expect(opener.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not open when nobody owns the action yet, and says so", async () => {
    const { opener } = render(null);
    fireEvent.click(opener);
    await SETTLE();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.querySelector(".ui-state-text")?.textContent).toBe("Go To is not available yet.");
  });
});

describe("Menu with a choice group", () => {
  const OPTIONS = [
    { value: "side", label: "Side by side" },
    { value: "stacked", label: "Stacked" },
    { value: "tabbed", label: "Tabbed" },
  ];

  async function openChoiceMenu(chosen: string) {
    const ui = createTestUi();
    const requests: ActionRequest[] = [];
    ui.runtime.bus.registerHandler(NAVIGATOR, "ui.nav.openMenu", openMenuHandler);
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.layout", (request) => {
      requests.push({ actionId: request.actionId, controlId: request.controlId, ...(request.value === undefined ? {} : { value: request.value }) });
      return Promise.resolve({ status: "success" });
    });
    renderWithUi(ui, <Menu opener={ui.control(GO_TO)} items={[]} choices={{ control: ui.control(LAYOUT), options: OPTIONS, value: chosen }} />);
    const opener = screen.getByRole("button", { name: "Go To" });
    fireEvent.click(opener);
    await new Promise((resolve) => setTimeout(resolve));
    return { ui, requests, opener };
  }

  it("lists every option as a radio item, marks only the confirmed one and focuses it", async () => {
    await openChoiceMenu("stacked");
    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((item) => [item.textContent?.replace(copy.chosenMark, ""), item.getAttribute("aria-checked")])).toEqual([
      ["Side by side", "false"],
      ["Stacked", "true"],
      ["Tabbed", "false"],
    ]);
    expect(items.filter((item) => item.textContent?.includes(copy.chosenMark)).map((item) => item.getAttribute("data-value"))).toEqual(["stacked"]);
    expect(document.activeElement).toBe(items[1]);
    expect(screen.getByRole("group", { name: "Layout" }).getAttribute("data-testid")).toBe("UI-editor-fields-03");
  });

  it("sends the chosen value to the control's action once through the input manager, then closes and returns focus to the opener", async () => {
    const { requests, opener } = await openChoiceMenu("stacked");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Side by side" }));
    await new Promise((resolve) => setTimeout(resolve));
    expect(requests).toEqual([{ actionId: "ui.test.layout", controlId: LAYOUT, value: "side" }]);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on Escape without choosing and returns focus to the opener", async () => {
    const { requests, opener } = await openChoiceMenu("side");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(requests).toEqual([]);
  });

  it.each([
    ["ArrowDown", "side", "Stacked"],
    ["ArrowDown", "stacked", "Tabbed"],
    ["ArrowDown", "tabbed", "Side by side"],
    ["ArrowUp", "tabbed", "Stacked"],
    ["ArrowUp", "stacked", "Side by side"],
    ["ArrowUp", "side", "Tabbed"],
    ["Home", "tabbed", "Side by side"],
    ["End", "side", "Tabbed"],
  ])("%s from the confirmed option %s moves focus to %s", async (key, chosen, expected) => {
    await openChoiceMenu(chosen);
    fireEvent.keyDown(document.activeElement ?? document.body, { key });
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: expected }));
  });
});

describe("Button state text", () => {
  it("shows the outcome beside the button by default and hides it when another part carries the message", async () => {
    const shown = createTestUi();
    renderWithUi(shown, <Button control={shown.control(ORPHAN)} />);
    await shown.runtime.bus.dispatch({ actionId: "ui.test.orphan", controlId: ORPHAN });
    expect(document.querySelectorAll(".ui-state-text")).toHaveLength(1);
    cleanup();
    const hidden = createTestUi();
    renderWithUi(hidden, <Button control={hidden.control(ORPHAN)} showState={false} />);
    await hidden.runtime.bus.dispatch({ actionId: "ui.test.orphan", controlId: ORPHAN });
    expect(document.querySelectorAll(".ui-state-text")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Unowned Tool" }).getAttribute("data-state")).toBe("recoverable-error");
  });
});

describe("shared unavailable wording", () => {
  it("is one plain sentence naming the control", () => {
    expect(copy.notInThisBuild("Create")).toBe("Create is not available yet.");
  });
});
