import { SCOPE_IDS, USER_THEME_SCHEMA, type ScopeId, type ThemeManager } from "../theme";
import type { UiDiagnostic } from "../ui";
import type { ClientProfileBook } from "./ClientProfileBook";
import { APPEARANCE_KEY, APPEARANCE_VERSION, LEGACY_THEMES_KEY, PREFERENCES_VERSION, PROFILES_KEY, SAVE_DEBOUNCE_MS, SCOPE_NAMESPACE, SHELL_CALL_TIMEOUT_MS, THEME_KEY } from "./prefsConfig";
import { applyPreference, preferenceOf } from "./themePreference";

export type PreferencesDocument = Readonly<Record<string, unknown>> & { readonly version: number };

/** The shell calls that reach the file; the store is the only caller. */
export interface PreferencesBridge {
  readonly read: () => Promise<unknown>;
  readonly write: (document: PreferencesDocument) => Promise<void>;
}

export interface PreferencesOptions {
  readonly bridge: PreferencesBridge;
  readonly report: (record: UiDiagnostic) => void;
  /** The saved world profiles, kept in the client namespace beside its appearance. */
  readonly profiles: ClientProfileBook;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

function describeFailure(failure: unknown): { readonly code: string; readonly detail: string } {
  if (isRecord(failure) && typeof failure["code"] === "string") {
    return { code: failure["code"], detail: typeof failure["message"] === "string" ? failure["message"] : "" };
  }
  return { code: "preferences_failed", detail: failure instanceof Error ? failure.message : String(failure) };
}

/** Rejects when the shell does not answer in time, so a call that never settles cannot block saving or startup. */
function withinTimeout<T>(call: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`The shell did not answer within ${SHELL_CALL_TIMEOUT_MS} ms.`)), SHELL_CALL_TIMEOUT_MS);
    call.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (failure: unknown) => {
        clearTimeout(timer);
        reject(failure);
      },
    );
  });
}

/**
 * The only reader and writer of the preferences file. It restores each scope's appearance through the
 * ThemeManager's own validation, then saves every accepted change: debounced, one write in flight, last value wins.
 */
export class PreferencesStore {
  private readonly bridge: PreferencesBridge;
  private readonly report: (record: UiDiagnostic) => void;
  private readonly profiles: ClientProfileBook;
  /** The last document read, kept so saving does not drop namespaces or keys this build does not own. */
  private base: Readonly<Record<string, unknown>> = {};
  private manager: ThemeManager | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private writing = false;
  private changedWhileWriting = false;
  /** The text of the last document written or read, so a notification that changed nothing writes nothing. */
  private settled = "";

  constructor(options: PreferencesOptions) {
    this.bridge = options.bridge;
    this.report = options.report;
    this.profiles = options.profiles;
  }

  /** Applies the saved appearance to every scope. Never throws: anything unusable is reported and the defaults stay. */
  async restore(manager: ThemeManager): Promise<void> {
    let document: unknown;
    try {
      document = await withinTimeout(this.bridge.read());
    } catch (failure) {
      this.warn("preferences-read-failed", "Saved settings could not be read, so MudMaker started with its defaults.", describeFailure(failure));
      return;
    }
    if (document === null || document === undefined) {
      this.settled = this.serialize(manager);
      return;
    }
    if (!isRecord(document) || document["version"] !== PREFERENCES_VERSION) {
      this.warn("preferences-invalid", "Saved settings could not be used, so MudMaker started with its defaults.", { code: "preferences-invalid", detail: "The document has no usable version." });
      return;
    }
    this.base = document;
    for (const scope of SCOPE_IDS) this.restoreScope(manager, scope, document);
    this.restoreAppearance(manager, document);
    this.restoreProfiles(document);
    this.settled = this.serialize(manager);
  }

  private restoreAppearance(manager: ThemeManager, document: Readonly<Record<string, unknown>>): void {
    const globalValue = document[SCOPE_NAMESPACE.home];
    const global = isRecord(globalValue) ? globalValue : {};
    const saved = global[APPEARANCE_KEY];
    const known = (id: unknown): id is string => typeof id === "string" && manager.listPresets().some((preset) => preset.id === id);
    if (isRecord(saved) && saved["version"] === APPEARANCE_VERSION && known(saved["presetId"])) {
      const result = manager.selectApplicationPreset(saved["presetId"], false);
      if (!result.ok) this.warn("preferences-appearance-rejected", "Saved appearance could not be applied.", { code: "preferences-appearance-rejected", detail: result.errors.map((error) => error.message).join(" ") });
      return;
    }
    const priority: readonly ScopeId[] = ["home", "editor", "client", "host"];
    const legacy = Object.fromEntries(priority.flatMap((scope) => {
      const namespace = document[SCOPE_NAMESPACE[scope]];
      return isRecord(namespace) && namespace[THEME_KEY] !== undefined ? [[scope, namespace[THEME_KEY]]] : [];
    }));
    if (Object.keys(legacy).length > 0 && global[LEGACY_THEMES_KEY] === undefined) {
      this.base = { ...this.base, [SCOPE_NAMESPACE.home]: { ...global, [LEGACY_THEMES_KEY]: { version: APPEARANCE_VERSION, themes: legacy } } };
    }
    const source = priority.find((scope) => isRecord(legacy[scope]) && known(legacy[scope]["presetId"])) ?? "home";
    const inputs = manager.getInputs(source);
    const editable = manager.getEditableTokens(source);
    const disagrees = priority.some((scope) => isRecord(legacy[scope]) && legacy[scope]["presetId"] !== undefined && legacy[scope]["presetId"] !== inputs.presetId);
    const otherCustom = priority.some((scope) => scope !== source && isRecord(legacy[scope]) && (legacy[scope]["userTheme"] != null || (isRecord(legacy[scope]["overrides"]) && Object.keys(legacy[scope]["overrides"]).length > 0)));
    if (disagrees || otherCustom || saved !== undefined) this.warn("preferences-appearance-reconciled", "Saved appearance choices were combined for the whole app.", { code: "preferences-appearance-reconciled", detail: `Using ${source}: ${inputs.presetId}; original scoped theme data is retained in ${LEGACY_THEMES_KEY}.` });
    const selected = manager.selectApplicationPreset(inputs.presetId);
    if (!selected.ok) return;
    if (inputs.userTheme !== null || Object.keys(inputs.overrides).length > 0) {
      const result = manager.saveCustomTheme(source, { schema: USER_THEME_SCHEMA, id: inputs.userTheme?.id ?? `custom-${source}`, tokens: editable });
      if (!result.ok) this.warn("preferences-custom-rejected", "Saved custom appearance could not be applied.", { code: "preferences-custom-rejected", detail: result.errors.map((error) => error.message).join(" ") });
    }
  }

  /** Saves every later accepted change to any scope. The returned function stops that. */
  bind(manager: ThemeManager): () => void {
    this.manager = manager;
    const stops = [...SCOPE_IDS.map((scope) => {
      let committed = manager.getInputs(scope);
      return manager.subscribe(scope, () => {
        const next = manager.getInputs(scope);
        if (next === committed) return;
        committed = next;
        this.changed();
      });
    }), this.profiles.subscribe(() => this.changed())];
    return () => {
      for (const stop of stops) stop();
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      this.manager = null;
    };
  }

  private restoreScope(manager: ThemeManager, scope: ScopeId, document: Readonly<Record<string, unknown>>): void {
    const namespace = document[SCOPE_NAMESPACE[scope]];
    const saved = isRecord(namespace) ? namespace[THEME_KEY] : undefined;
    if (saved === undefined) return;
    for (const rejection of applyPreference(manager, scope, saved)) {
      this.warn("preferences-value-rejected", "A saved appearance choice could not be used, so the previous one stays.", {
        code: "preferences-value-rejected",
        detail: `${SCOPE_NAMESPACE[scope]} ${rejection.field}: ${rejection.message}`,
      });
    }
  }

  private restoreProfiles(document: Readonly<Record<string, unknown>>): void {
    const namespace = document[SCOPE_NAMESPACE.client];
    const rejections = this.profiles.load(isRecord(namespace) ? namespace[PROFILES_KEY] : undefined);
    for (const rejection of rejections) {
      this.warn("preferences-profile-dropped", "A saved world could not be used and was left out.", {
        code: "preferences-profile-dropped",
        detail: `${SCOPE_NAMESPACE.client} ${PROFILES_KEY}[${rejection.index}]: ${rejection.reason}`,
      });
    }
  }

  private serialize(manager: ThemeManager): string {
    return JSON.stringify(this.build(manager));
  }

  private build(manager: ThemeManager): PreferencesDocument {
    const document: Record<string, unknown> = { ...this.base, version: PREFERENCES_VERSION };
    for (const scope of SCOPE_IDS) {
      const key = SCOPE_NAMESPACE[scope];
      const current = document[key];
      document[key] = { ...(isRecord(current) ? current : {}), [THEME_KEY]: preferenceOf(manager.getInputs(scope)) };
    }
    const client = document[SCOPE_NAMESPACE.client];
    const global = document[SCOPE_NAMESPACE.home];
    document[SCOPE_NAMESPACE.home] = { ...(isRecord(global) ? global : {}), [APPEARANCE_KEY]: { version: APPEARANCE_VERSION, presetId: manager.getInputs("home").presetId } };
    document[SCOPE_NAMESPACE.client] = { ...(isRecord(client) ? client : {}), [PROFILES_KEY]: this.profiles.getSnapshot() };
    return document as PreferencesDocument;
  }

  private changed(): void {
    if (this.writing) {
      this.changedWhileWriting = true;
      return;
    }
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  /** Writes the value current now, so the last choice wins. A failure is logged and never interrupts the screen. */
  private async flush(): Promise<void> {
    const manager = this.manager;
    if (manager === null || this.writing) return;
    const document = this.build(manager);
    const text = JSON.stringify(document);
    if (text === this.settled) return;
    this.writing = true;
    try {
      await withinTimeout(this.bridge.write(document));
      this.settled = text;
      this.base = document;
    } catch (failure) {
      this.warn("preferences-write-failed", "Your change is applied but could not be saved.", describeFailure(failure));
    } finally {
      this.writing = false;
    }
    if (this.changedWhileWriting) {
      this.changedWhileWriting = false;
      this.changed();
    }
  }

  private warn(code: string, message: string, failure: { readonly code: string; readonly detail: string }): void {
    this.report({
      severity: "warning",
      code,
      actionId: null,
      controlId: null,
      message,
      detail: failure.code === code ? failure.detail : `${failure.code}: ${failure.detail}`,
      correlation: {},
    });
  }
}
