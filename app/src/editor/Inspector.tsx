import { useId, useState, type ReactNode } from "react";
import { UiContractError, requireName, useCommand, type Described } from "../ui";

/** What a field's value control needs to connect to its label and its message. */
export interface InspectorControlSlot {
  readonly id: string;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
}

export interface InspectorFieldDescriptor {
  readonly id: string;
  readonly label: string;
  /** Draws the value control. The control belongs to the feature that owns the value; the inspector only lays it out. */
  readonly control: (slot: InspectorControlSlot) => ReactNode;
  /** The short message beside the field when its value is not acceptable. */
  readonly error?: string | undefined;
}

export interface InspectorSectionDescriptor {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly InspectorFieldDescriptor[];
}

export interface InspectorProps {
  readonly described: Described;
  readonly sections: readonly InspectorSectionDescriptor[];
}

/** Whether there is anything to show. A section without fields is not shown, and without any the inspector is absent. */
export function inspectorHasContent(sections: readonly InspectorSectionDescriptor[]): boolean {
  return sections.some((section) => section.fields.length > 0);
}

function requireUnique(kind: string, ids: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new UiContractError("inspector-duplicate-id", id, `The inspector was given two ${kind} with the id "${id}".`);
    seen.add(id);
  }
}

function Field({ field, rootId }: { readonly field: InspectorFieldDescriptor; readonly rootId: string }) {
  const controlId = `${rootId}-${field.id}`;
  const messageId = `${controlId}-message`;
  const invalid = field.error !== undefined && field.error.length > 0;
  return (
    <div className="editor-field" data-invalid={invalid ? "true" : undefined}>
      <label htmlFor={controlId} className="ui-label">
        {field.label}
      </label>
      {field.control({ id: controlId, describedBy: invalid ? messageId : undefined, invalid })}
      {invalid ? (
        <span id={messageId} className="editor-field-error">
          {field.error}
        </span>
      ) : null}
    </div>
  );
}

function Section({ section, rootId }: { readonly section: InspectorSectionDescriptor; readonly rootId: string }) {
  const [expanded, setExpanded] = useState(true);
  const uid = useId();
  const toggle = `inspector.section.${uid}`;
  useCommand(toggle, () => setExpanded((current) => !current));
  const bodyId = `${uid}-body`;
  return (
    <section className="editor-section">
      <h3 className="editor-section-heading">
        <button type="button" aria-expanded={expanded} aria-controls={bodyId} data-ui-command={toggle} className="ui-control ui-hit editor-section-toggle">
          {section.label}
        </button>
      </h3>
      <div id={bodyId} hidden={!expanded} className="editor-section-body">
        {section.fields.map((field) => (
          <Field key={field.id} field={field} rootId={`${rootId}-${section.id}`} />
        ))}
      </div>
    </section>
  );
}

/**
 * The container for typed fields of whatever is selected: collapsible groups of label, value control and message
 * rows. It renders only the descriptors it is given and draws nothing when there are none.
 */
export function Inspector({ described, sections }: InspectorProps) {
  const name = requireName(described, "Inspector");
  const rootId = useId();
  requireUnique("sections", sections.map((section) => section.id));
  for (const section of sections) requireUnique("fields", section.fields.map((field) => field.id));
  if (!inspectorHasContent(sections)) return null;
  return (
    <section aria-label={name} className="editor-inspector">
      {sections
        .filter((section) => section.fields.length > 0)
        .map((section) => (
          <Section key={section.id} section={section} rootId={rootId} />
        ))}
    </section>
  );
}
