import { parseThemeDefaults } from "./defaults";
import { resolveTokens } from "./resolve";
import {
  DEFAULT_ACCESSIBILITY,
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
  readonly listeners: Set<Listener>;
}

const NO_TOKENS: TokenMap = Object.freeze({});

/**
 * Sole owner of theme resolution. Each scope keeps its own preset, user theme, overrides
 * and accessibility inputs; scopes share only the application defaults they inherit.
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
  selectPreset(scope: ScopeId, presetId: string): ThemeResult {
    const known = this.presets.some((preset) => preset.id === presetId);
    const errors = known
      ? []
      : [themeError("unknown-preset", String(presetId), `There is no built-in preset named "${String(presetId)}".`)];
    return this.apply(scope, (inputs) => ({ ...inputs, presetId }), errors);
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
  ): ThemeResult {
    if (!isScopeId(scope)) {
      return {
        ok: false,
        errors: [themeError("unknown-scope", "scope", `Theme scope "${String(scope)}" does not exist.`)],
      };
    }
    if (inputErrors.length > 0) return { ok: false, errors: inputErrors };
    const state = this.scopes[scope];
    const next = change(state.inputs);
    const resolved = resolveTokens(
      state.defaultTokens,
      [state.presetTokens.get(next.presetId) ?? NO_TOKENS, next.userTheme?.tokens ?? NO_TOKENS, next.overrides],
      next.accessibility,
    );
    if (!resolved.ok) return resolved;
    state.inputs = next;
    state.snapshot = this.freezeSnapshot(
      scope,
      next.userTheme?.id ?? next.presetId,
      state.snapshot.revision + 1,
      next.accessibility,
      resolved.tokens,
    );
    this.notify(state);
    return { ok: true, theme: state.snapshot };
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
