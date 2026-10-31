import { parseThemeDefaults } from "./defaults";
import { resolveTokens } from "./resolve";
import {
  DEFAULT_ACCESSIBILITY,
  SCOPE_IDS,
  ThemeDefaultsError,
  isScopeId,
  type AccessibilitySettings,
  type PresetSummary,
  type ResolvedTheme,
  type ScopeId,
  type ThemeError,
  type ThemeInputs,
  type ThemeResult,
  type TokenMap,
} from "./types";
import { parseTokenLayer, parseUserTheme, themeError, validateAccessibility } from "./validate";

type Listener = () => void;

interface ScopeState {
  readonly defaultTokens: TokenMap;
  readonly presetTokens: ReadonlyMap<string, TokenMap>;
  inputs: ThemeInputs;
  snapshot: ResolvedTheme;
  committedSnapshot: ResolvedTheme | null;
  readonly listeners: Set<Listener>;
}

const NO_TOKENS: TokenMap = Object.freeze({});

/**
 * Sole owner of theme resolution and atomic app-wide appearance changes.
 * Scopes retain their semantic tokens and accessibility inputs.
 */
export class ThemeManager {
  private readonly scopes: Readonly<Record<ScopeId, ScopeState>>;
  private readonly presets: readonly PresetSummary[];

  /** Throws ThemeDefaultsError when the pinned defaults do not satisfy the schema. */
  constructor(defaults: unknown) {
    const parsed = parseThemeDefaults(defaults);
    if (!parsed.ok) throw new ThemeDefaultsError(parsed.errors);
    this.presets = Object.freeze(parsed.presets.map((preset) => Object.freeze({ id: preset.id, label: preset.label })));
    const build = (scope: ScopeId): ScopeState => {
      const entry = parsed.scopes[scope];
      const presetTokens = new Map<string, TokenMap>();
      const problems: ThemeError[] = [];
      for (const preset of parsed.presets) {
        const tokens = preset.tokens[scope];
        const check = resolveTokens(entry.tokens, [tokens], DEFAULT_ACCESSIBILITY);
        if (check.ok) presetTokens.set(preset.id, tokens);
        else problems.push(...check.errors);
      }
      if (problems.length > 0) throw new ThemeDefaultsError(problems);
      const inputs: ThemeInputs = {
        presetId: entry.presetId,
        userTheme: null,
        overrides: NO_TOKENS,
        accessibility: DEFAULT_ACCESSIBILITY,
      };
      const resolved = resolveTokens(entry.tokens, [presetTokens.get(entry.presetId) ?? NO_TOKENS], inputs.accessibility);
      if (!resolved.ok) throw new ThemeDefaultsError(resolved.errors);
      return {
        defaultTokens: entry.tokens,
        presetTokens,
        inputs,
        snapshot: this.freezeSnapshot(scope, entry.presetId, 1, inputs.accessibility, resolved.tokens),
        committedSnapshot: null,
        listeners: new Set(),
      };
    };
    this.scopes = {
      editor: build("editor"),
      client: build("client"),
      host: build("host"),
      home: build("home"),
    };
  }

  getSnapshot(scope: ScopeId): ResolvedTheme {
    return this.stateOf(scope).snapshot;
  }

  /** The preset, user theme, overrides and accessibility choices the scope currently resolves from. */
  getInputs(scope: ScopeId): ThemeInputs {
    return this.stateOf(scope).inputs;
  }

  /** Editable values before accessibility adjustments, keeping aliases intact. */
  getEditableTokens(scope: ScopeId): TokenMap {
    const state = this.stateOf(scope);
    const inputs = state.inputs;
    return Object.freeze({ ...state.defaultTokens, ...state.presetTokens.get(inputs.presetId), ...inputs.userTheme?.tokens, ...inputs.overrides });
  }

  /** Validates and displays a custom draft without changing the committed inputs. */
  previewCustomTheme(scope: ScopeId, theme: unknown): ThemeResult {
    return this.applyCustomTheme(scope, theme, true);
  }

  /** Commits the custom document atomically, absorbing the old overrides into its editable values. */
  saveCustomTheme(scope: ScopeId, theme: unknown): ThemeResult {
    return this.applyCustomTheme(scope, theme, false);
  }

  cancelPreview(scope: ScopeId): void {
    this.stateOf(scope);
    const changed = SCOPE_IDS.map((id) => this.scopes[id]).filter((state) => state.committedSnapshot !== null);
    for (const state of changed) {
      state.snapshot = state.committedSnapshot as ResolvedTheme;
      state.committedSnapshot = null;
    }
    this.notifyAll(changed);
  }

  private applyCustomTheme(scope: ScopeId, theme: unknown, preview: boolean): ThemeResult {
    const parsed = parseUserTheme(theme);
    if (!parsed.theme || parsed.errors.length > 0) return { ok: false, errors: parsed.errors };
    const original = this.getEditableTokens(scope);
    const changes = Object.entries(parsed.theme.tokens).filter(([name, value]) => original[name] !== value);
    const document = parsed.theme;
    return this.applyMany(SCOPE_IDS.map((id) => {
      const editable = this.getEditableTokens(id);
      const applicable = Object.fromEntries(changes.filter(([name]) => Object.hasOwn(editable, name)));
      return [id, { ...this.scopes[id].inputs, userTheme: { ...document, tokens: { ...editable, ...applicable } }, overrides: NO_TOKENS }] as const;
    }), preview, scope);
  }

  /** Chooses one bundled theme for the entire app, with no observable partial update. */
  selectApplicationPreset(presetId: string, resetCustom = true): ThemeResult {
    if (!this.presets.some((preset) => preset.id === presetId)) return { ok: false, errors: [themeError("unknown-preset", String(presetId), `There is no built-in preset named "${String(presetId)}".`)] };
    return this.applyMany(SCOPE_IDS.map((scope) => [scope, { ...this.scopes[scope].inputs, presetId, ...(resetCustom ? { userTheme: null, overrides: NO_TOKENS } : {}) }] as const), false, "home");
  }

  /** Listeners are notified once per accepted change to this scope, never for rejected input. */
  subscribe(scope: ScopeId, listener: Listener): () => void {
    const { listeners } = this.stateOf(scope);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  listPresets(): readonly PresetSummary[] {
    return this.presets;
  }

  /** Chooses the built-in preset that sits between the application defaults and the user theme. */
  selectPreset(scope: ScopeId, presetId: string, resetCustom = false): ThemeResult {
    const known = this.presets.some((preset) => preset.id === presetId);
    const errors = known
      ? []
      : [themeError("unknown-preset", String(presetId), `There is no built-in preset named "${String(presetId)}".`)];
    return this.apply(scope, (inputs) => ({ ...inputs, presetId, ...(resetCustom ? { userTheme: null, overrides: NO_TOKENS } : {}) }), errors);
  }

  /** Selects a user theme document, or clears the selection with null. */
  setUserTheme(scope: ScopeId, theme: unknown): ThemeResult {
    if (theme === null) return this.apply(scope, (inputs) => ({ ...inputs, userTheme: null }), []);
    const parsed = parseUserTheme(theme);
    return this.apply(scope, (inputs) => ({ ...inputs, userTheme: parsed.theme }), parsed.errors);
  }

  /** Replaces the explicit token overrides for the scope; an empty object clears them. */
  setOverrides(scope: ScopeId, tokens: unknown): ThemeResult {
    const parsed = parseTokenLayer(tokens, "overrides");
    return this.apply(scope, (inputs) => ({ ...inputs, overrides: parsed.tokens }), parsed.errors);
  }

  setAccessibility(scope: ScopeId, settings: AccessibilitySettings): ThemeResult {
    const frozen: AccessibilitySettings = { ...settings };
    return this.apply(scope, (inputs) => ({ ...inputs, accessibility: frozen }), validateAccessibility(settings));
  }

  private stateOf(scope: ScopeId): ScopeState {
    if (!isScopeId(scope)) throw new RangeError(`Unknown theme scope "${String(scope)}".`);
    return this.scopes[scope];
  }

  private apply(
    scope: ScopeId,
    change: (inputs: ThemeInputs) => ThemeInputs,
    inputErrors: readonly ThemeError[],
    preview = false,
  ): ThemeResult {
    if (!isScopeId(scope)) {
      return {
        ok: false,
        errors: [themeError("unknown-scope", "scope", `Theme scope "${String(scope)}" does not exist.`)],
      };
    }
    if (inputErrors.length > 0) return { ok: false, errors: inputErrors };
    return this.applyMany([[scope, change(this.scopes[scope].inputs)]], preview, scope);
  }

  private applyMany(changes: readonly (readonly [ScopeId, ThemeInputs])[], preview: boolean, resultScope: ScopeId): ThemeResult {
    const staged: { state: ScopeState; inputs: ThemeInputs; snapshot: ResolvedTheme }[] = [];
    const errors: ThemeError[] = [];
    for (const [scope, inputs] of changes) {
      const state = this.scopes[scope];
      const resolved = resolveTokens(state.defaultTokens, [state.presetTokens.get(inputs.presetId) ?? NO_TOKENS, inputs.userTheme?.tokens ?? NO_TOKENS, inputs.overrides], inputs.accessibility);
      if (!resolved.ok) errors.push(...resolved.errors);
      else staged.push({ state, inputs, snapshot: this.freezeSnapshot(scope, inputs.userTheme?.id ?? inputs.presetId, state.snapshot.revision + 1, inputs.accessibility, resolved.tokens) });
    }
    if (errors.length > 0) return { ok: false, errors: [...new Map(errors.map((error) => [`${error.code}\u0000${error.token}\u0000${error.sourceToken ?? ""}\u0000${error.message}`, error])).values()] };
    for (const { state, inputs, snapshot } of staged) {
      if (preview) state.committedSnapshot ??= state.snapshot;
      else { state.inputs = inputs; state.committedSnapshot = null; }
      state.snapshot = snapshot;
    }
    this.notifyAll(staged.map(({ state }) => state));
    return { ok: true, theme: this.scopes[resultScope].snapshot };
  }

  private notifyAll(states: readonly ScopeState[]): void {
    const failures: unknown[] = [];
    for (const state of states) { try { this.notify(state); } catch (failure) { failures.push(failure); } }
    if (failures.length > 0) throw failures[0];
  }

  private freezeSnapshot(
    scope: ScopeId,
    themeId: string,
    revision: number,
    accessibility: AccessibilitySettings,
    tokens: TokenMap,
  ): ResolvedTheme {
    return Object.freeze({
      scope,
      themeId,
      revision,
      accessibility: Object.freeze({ ...accessibility }),
      tokens: Object.freeze({ ...tokens }),
    });
  }

  /** Every listener runs even when one throws; the first failure is rethrown afterwards. */
  private notify(state: ScopeState): void {
    const failures: unknown[] = [];
    for (const listener of [...state.listeners]) {
      try {
        listener();
      } catch (failure) {
        failures.push(failure);
      }
    }
    if (failures.length > 0) throw failures[0];
  }
}
