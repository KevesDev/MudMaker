import {
  DEFAULTS_SCHEMA,
  SCOPE_IDS,
  isScopeId,
  type ScopeId,
  type ThemeError,
  type TokenMap,
} from "./types";
import { isRecord, parseTokenLayer, themeError } from "./validate";

export interface PresetDefinition {
  readonly id: string;
  readonly label: string;
  /** Tokens per scope, with the tokens of any scope they inherit (home, host, client) already merged underneath. */
  readonly tokens: Readonly<Record<ScopeId, TokenMap>>;
}

export interface ScopeDefaults {
  readonly presetId: string;
  readonly tokens: TokenMap;
}

export type DefaultsParse =
  | {
      readonly ok: true;
      readonly scopes: Readonly<Record<ScopeId, ScopeDefaults>>;
      readonly presets: readonly PresetDefinition[];
    }
  | { readonly ok: false; readonly errors: readonly ThemeError[] };

interface RawScope {
  readonly inherits: ScopeId | null;
  readonly preset: string | null;
  readonly tokens: TokenMap;
}

interface RawPreset {
  readonly id: string;
  readonly label: string;
  readonly scopes: ReadonlyMap<ScopeId, TokenMap>;
}

function parseRawScope(id: ScopeId, entry: unknown, errors: ThemeError[]): RawScope {
  const field = `scopes.${id}`;
  if (!isRecord(entry)) {
    errors.push(themeError("malformed-document", field, `The defaults for scope "${id}" must be an object.`));
    return { inherits: null, preset: null, tokens: {} };
  }
  const inherits = entry["inherits"];
  let parent: ScopeId | null = null;
  if (inherits !== undefined) {
    if (isScopeId(inherits) && inherits !== id) {
      parent = inherits;
    } else {
      errors.push(
        themeError("unknown-scope", `${field}.inherits`, `Scope "${id}" cannot inherit from ${String(inherits)}.`),
      );
    }
  }
  const preset = entry["preset"];
  if (preset !== undefined && (typeof preset !== "string" || preset === "")) {
    errors.push(themeError("invalid-type", `${field}.preset`, `The preset of scope "${id}" must be a non-empty name.`));
  }
  const layer =
    entry["tokens"] === undefined ? { tokens: {}, errors: [] } : parseTokenLayer(entry["tokens"], `${field}.tokens`);
  errors.push(...layer.errors);
  return { inherits: parent, preset: typeof preset === "string" && preset !== "" ? preset : null, tokens: layer.tokens };
}

function parseRawPresets(presets: unknown, errors: ThemeError[]): RawPreset[] {
  if (!isRecord(presets)) {
    errors.push(themeError("malformed-document", "presets", "The defaults must define presets."));
    return [];
  }
  const result: RawPreset[] = [];
  for (const [id, entry] of Object.entries(presets)) {
    const field = `presets.${id}`;
    if (!isRecord(entry)) {
      errors.push(themeError("malformed-document", field, `Preset "${id}" must be an object.`));
      continue;
    }
    const label = entry["label"];
    if (typeof label !== "string" || label === "") {
      errors.push(themeError("invalid-type", `${field}.label`, `Preset "${id}" needs a display name.`));
      continue;
    }
    const scopes = new Map<ScopeId, TokenMap>();
    const rawScopes = entry["scopes"];
    if (!isRecord(rawScopes)) {
      errors.push(themeError("malformed-document", `${field}.scopes`, `Preset "${id}" must define scopes.`));
      continue;
    }
    for (const [scopeId, scopeEntry] of Object.entries(rawScopes)) {
      if (!isScopeId(scopeId)) {
        errors.push(themeError("unknown-scope", `${field}.scopes.${scopeId}`, `Preset "${id}" names the unknown scope "${scopeId}".`));
        continue;
      }
      const tokens = isRecord(scopeEntry) ? scopeEntry["tokens"] : undefined;
      const layer = parseTokenLayer(tokens, `${field}.scopes.${scopeId}.tokens`);
      errors.push(...layer.errors);
      scopes.set(scopeId, layer.tokens);
    }
    result.push({ id, label, scopes });
  }
  return result;
}

/** Validates the pinned defaults document and flattens each scope's `inherits` chain. */
export function parseThemeDefaults(document: unknown): DefaultsParse {
  if (!isRecord(document)) {
    return {
      ok: false,
      errors: [themeError("malformed-document", "defaults", "The theme defaults must be an object.")],
    };
  }
  const errors: ThemeError[] = [];
  if (document["schema"] !== DEFAULTS_SCHEMA) {
    errors.push(
      themeError("unsupported-schema-version", "schema", `The defaults schema must be "${DEFAULTS_SCHEMA}".`),
    );
  }
  const scopes = document["scopes"];
  if (!isRecord(scopes)) {
    errors.push(themeError("malformed-document", "scopes", "The defaults must define scopes."));
    return { ok: false, errors };
  }
  const raw = new Map<ScopeId, RawScope>();
  for (const id of SCOPE_IDS) raw.set(id, parseRawScope(id, scopes[id], errors));
  const rawPresets = parseRawPresets(document["presets"], errors);

  const flattened = new Map<ScopeId, ScopeDefaults>();
  const flatten = (id: ScopeId, visiting: readonly ScopeId[]): ScopeDefaults | null => {
    const cached = flattened.get(id);
    if (cached) return cached;
    const own = raw.get(id);
    if (!own) return null;
    let inheritedTokens: TokenMap = {};
    let inheritedPreset: string | null = null;
    if (own.inherits !== null) {
      if (visiting.includes(own.inherits)) {
        errors.push(
          themeError("alias-cycle", `scopes.${id}.inherits`, `Scopes inherit from each other in a loop: ${[...visiting, id, own.inherits].join(" to ")}.`),
        );
        return null;
      }
      const parent = flatten(own.inherits, [...visiting, id]);
      if (!parent) return null;
      inheritedTokens = parent.tokens;
      inheritedPreset = parent.presetId;
    }
    const presetId = own.preset ?? inheritedPreset;
    if (presetId === null) {
      errors.push(themeError("invalid-type", `scopes.${id}.preset`, `Scope "${id}" needs a preset name.`));
      return null;
    }
    const result: ScopeDefaults = { presetId, tokens: { ...inheritedTokens, ...own.tokens } };
    flattened.set(id, result);
    return result;
  };

  for (const id of SCOPE_IDS) flatten(id, []);
  const editor = flattened.get("editor");
  const client = flattened.get("client");
  const host = flattened.get("host");
  const home = flattened.get("home");
  if (errors.length > 0 || !editor || !client || !host || !home) return { ok: false, errors };

  const knownPresets = new Set(rawPresets.map((preset) => preset.id));
  for (const id of SCOPE_IDS) {
    const presetId = flattened.get(id)?.presetId;
    if (presetId !== undefined && !knownPresets.has(presetId)) {
      errors.push(themeError("unknown-preset", presetId, `Scope "${id}" uses the preset "${presetId}", which is not defined.`));
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const presets = rawPresets.map((preset): PresetDefinition => {
    const flatTokens = new Map<ScopeId, TokenMap>();
    const tokensFor = (id: ScopeId): TokenMap => {
      const cached = flatTokens.get(id);
      if (cached) return cached;
      const parent = raw.get(id)?.inherits ?? null;
      const merged = { ...(parent === null ? {} : tokensFor(parent)), ...preset.scopes.get(id) };
      flatTokens.set(id, merged);
      return merged;
    };
    return {
      id: preset.id,
      label: preset.label,
      tokens: { editor: tokensFor("editor"), client: tokensFor("client"), host: tokensFor("host"), home: tokensFor("home") },
    };
  });
  return { ok: true, scopes: { editor, client, host, home }, presets };
}
