import { useEffect, useMemo, useState } from "react";
import { actionIdOf } from "../frame/frameActions";
import { SHELL_ROUTER_OWNER } from "../nav/ShellRouter";
import { Button, Dialog, Dropdown, TextField, useLatest, useUi, type ActionHandler } from "../ui";
import { ThemeSchema } from "./schema";
import { parseHexColor } from "./color";
import { THEME_EDITOR, THEME_TOKEN_CONTROLS, themeTokenControl } from "./themeEditorControls";
import type { ThemeManager } from "./ThemeManager";
import { USER_THEME_SCHEMA, type ScopeId, type ThemeError, type TokenMap } from "./types";

function draftTokens(draft: Readonly<Record<string, string>>): TokenMap {
  return Object.fromEntries(Object.entries(draft).map(([name, text]) => {
    const kind = ThemeSchema.describeToken(name)?.type.kind;
    if (text.startsWith("{")) return [name, text];
    if (kind === "boolean") return [name, text === "true" ? true : text === "false" ? false : text];
    if (["number", "integer", "length", "duration"].includes(kind ?? "")) return [name, text.trim() === "" ? text : Number.isFinite(Number(text)) ? Number(text) : text];
    return [name, text];
  }));
}

/** Only the unsaved form belongs here. All actual token validation, preview and commit belongs to ThemeManager. */
export function ThemeEditor({ manager, scope, onClose }: { readonly manager: ThemeManager; readonly scope: ScopeId; readonly onClose: () => void }) {
  const { registry, bus } = useUi();
  const [initial] = useState(() => manager.getEditableTokens(scope));
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(initial).map(([name, value]) => [name, String(value)])));
  const [errors, setErrors] = useState<readonly ThemeError[]>([]);
  const groups = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const name of Object.keys(initial).sort()) {
      const namespace = name.slice(0, name.lastIndexOf("."));
      grouped.set(namespace, [...(grouped.get(namespace) ?? []), name]);
    }
    return [...grouped];
  }, [initial]);
  const close = () => { manager.cancelPreview(scope); onClose(); };
  const latest = useLatest({ draft, close });
  useEffect(() => () => manager.cancelPreview(scope), [manager, scope]);
  useEffect(() => {
    const apply = (save: boolean): ActionHandler => async () => {
      const document = { schema: USER_THEME_SCHEMA, id: manager.getInputs(scope).userTheme?.id ?? `custom-${scope}`, tokens: draftTokens(latest.current.draft) };
      const result = save ? manager.saveCustomTheme(scope, document) : manager.previewCustomTheme(scope, document);
      setErrors(result.ok ? [] : result.errors);
      if (result.ok && save) latest.current.close();
      if (!result.ok) return { status: "validation-error", code: result.errors[0]?.code ?? "theme-invalid", message: result.errors.map((error) => error.message).join(" ") };
      return { status: "success", message: "" };
    };
    const removers = [
      bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, THEME_EDITOR.preview), apply(false)),
      bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, THEME_EDITOR.save), apply(true)),
      bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, THEME_EDITOR.cancel), async () => { latest.current.close(); return { status: "success", message: "" }; }),
      bus.registerHandler(SHELL_ROUTER_OWNER, "ui.settings.appearance.editToken", async ({ controlId, value }) => {
        const field = THEME_TOKEN_CONTROLS.find((entry) => entry.id === controlId);
        if (field !== undefined && value !== undefined) setDraft((current) => ({ ...current, [field.label]: String(value) }));
        return { status: "success", message: "" };
      }),
    ];
    const stop = bus.subscribe(() => {
      for (const id of [THEME_EDITOR.preview, THEME_EDITOR.save, THEME_EDITOR.cancel]) {
        if (bus.getRuntime(id).state === "success") bus.reset(id);
      }
    });
    return () => { stop(); for (const remove of removers) remove(); };
  }, [manager, scope, bus, registry, latest]);

  return <Dialog open title={registry.requireControl(THEME_EDITOR.customize).label} closeButton={false} onClose={close}>
    <div className="theme-editor-fields">
      {groups.map(([namespace, names]) => <fieldset key={namespace} className="theme-editor-group"><legend>{namespace}</legend>
        {names.map((name) => {
          const control = registry.requireControl(themeTokenControl(name));
          const type = ThemeSchema.describeToken(name)?.type;
          const value = draft[name] ?? "";
          const error = errors.filter((entry) => (entry.sourceToken ?? entry.token) === name).map((entry) => entry.message).join(" ") || undefined;
          if (type?.kind === "enum" || type?.kind === "boolean") {
            const values = type.kind === "enum" ? type.values : ["true", "false"];
            return <div key={name}><Dropdown control={control} value={value} options={[...new Set([...values, ...(value.startsWith("{") ? [value] : [])])].map((entry) => ({ value: entry, label: entry }))} />{error === undefined ? null : <span role="alert" className="ui-state-text" data-state="validation-error">{error}</span>}</div>;
          }
          const numeric = type !== undefined && ["number", "integer", "length", "duration"].includes(type.kind);
          const resolved = manager.getSnapshot(scope).tokens[name];
          return <TextField key={name} control={control} value={value} onValueChange={(text) => setDraft((current) => ({ ...current, [name]: text }))} inputMode={numeric ? "decimal" : "text"} {...(error === undefined ? {} : { error })} {...(type?.kind === "color" && typeof resolved === "string" ? { colorPickerValue: parseHexColor(value) === null ? resolved : value } : {})} />;
        })}
      </fieldset>)}
      {errors.filter((error) => !Object.hasOwn(initial, error.sourceToken ?? error.token)).map((error) => <span role="alert" key={`${error.code}.${error.token}`} className="ui-state-text" data-state="validation-error">{error.message}</span>)}
    </div>
    <div className="theme-editor-actions">{[THEME_EDITOR.preview, THEME_EDITOR.save, THEME_EDITOR.cancel].map((id) => <Button key={id} control={registry.requireControl(id)} showState={false} />)}</div>
  </Dialog>;
}
