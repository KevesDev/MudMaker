import { SCOPE_IDS, type ScopeId, type ThemeManager } from "../theme";
import type { UiDiagnostic } from "../ui";
import { PREFERENCES_VERSION, SAVE_DEBOUNCE_MS, SCOPE_NAMESPACE, SHELL_CALL_TIMEOUT_MS, THEME_KEY } from "./prefsConfig";
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
    this.settled = this.serialize(manager);
  }

  /** Saves every later accepted change to any scope. The returned function stops that. */
  bind(manager: ThemeManager): () => void {
    this.manager = manager;
    const stops = SCOPE_IDS.map((scope) => manager.subscribe(scope, () => this.changed()));
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
      this.warn("preferences-write-failed", "Your appearance choice is applied but could not be saved.", describeFailure(failure));
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
