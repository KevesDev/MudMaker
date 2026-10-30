import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestUi, renderWithUi } from "../ui/testSupport";
import { Inspector, inspectorHasContent, type InspectorFieldDescriptor, type InspectorSectionDescriptor } from "./Inspector";
import { described } from "./editorTestSupport";

afterEach(cleanup);

const inspector = described("editor.inspector.01");

/** A field whose control is a real text input wired to the slot the inspector hands it. */
const textField = (id: string, label: string, error?: string): InspectorFieldDescriptor => ({
  id,
  label,
  error,
  control: ({ id: controlId, describedBy, invalid }) => <input id={controlId} aria-describedby={describedBy} aria-invalid={invalid || undefined} defaultValue={`${id} value`} />,
});

const mount = (sections: InspectorSectionDescriptor[]) => {
  const ui = createTestUi();
  const view = renderWithUi(ui, <Inspector described={inspector} sections={sections} />);
  return { ui, view };
};

describe("an inspector with nothing to show", () => {
  it.each([
    ["no sections", []],
    ["only sections without fields", [{ id: "a", label: "Identity", fields: [] }]],
  ])("draws nothing for %s", (_name, sections) => {
    const { view } = mount(sections);
    expect(inspectorHasContent(sections)).toBe(false);
    expect(view.container.querySelector(".editor-inspector")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hides an empty section while showing the others", () => {
    mount([
      { id: "empty", label: "Hidden group", fields: [] },
      { id: "id", label: "Identity", fields: [textField("name", "Name")] },
    ]);
    expect(screen.queryByText("Hidden group")).toBeNull();
    expect(screen.getByRole("button", { name: "Identity" })).toBeTruthy();
  });
});

describe("typed field rows", () => {
  it("names the region from the catalog and gives each field its label, control and nothing else when valid", () => {
    mount([{ id: "id", label: "Identity", fields: [textField("name", "Name"), textField("kind", "Type")] }]);
    expect(screen.getByRole("region", { name: inspector.label })).toBeTruthy();
    const name = screen.getByLabelText("Name") as HTMLInputElement;
    expect(name.value).toBe("name value");
    expect(name.hasAttribute("aria-describedby")).toBe(false);
    expect(name.hasAttribute("aria-invalid")).toBe(false);
    expect(screen.getByLabelText("Type")).toBeTruthy();
    expect(document.querySelector(".editor-field-error")).toBeNull();
  });

  it("shows the validation message beside the invalid field only and ties it to that control", () => {
    mount([{ id: "id", label: "Identity", fields: [textField("name", "Name", "Use a shorter name."), textField("kind", "Type")] }]);
    const name = screen.getByLabelText("Name");
    const message = screen.getByText("Use a shorter name.");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toBe(message.id);
    expect(screen.getByLabelText("Type").hasAttribute("aria-describedby")).toBe(false);
  });

  it("keeps the same field id in two sections apart", () => {
    mount([
      { id: "one", label: "First", fields: [textField("name", "Name one")] },
      { id: "two", label: "Second", fields: [textField("name", "Name two")] },
    ]);
    expect(screen.getByLabelText("Name one").id).not.toBe(screen.getByLabelText("Name two").id);
  });

  it("refuses duplicate section or field ids with a code", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const attempt = (sections: InspectorSectionDescriptor[]) => () => renderWithUi(createTestUi(), <Inspector described={inspector} sections={sections} />);
    expect(attempt([{ id: "x", label: "A", fields: [textField("f", "F")] }, { id: "x", label: "B", fields: [] }])).toThrowError(expect.objectContaining({ code: "inspector-duplicate-id" }));
    expect(attempt([{ id: "x", label: "A", fields: [textField("f", "F"), textField("f", "G")] }])).toThrowError(expect.objectContaining({ code: "inspector-duplicate-id" }));
  });
});

describe("collapsible groups", () => {
  it("opens expanded, collapses and expands through the input manager, and keeps the controls mounted", () => {
    const { ui } = mount([{ id: "id", label: "Identity", fields: [textField("name", "Name")] }]);
    const toggle = screen.getByRole("button", { name: "Identity" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    input.value = "typed";
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")?.hidden).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("typed");
    expect(ui.diagnostics).toEqual([]);
  });

  it("collapses one group without touching another", () => {
    mount([
      { id: "a", label: "First", fields: [textField("x", "X")] },
      { id: "b", label: "Second", fields: [textField("y", "Y")] },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "First" }));
    expect(screen.getByRole("button", { name: "Second" }).getAttribute("aria-expanded")).toBe("true");
    expect(within(document.body).getByLabelText("Y")).toBeTruthy();
  });
});
