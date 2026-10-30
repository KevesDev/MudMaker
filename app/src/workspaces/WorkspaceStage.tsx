import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { ControlNotice } from "../home/ControlNotice";
import { APPEARANCE, SPLASH } from "../home/homeLayout";
import { NAVIGATION, goToDestinations, type WorkspaceDestination } from "../nav/destinations";
import type { NavigatorSnapshot } from "../nav/WorkspaceNavigator";
import { REGION, Toast, useUi } from "../ui";

/**
 * The working surface each workspace feature mounts into: the editor shell, the player client and host
 * operations. A workspace with no entry shows a plain empty surface.
 */
export type WorkspaceSurfaces = Readonly<Partial<Record<WorkspaceDestination, ComponentType>>>;

interface RegionProps {
  readonly workspace: WorkspaceDestination;
  readonly active: boolean;
  readonly Surface: ComponentType | undefined;
}

/** One workspace's session. It stays mounted while another destination shows, so its layout, selection and drafts survive the switch. */
function Region({ workspace, active, Surface }: RegionProps) {
  const { registry } = useUi();
  const ref = useRef<HTMLElement>(null);
  const name = registry.requireControl(NAVIGATION[workspace].entries[workspace]).label;
  useLayoutEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  // The Create surface is made of its own regions; Play and Host are each a single region.
  return (
    <main ref={ref} hidden={!active} tabIndex={-1} aria-label={name} className="workspace-surface" data-workspace={workspace} {...(workspace === "create" ? {} : { "data-region": REGION.surface })}>
      {Surface === undefined ? null : <Surface />}
    </main>
  );
}

/** A refusal or failure of Go To or Appearance, which the closed menu cannot show beside its control. */
function WorkspaceNotice({ workspace }: { readonly workspace: WorkspaceDestination }) {
  const { registry, bus } = useUi();
  const watched = [...goToDestinations(workspace).map((destination) => NAVIGATION[workspace].entries[destination]), APPEARANCE];
  const [notices] = useState(() => new ControlNotice(bus, watched));
  const notice = useSyncExternalStore(notices.subscribe, notices.getSnapshot);
  if (notice === null) return null;
  const dismiss = (): void => {
    document.querySelector<HTMLElement>(`[data-testid="${registry.requireControl(SPLASH.settings).testId}"]`)?.focus();
    notices.dismiss();
  };
  return (
    <div className="workspace-notice">
      <Toast
        id="workspace.notice"
        title={registry.requireControl(notice.controlId).label}
        message={notice.message}
        tone="information"
        {...(notice.code === null ? {} : { code: notice.code })}
        live={false}
        showTitle={false}
        onDismiss={dismiss}
      />
    </div>
  );
}

export function WorkspaceStage({ snapshot, surfaces }: { readonly snapshot: NavigatorSnapshot; readonly surfaces: WorkspaceSurfaces }) {
  const { destination, opened } = snapshot;
  return (
    <div className="workspace-stage" hidden={destination === "splash"}>
      {opened.map((workspace) => (
        <Region key={workspace} workspace={workspace} active={workspace === destination} Surface={surfaces[workspace]} />
      ))}
      {destination === "splash" ? null : <WorkspaceNotice key={destination} workspace={destination} />}
    </div>
  );
}
