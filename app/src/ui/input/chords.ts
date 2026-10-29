const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

const NAMED_KEYS: ReadonlySet<string> = new Set([
  "Enter",
  "Escape",
  "Tab",
  "Space",
  "Backspace",
  "Delete",
  "Insert",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  ...Array.from({ length: 12 }, (_, index) => `F${index + 1}`),
]);

const MODIFIER_ALIASES: Readonly<Record<string, Modifier>> = {
  ctrl: "Ctrl",
  control: "Ctrl",
  alt: "Alt",
  option: "Alt",
  shift: "Shift",
  meta: "Meta",
  cmd: "Meta",
  command: "Meta",
};

const EVENT_KEY_NAMES: Readonly<Record<string, string>> = { " ": "Space", Esc: "Escape" };

export type ChordResult =
  | { readonly ok: true; readonly chord: string }
  | { readonly ok: false; readonly message: string };

function buildChord(modifiers: ReadonlySet<Modifier>, key: string): string {
  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join("+");
}

function normalizeKey(key: string): string | null {
  const named = EVENT_KEY_NAMES[key] ?? key;
  if (NAMED_KEYS.has(named)) return named;
  const lower = named.toLowerCase();
  const match = [...NAMED_KEYS].find((candidate) => candidate.toLowerCase() === lower);
  if (match) return match;
  if ([...named].length !== 1) return null;
  const upper = named.toUpperCase();
  // Some letters grow when upper-cased (the German sharp s becomes two); those stay as typed.
  return [...upper].length === 1 ? upper : named;
}

/** Splits "Ctrl++" into its modifiers and the key, treating a final "+" as the plus key itself. */
function splitChord(text: string): { readonly modifiers: readonly string[]; readonly key: string } {
  const separator = "+";
  if (text === separator) return { modifiers: [], key: separator };
  if (text.endsWith(separator + separator)) {
    return { modifiers: text.slice(0, -2).split(separator).map((part) => part.trim()), key: separator };
  }
  const parts = text.split(separator);
  const key = parts.pop() ?? "";
  return { modifiers: parts.map((part) => part.trim()), key: key.trim().length === 0 ? key : key.trim() };
}

/** Turns text such as "ctrl+s" into the one canonical spelling used for collision checks. */
export function normalizeChord(text: string): ChordResult {
  const { modifiers: parts, key: rawKey } = splitChord(text);
  if (rawKey.length === 0) {
    return { ok: false, message: `"${text}" does not name a key.` };
  }
  const modifiers = new Set<Modifier>();
  for (const part of parts) {
    const modifier = MODIFIER_ALIASES[part.toLowerCase()];
    if (!modifier) return { ok: false, message: `"${part}" in "${text}" is not a modifier key.` };
    modifiers.add(modifier);
  }
  const key = normalizeKey(rawKey);
  if (key === null) return { ok: false, message: `"${rawKey}" in "${text}" is not a key that can be assigned.` };
  return { ok: true, chord: buildChord(modifiers, key) };
}

export function chordFromEvent(event: KeyboardEvent): string | null {
  const key = normalizeKey(event.key);
  if (key === null) return null;
  const modifiers = new Set<Modifier>();
  if (event.ctrlKey) modifiers.add("Ctrl");
  if (event.altKey) modifiers.add("Alt");
  if (event.shiftKey) modifiers.add("Shift");
  if (event.metaKey) modifiers.add("Meta");
  return buildChord(modifiers, key);
}
