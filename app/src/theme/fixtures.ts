import defaultsDocument from "../../../contracts/ui/v1/theme-defaults.v1.json";
import type { TokenValue } from "./types";

/** Test-only helpers: expected values are read straight from the pinned JSON, not from the library. */

export type TokenRecord = Record<string, TokenValue>;
export type RootScope = "editor" | "client";

const document: unknown = defaultsDocument;

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Fixture path ${path} is not an object`);
  }
  return Object.fromEntries(Object.entries(value));
}

function tokenRecord(value: unknown, path: string): TokenRecord {
  const result: TokenRecord = {};
  for (const [name, entry] of Object.entries(recordAt(value, path))) {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      result[name] = entry;
    } else {
      throw new Error(`Fixture token ${name} has an unsupported value`);
    }
  }
  return result;
}

function scopesSection(): Record<string, unknown> {
  return recordAt(recordAt(document, "root")["scopes"], "scopes");
}

function presetsSection(): Record<string, unknown> {
  return recordAt(recordAt(document, "root")["presets"], "presets");
}

/** The scope a root scope inherits from in the pinned file, or null when it stands alone. */
export function fixtureParent(scope: RootScope): RootScope | null {
  const parent = recordAt(scopesSection()[scope], scope)["inherits"];
  if (parent === undefined) return null;
  if (parent === "editor" || parent === "client") return parent;
  throw new Error(`Fixture scope ${scope} inherits from an unsupported scope`);
}

/** Application defaults of a scope before any preset is applied, with inherited defaults underneath. */
export function fixtureBaseTokens(scope: RootScope): TokenRecord {
  const parent = fixtureParent(scope);
  const own = tokenRecord(recordAt(scopesSection()[scope], scope)["tokens"], `${scope}.tokens`);
  return parent === null ? own : { ...fixtureBaseTokens(parent), ...own };
}

export function fixturePresetIds(): string[] {
  return Object.keys(presetsSection());
}

export function fixtureDefaultPresetId(scope: RootScope = "editor"): string {
  const preset = recordAt(scopesSection()[scope], scope)["preset"];
  if (typeof preset !== "string") throw new Error(`Fixture default preset for ${scope} is missing`);
  return preset;
}

export function fixturePresetLabel(presetId: string): string {
  const label = recordAt(presetsSection()[presetId], presetId)["label"];
  if (typeof label !== "string") throw new Error(`Fixture preset ${presetId} has no label`);
  return label;
}

/** Tokens a preset supplies for a scope, with the inherited scope's preset tokens underneath, without application defaults. */
export function fixturePresetTokens(presetId: string, scope: RootScope): TokenRecord {
  const parent = fixtureParent(scope);
  const scopes = recordAt(recordAt(presetsSection()[presetId], presetId)["scopes"], `${presetId}.scopes`);
  const own = tokenRecord(recordAt(scopes[scope], `${presetId}.${scope}`)["tokens"], `${presetId}.${scope}.tokens`);
  return parent === null ? own : { ...fixturePresetTokens(presetId, parent), ...own };
}

/** Tokens a scope resolves to with the given preset and no user layers. */
export function fixtureTokens(scope: RootScope, presetId: string = fixtureDefaultPresetId(scope)): TokenRecord {
  return { ...fixtureBaseTokens(scope), ...fixturePresetTokens(presetId, scope) };
}

export function fixtureDocument(): unknown {
  return document;
}

/** Independent WCAG 2.x contrast formula, written separately from the library implementation. */
export function wcagRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
    const [red, green, blue] = channels.map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
    );
    return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function stringToken(tokens: Readonly<Record<string, TokenValue>>, name: string): string {
  const value = tokens[name];
  if (typeof value !== "string") throw new Error(`Token ${name} is not text`);
  return value;
}

export function numberToken(tokens: Readonly<Record<string, TokenValue>>, name: string): number {
  const value = tokens[name];
  if (typeof value !== "number") throw new Error(`Token ${name} is not a number`);
  return value;
}
