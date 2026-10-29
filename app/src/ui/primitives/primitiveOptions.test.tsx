/** See testSupport.tsx for what these tests cannot prove. */
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PassiveDescriptor } from "../actions/types";
import { ORPHAN, createTestUi, renderWithUi } from "../testSupport";
import { Button } from "./Button";
import { copy } from "../copy";
import { Toast } from "./Toast";

afterEach(cleanup);

const notice: PassiveDescriptor = { passive: true, id: "notice", label: "Heads up", help: "Something happened" };

describe("Toast live role", () => {
  it("keeps a live role by default, so a notice that nothing else announces still reaches assistive technology", () => {
    const ui = createTestUi();
    renderWithUi(ui, <Toast described={notice} tone="information" onDismiss={() => undefined} />);
    expect(document.querySelector(".ui-toast")?.getAttribute("role")).toBe("status");
    expect(document.querySelector(".ui-toast")?.textContent).toContain("Something happened");
  });

  it("drops the live role when the owner has already announced the same words", () => {
    const ui = createTestUi();
    renderWithUi(ui, <Toast described={notice} tone="error" live={false} onDismiss={() => undefined} />);
    expect(document.querySelector(".ui-toast")?.hasAttribute("role")).toBe(false);
    expect(document.querySelector(".ui-toast")?.textContent).toContain("Something happened");
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
  it("gives the sentence form and the status form of the same fact", () => {
    expect(copy.notInThisBuild("Create")).toBe("Create is not available in this build yet.");
    expect(copy.notInThisBuildState).toBe("Not available in this build yet.");
  });
});
