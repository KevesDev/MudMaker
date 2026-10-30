import { useState } from "react";
import { ControlList, EmptyCue, PassiveText } from "../workspaces/controlParts";
import { SILENT, useIntentRouter } from "../workspaces/useIntentRouter";
import { Button, Dropdown, Switch, TextField, useCommand, useUi, type ActionHandler } from "../ui";
import { PORT_INVALID_MESSAGE, portIsInvalid } from "../workspaces/ports";
import { ADAPTERS, CLIENT_OWNER, LIBRARY } from "./playLayout";
import { playCopy } from "./playCopy";

const BACK_COMMAND = "play.library.back";
const DEFAULT_ADAPTER = ADAPTERS[0]?.value ?? "";

/** Saved worlds with a search box, or, once a profile is being added, the compact form for one. */
export function WorldLibrary() {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [tls, setTls] = useState(true);
  const [adapter, setAdapter] = useState(DEFAULT_ADAPTER);
  useCommand(BACK_COMMAND, () => setEditing(false));

  const toggleTls: ActionHandler = ({ value }) => {
    if (typeof value !== "boolean") return Promise.resolve({ status: "validation-error", code: "tls-toggle-invalid", message: playCopy.invalidToggle });
    setTls(value);
    return Promise.resolve(SILENT);
  };
  const chooseAdapter: ActionHandler = ({ value }) => {
    if (typeof value !== "string" || !ADAPTERS.some((option) => option.value === value)) {
      return Promise.resolve({ status: "validation-error", code: "adapter-invalid", message: playCopy.invalidChoice });
    }
    setAdapter(value);
    return Promise.resolve(SILENT);
  };
  useIntentRouter(CLIENT_OWNER, {
    [LIBRARY.add]: () => {
      setHost("");
      setPort("");
      setTls(true);
      setAdapter(DEFAULT_ADAPTER);
      setEditing(true);
      return Promise.resolve(SILENT);
    },
    [LIBRARY.tls]: toggleTls,
    [LIBRARY.adapter]: chooseAdapter,
  });

  if (editing) {
    return (
      <div className="play-library play-profile">
        <Dropdown control={control(LIBRARY.adapter)} options={ADAPTERS} value={adapter} />
        <TextField control={control(LIBRARY.host)} value={host} onValueChange={setHost} />
        <TextField control={control(LIBRARY.port)} value={port} onValueChange={setPort} />
        {portIsInvalid(port) ? (
          <span role="alert" className="workspace-error">
            {PORT_INVALID_MESSAGE}
          </span>
        ) : null}
        <Switch control={control(LIBRARY.tls)} checked={tls} />
        {tls ? null : <PassiveText control={control(LIBRARY.badge)}>{playCopy.notEncrypted}</PassiveText>}
        <div className="workspace-row">
          <Button control={control(LIBRARY.test)} />
          <Button control={control(LIBRARY.connect)} />
          <button type="button" data-ui-command={BACK_COMMAND} className="ui-control ui-hit ui-button">
            {playCopy.back}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="play-library">
      <div className="workspace-row">
        <TextField control={control(LIBRARY.search)} value={query} onValueChange={setQuery} type="search" />
        <Button control={control(LIBRARY.add)} />
      </div>
      <ControlList control={control(LIBRARY.list)} />
      <EmptyCue>{playCopy.noWorlds}</EmptyCue>
      <div className="workspace-row">
        <Button control={control(LIBRARY.edit)} />
        <Button control={control(LIBRARY.remove)} />
        <Button control={control(LIBRARY.connect)} />
      </div>
    </div>
  );
}
