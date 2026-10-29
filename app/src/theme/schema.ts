export type TokenType =
  | { readonly kind: "color" }
  | { readonly kind: "fontStack" }
  | { readonly kind: "length" }
  | { readonly kind: "duration" }
  | { readonly kind: "number"; readonly min: number; readonly minExclusive: boolean }
  | { readonly kind: "integer"; readonly min: number; readonly max: number }
  | { readonly kind: "boolean" }
  | { readonly kind: "identifier" }
  | { readonly kind: "enum"; readonly values: readonly string[] };

/** Roles let accessibility adjustments find tokens by meaning instead of by name. */
export type TokenRole = "fontSize" | "motionDuration";

export interface TokenDescriptor {
  readonly type: TokenType;
  readonly role: TokenRole | null;
}

interface TokenFamily {
  readonly prefix: string;
  readonly members: readonly string[] | "open";
  readonly type: TokenType;
  readonly role?: TokenRole;
}

const COLOR: TokenType = { kind: "color" };
const FONT_STACK: TokenType = { kind: "fontStack" };
const LENGTH: TokenType = { kind: "length" };
const DURATION: TokenType = { kind: "duration" };
const POSITIVE_NUMBER: TokenType = { kind: "number", min: 0, minExclusive: true };
const POSITIVE_INTEGER: TokenType = { kind: "integer", min: 1, max: Number.MAX_SAFE_INTEGER };
const NON_NEGATIVE_INTEGER: TokenType = { kind: "integer", min: 0, max: Number.MAX_SAFE_INTEGER };
const FONT_WEIGHT: TokenType = { kind: "integer", min: 1, max: 1000 };
const BOOLEAN: TokenType = { kind: "boolean" };
const IDENTIFIER: TokenType = { kind: "identifier" };
const ANSI_COLOR_POLICY: TokenType = {
  kind: "enum",
  values: ["honored", "adapted", "ignored"],
};

const ANSI_PALETTE = Array.from({ length: 16 }, (_, index) => `ansi${index}`);

const FAMILIES: readonly TokenFamily[] = [
  { prefix: "color.surface", members: ["app", "panel", "toolbar", "inspector", "canvas", "overlay"], type: COLOR },
  { prefix: "color.text", members: ["primary", "secondary", "muted", "disabled"], type: COLOR },
  { prefix: "color.border", members: ["normal", "subtle", "focused", "invalid"], type: COLOR },
  { prefix: "color.graph.grid", members: ["minor", "major"], type: COLOR },
  { prefix: "color.graph.edge", members: "open", type: COLOR },
  { prefix: "color.graph.port", members: "open", type: COLOR },
  { prefix: "color.graph.node", members: "open", type: COLOR },
  {
    prefix: "color.status",
    members: ["success", "warning", "error", "information", "connected", "reconnecting", "offline"],
    type: COLOR,
  },
  { prefix: "color.interaction", members: ["focus", "selection", "hover", "pressed"], type: COLOR },
  {
    prefix: "color.terminal",
    members: [
      "background",
      "foreground",
      "link",
      "prompt",
      "system",
      "chat",
      "tell",
      "emote",
      "combat",
      "warning",
      ...ANSI_PALETTE,
    ],
    type: COLOR,
  },
  {
    prefix: "color.map",
    members: ["room", "visited", "current", "unknown", "exit", "locked", "uncertain", "note"],
    type: COLOR,
  },
  {
    prefix: "color.client",
    members: ["inputBackground", "historyHighlight", "matchHighlight", "channelAccent"],
    type: COLOR,
  },
  { prefix: "font.family", members: ["interface", "code", "numeric"], type: FONT_STACK },
  {
    prefix: "font.size",
    members: ["body", "caption", "nodeTitle", "heading", "code"],
    type: LENGTH,
    role: "fontSize",
  },
  { prefix: "font.weight", members: "open", type: FONT_WEIGHT },
  { prefix: "font.lineHeight", members: "open", type: POSITIVE_NUMBER },
  { prefix: "font.terminal", members: ["family"], type: FONT_STACK },
  { prefix: "font.terminal", members: ["size"], type: LENGTH, role: "fontSize" },
  { prefix: "font.terminal", members: ["lineHeight"], type: POSITIVE_NUMBER },
  { prefix: "font.terminal", members: ["weight"], type: FONT_WEIGHT },
  { prefix: "spacing", members: "open", type: LENGTH },
  { prefix: "shape", members: "open", type: LENGTH },
  { prefix: "layout", members: ["contentMaxWidth"], type: LENGTH },
  { prefix: "motion.duration", members: "open", type: DURATION, role: "motionDuration" },
  { prefix: "motion", members: ["reducedDurationMs"], type: DURATION },
  { prefix: "interaction", members: ["pointerHitSize", "touchHitSize", "focusOutlineWidth"], type: LENGTH },
  { prefix: "interaction.client", members: ["scrollbackPause", "autofollow"], type: BOOLEAN },
  { prefix: "interaction.client", members: ["focusMode"], type: IDENTIFIER },
  { prefix: "grid", members: ["baseStep", "snapStep"], type: POSITIVE_NUMBER },
  { prefix: "grid", members: ["majorEvery"], type: POSITIVE_INTEGER },
  { prefix: "grid", members: ["minorVisibilityMinScreenStep", "lineWidth"], type: LENGTH },
  { prefix: "text", members: ["wrapWidth"], type: NON_NEGATIVE_INTEGER },
  { prefix: "text", members: ["spacing"], type: POSITIVE_NUMBER },
  { prefix: "text", members: ["ligatures", "timestamps"], type: BOOLEAN },
  { prefix: "text", members: ["ansiColorPolicy"], type: ANSI_COLOR_POLICY },
];

const OPEN_MEMBER_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

const closedTokens = new Map<string, TokenDescriptor>();
const openFamilies: { readonly prefix: string; readonly descriptor: TokenDescriptor }[] = [];

for (const family of FAMILIES) {
  const descriptor: TokenDescriptor = { type: family.type, role: family.role ?? null };
  if (family.members === "open") {
    openFamilies.push({ prefix: `${family.prefix}.`, descriptor });
  } else {
    for (const member of family.members) {
      closedTokens.set(`${family.prefix}.${member}`, descriptor);
    }
  }
}

/** Returns the declared type of a token name, or undefined when the schema does not define it. */
function describeToken(name: string): TokenDescriptor | undefined {
  const closed = closedTokens.get(name);
  if (closed) return closed;
  for (const { prefix, descriptor } of openFamilies) {
    if (name.startsWith(prefix) && OPEN_MEMBER_NAME.test(name.slice(prefix.length))) {
      return descriptor;
    }
  }
  return undefined;
}

export interface ThemeSchemaFamily {
  readonly prefix: string;
  readonly members: readonly string[] | "open";
}

/** The single type table for theme tokens; every validator and adjustment reads it from here. */
export const ThemeSchema = {
  describeToken,
  families: FAMILIES.map((family): ThemeSchemaFamily => ({ prefix: family.prefix, members: family.members })),
} as const;
