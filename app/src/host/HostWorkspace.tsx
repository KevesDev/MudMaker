import { useId, useState, type ReactNode } from "react";
import { MENU_CARET } from "../nav/destinations";
import { ControlList, EmptyCue, PassiveText } from "../workspaces/controlParts";
import { PORT_INVALID_MESSAGE, portIsInvalid } from "../workspaces/ports";
import { ToolbarSlot } from "../workspaces/ToolbarSlot";
import { SILENT, useIntentRouter, useMenuOpeners } from "../workspaces/useIntentRouter";
import { Button, Menu, Switch, TextField, Toolbar, useUi, type ActionHandler, type PassiveDescriptor } from "../ui";
import { DASHBOARD, HOST_OWNER, NETWORK, PLAYERS, PUBLIC_BINDS, RECOVERY, RELEASES, SECTIONS, type Section } from "./hostLayout";
import { hostCopy } from "./hostCopy";

const HOST_BAR: PassiveDescriptor = { passive: true, id: "host.actions", label: hostCopy.hostActions, help: "" };

type Flag = "requireTls" | "proxy";

function NetworkForm() {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const [bind, setBind] = useState("");
  const [port, setPort] = useState("");
  const [proxies, setProxies] = useState("");
  const [flags, setFlags] = useState<Readonly<Record<Flag, boolean>>>({ requireTls: true, proxy: false });
  const flag = (name: Flag): ActionHandler => ({ value }) => {
    if (typeof value !== "boolean") return Promise.resolve({ status: "validation-error", code: "toggle-invalid", message: hostCopy.invalidToggle });
    setFlags((current) => ({ ...current, [name]: value }));
    return Promise.resolve(SILENT);
  };
  useIntentRouter(HOST_OWNER, { [NETWORK.requireTls]: flag("requireTls"), [NETWORK.proxy]: flag("proxy") });
  return (
    <div className="host-form">
      <TextField control={control(NETWORK.bind)} value={bind} onValueChange={setBind} />
      {PUBLIC_BINDS.includes(bind.trim()) ? <PassiveText control={control(NETWORK.warning)}>{hostCopy.publicConnections}</PassiveText> : null}
      <TextField control={control(NETWORK.port)} value={port} onValueChange={setPort} />
      {portIsInvalid(port) ? (
        <span role="alert" className="workspace-error">
          {PORT_INVALID_MESSAGE}
        </span>
      ) : null}
      <Switch control={control(NETWORK.requireTls)} checked={flags.requireTls} />
      <Switch control={control(NETWORK.proxy)} checked={flags.proxy} />
      {flags.proxy ? <TextField control={control(NETWORK.proxyList)} value={proxies} onValueChange={setProxies} /> : null}
      <div className="workspace-row">
        <Button control={control(NETWORK.verify)} />
        <Button control={control(NETWORK.apply)} />
      </div>
    </div>
  );
}

/** What each section of the selector shows. Every section starts empty because no world has been hosted. */
function SectionContent({ section }: { readonly section: Section }): ReactNode {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  switch (section) {
    case "host.dashboard.08":
      return (
        <>
          <ControlList control={control(PLAYERS.list)} />
          <EmptyCue>{hostCopy.noPlayers}</EmptyCue>
          <div className="workspace-row">
            <Button control={control(PLAYERS.limits)} />
            <Button control={control(PLAYERS.incident)} />
            <Button control={control(PLAYERS.maintenance)} />
          </div>
        </>
      );
    case "host.dashboard.09":
      return null;
    case "host.network.10":
      return <NetworkForm />;
    case "host.dashboard.10":
      return <EmptyCue>{hostCopy.noLogs}</EmptyCue>;
    case "host.dashboard.11":
      return (
        <div className="workspace-row">
          <Button control={control(RECOVERY.backup)} />
          <Button control={control(RECOVERY.restore)} />
          <Button control={control(RECOVERY.rollback)} />
        </div>
      );
    case "host.dashboard.12":
      return (
        <>
          <ControlList control={control(RELEASES)} />
          <EmptyCue>{hostCopy.noReleases}</EmptyCue>
          <div className="workspace-row">
            <Button control={control(RECOVERY.validate)} />
            <Button control={control(RECOVERY.activate)} />
          </div>
        </>
      );
  }
}

/** Host operations: state and Start in the frame row, then one section at a time, chosen from the Operations menu. */
export function HostWorkspace() {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const panelId = useId();
  const [section, setSection] = useState<Section>(SECTIONS[0]);
  const showSection = (next: Section): ActionHandler => () => {
    setSection(next);
    return Promise.resolve(SILENT);
  };
  useMenuOpeners(HOST_OWNER, [DASHBOARD.operations]);
  useIntentRouter(HOST_OWNER, Object.fromEntries(SECTIONS.map((id) => [id, showSection(id)])));
  return (
    <div className="host-workspace">
      <ToolbarSlot>
        <PassiveText control={control(DASHBOARD.status)}>{hostCopy.stopped}</PassiveText>
        <Toolbar described={HOST_BAR}>
          <Button control={control(DASHBOARD.start)} />
        </Toolbar>
      </ToolbarSlot>
      <div className="host-selector">
        <Menu opener={control(DASHBOARD.operations)} items={SECTIONS.map(control)} currentId={section} trailingGlyph={MENU_CARET} />
      </div>
      <div role="region" aria-label={control(section).label} id={panelId} className="host-section">
        <SectionContent section={section} />
      </div>
    </div>
  );
}
