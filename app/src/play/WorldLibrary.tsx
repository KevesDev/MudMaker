import { useEffect, useState, useSyncExternalStore } from "react";
import { ControlList, EmptyCue, PassiveText } from "../workspaces/controlParts";
import { SILENT, useIntentRouter } from "../workspaces/useIntentRouter";
import { Button, Dialog, Dropdown, Switch, TextField, useCommand, useUi, type ActionHandler } from "../ui";
import { matchesQuery, orderProfiles, type ClientProfile, type ClientProfileBook, type ProfileErrors } from "../prefs";
import { PORT_INVALID_MESSAGE, portIsInvalid } from "../workspaces/ports";
import { ADAPTERS, CLIENT_OWNER, LIBRARY } from "./playLayout";
import { playCopy } from "./playCopy";

const BACK_COMMAND = "play.library.back";
const CANCEL_COMMAND = "play.library.cancel";
const SAVE_COMMAND = "play.library.save";
const FAVORITE_COMMAND = "play.library.favorite";
const CONFIRM_DELETE_COMMAND = "play.library.delete.confirm";
const KEEP_COMMAND = "play.library.delete.cancel";
const DEFAULT_ADAPTER = ADAPTERS[0]?.value ?? "";

function ProfileRow({ profile, selected, onSelect }: { readonly profile: ClientProfile; readonly selected: boolean; readonly onSelect: (id: string) => void }) {
  const command = `play.library.select.${profile.id}`;
  useCommand(command, () => onSelect(profile.id));
  return (
    <button type="button" role="option" aria-selected={selected} data-ui-command={command} className="ui-control ui-hit workspace-row play-profile-row">
      <span>{profile.name}</span>
      <span className="workspace-passive">{`${profile.host}:${profile.port}`}</span>
      {profile.tls ? null : <span className="workspace-passive">{playCopy.notEncrypted}</span>}
      {profile.favorite ? <span className="workspace-passive">{playCopy.favorite}</span> : null}
    </button>
  );
}

function FieldError({ message }: { readonly message: string | undefined }) {
  return message === undefined ? null : (
    <span role="alert" className="workspace-error">
      {message}
    </span>
  );
}

/** Saved worlds with a search box, or, once a profile is being added or edited, the compact form for one. */
export function WorldLibrary({ profiles }: { readonly profiles: ClientProfileBook }) {
  const { registry, bus } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const saved = useSyncExternalStore(profiles.subscribe, profiles.getSnapshot);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [tls, setTls] = useState(true);
  const [adapter, setAdapter] = useState(DEFAULT_ADAPTER);
  const [errors, setErrors] = useState<ProfileErrors>({});

  const visible = orderProfiles(saved).filter((profile) => matchesQuery(profile, query));
  const selected = visible.find((profile) => profile.id === selectedId);
  const leaveForm = (): void => {
    setEditing(false);
    setErrors({});
  };
  const openForm = (profile: ClientProfile | undefined): void => {
    setEditingId(profile?.id ?? null);
    setName(profile?.name ?? "");
    setHost(profile?.host ?? "");
    setPort(profile === undefined ? "" : String(profile.port));
    setTls(profile?.tls ?? true);
    setAdapter(profile?.adapter ?? DEFAULT_ADAPTER);
    setErrors({});
    setEditing(true);
  };
  const save = (): void => {
    const result = profiles.save(editingId, { name, adapter, host, port, tls });
    if (result.ok) {
      setSelectedId(result.profile.id);
      leaveForm();
    } else setErrors(result.errors);
  };

  useCommand(BACK_COMMAND, leaveForm);
  useCommand(CANCEL_COMMAND, leaveForm);
  useCommand(SAVE_COMMAND, save);
  useCommand(FAVORITE_COMMAND, () => {
    if (selected !== undefined) profiles.toggleFavorite(selected.id);
  });
  useCommand(KEEP_COMMAND, () => setConfirmingDelete(false));
  useCommand(CONFIRM_DELETE_COMMAND, () => {
    if (selected !== undefined) profiles.remove(selected.id);
    setConfirmingDelete(false);
    setSelectedId(null);
  });

  useEffect(() => {
    if (editing) return;
    for (const id of [LIBRARY.edit, LIBRARY.remove]) {
      if (selected === undefined) bus.setDisabled(id, playCopy.selectFirst);
      else bus.reset(id);
    }
  }, [bus, editing, selected]);

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
      openForm(undefined);
      return Promise.resolve(SILENT);
    },
    [LIBRARY.edit]: () => {
      if (selected !== undefined) openForm(selected);
      return Promise.resolve(SILENT);
    },
    [LIBRARY.remove]: () => {
      if (selected !== undefined) setConfirmingDelete(true);
      return Promise.resolve(SILENT);
    },
    [LIBRARY.tls]: toggleTls,
    [LIBRARY.adapter]: chooseAdapter,
  });

  if (editing) {
    return (
      <div className="play-library play-profile">
        <label className="ui-field">
          <span className="ui-label">{playCopy.name}</span>
          <input type="text" className="ui-control ui-hit ui-input" value={name} aria-invalid={errors.name === undefined ? undefined : true} onChange={(event) => setName(event.currentTarget.value)} />
        </label>
        <FieldError message={errors.name} />
        <Dropdown control={control(LIBRARY.adapter)} options={ADAPTERS} value={adapter} />
        <TextField control={control(LIBRARY.host)} value={host} onValueChange={setHost} />
        <FieldError message={errors.host} />
        <TextField control={control(LIBRARY.port)} value={port} onValueChange={setPort} />
        <FieldError message={portIsInvalid(port) ? PORT_INVALID_MESSAGE : errors.port} />
        <Switch control={control(LIBRARY.tls)} checked={tls} />
        {tls ? null : <PassiveText control={control(LIBRARY.badge)}>{playCopy.notEncrypted}</PassiveText>}
        <div className="workspace-row">
          <button type="button" data-ui-command={SAVE_COMMAND} className="ui-control ui-hit ui-button">
            {playCopy.save}
          </button>
          <button type="button" data-ui-command={CANCEL_COMMAND} className="ui-control ui-hit ui-button">
            {playCopy.cancel}
          </button>
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
      <ControlList control={control(LIBRARY.list)}>
        {visible.map((profile) => (
          <ProfileRow key={profile.id} profile={profile} selected={profile.id === selected?.id} onSelect={setSelectedId} />
        ))}
      </ControlList>
      {saved.length === 0 ? <EmptyCue>{playCopy.noWorlds}</EmptyCue> : null}
      <div className="workspace-row">
        <Button control={control(LIBRARY.edit)} />
        <Button control={control(LIBRARY.remove)} />
        <button type="button" data-ui-command={FAVORITE_COMMAND} aria-disabled={selected === undefined ? true : undefined} className="ui-control ui-hit ui-button">
          {selected?.favorite === true ? playCopy.unfavorite : playCopy.favorite}
        </button>
        <Button control={control(LIBRARY.connect)} />
      </div>
      <Dialog open={confirmingDelete && selected !== undefined} title={playCopy.deleteTitle(selected?.name ?? "")} description={playCopy.deleteDescription} destructive closeButton={false} onClose={() => setConfirmingDelete(false)}>
        <div className="workspace-row">
          <button type="button" data-ui-command={CONFIRM_DELETE_COMMAND} className="ui-control ui-hit ui-button">
            {playCopy.deleteConfirm}
          </button>
          <button type="button" data-ui-command={KEEP_COMMAND} className="ui-control ui-hit ui-button">
            {playCopy.cancel}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
