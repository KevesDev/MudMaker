import { useSyncExternalStore } from "react";
import { Button, Dialog, useUi, type ControlId } from "../ui";
import { CANCEL_ACTION } from "./navigatorActions";
import type { ImpactKind } from "./leaveImpact";
import type { ImpactState, WorkspaceNavigator } from "./WorkspaceNavigator";

/** The catalog controls of each service's leave prompt: its heading, its choices, and the Cancel that belongs to its surface. */
const GUARD = {
  editor: { heading: "editor.navigationGuard.01", choices: ["editor.navigationGuard.02", "editor.navigationGuard.03"], cancel: "editor.navigationGuard.04" },
  client: { heading: "client.navigationGuard.01", choices: ["client.navigationGuard.03"], cancel: "client.navigationGuard.04" },
  host: { heading: "host.navigationGuard.01", choices: ["host.navigationGuard.02", "host.navigationGuard.03"], cancel: "host.navigationGuard.04" },
} as const satisfies Readonly<Record<ImpactKind, { readonly heading: ControlId; readonly choices: readonly ControlId[]; readonly cancel: ControlId }>>;

/** The second question before a running host with players is stopped. */
const HOST_STOP = { warning: "host.navigationGuard.05", confirm: "host.navigationGuard.06", keep: "host.navigationGuard.07" } as const satisfies Readonly<Record<string, ControlId>>;

function Resources({ impact }: { readonly impact: ImpactState }) {
  if (impact.resources.length === 0) return null;
  return (
    <ul className="nav-guard-resources">
      {impact.resources.map((resource) => (
        <li key={resource}>{resource}</li>
      ))}
    </ul>
  );
}

function Choices({ impact }: { readonly impact: ImpactState }) {
  const { registry } = useUi();
  const control = (id: ControlId) => registry.requireControl(id);
  if (impact.stage === "resolved") return null;
  if (impact.stage === "confirmingStop") {
    return (
      <>
        <p className="nav-guard-text">{control(HOST_STOP.warning).label}</p>
        <div className="nav-guard-choices">
          <Button control={control(HOST_STOP.confirm)} />
          <Button control={control(HOST_STOP.keep)} />
        </div>
      </>
    );
  }
  return (
    <div className="nav-guard-choices">
      {GUARD[impact.kind].choices.map((id) => (
        <Button key={id} control={control(id)} />
      ))}
    </div>
  );
}

/**
 * One dialog for everything leaving would affect. Escape and Cancel are the same action, so there is one way to
 * leave everything as it was, and the dialog offers no second Close.
 */
export function GuardDialog({ navigator }: { readonly navigator: WorkspaceNavigator }) {
  const { registry, bus } = useUi();
  const transition = useSyncExternalStore(navigator.subscribe, () => navigator.getSnapshot().transition);
  const impacts = transition?.impacts ?? [];
  const first = impacts[0];
  const cancel = first === undefined ? null : registry.requireControl(GUARD[first.kind].cancel);
  const heading = (impact: ImpactState): string => registry.requireControl(GUARD[impact.kind].heading).label;
  return (
    <Dialog
      open={transition !== null}
      title={first === undefined ? "" : heading(first)}
      closeButton={false}
      onClose={() => {
        if (cancel !== null) void bus.dispatch({ actionId: CANCEL_ACTION, controlId: cancel.id });
      }}
    >
      {impacts.map((impact, index) => (
        <section key={impact.kind} className="nav-guard-section">
          {index === 0 ? null : <p className="nav-guard-text">{heading(impact)}</p>}
          <Resources impact={impact} />
          <Choices impact={impact} />
        </section>
      ))}
      {cancel === null ? null : <Button control={cancel} />}
    </Dialog>
  );
}
