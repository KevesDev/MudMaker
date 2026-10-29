import { describe, expect, it } from "vitest";
import { chordFromEvent, normalizeChord } from "./chords";

const KEYS = [
  "a",
  "S",
  "7",
  "+",
  "-",
  " ",
  ",",
  ".",
  "/",
  "?",
  "=",
  "[",
  "\\",
  "é",
  "ß",
  "Enter",
  "Escape",
  "Tab",
  "Backspace",
  "Delete",
  "Home",
  "End",
  "PageUp",
  "ArrowLeft",
  "F1",
  "F12",
];

const MODIFIERS = [
  {},
  { ctrlKey: true },
  { shiftKey: true },
  { altKey: true },
  { metaKey: true },
  { ctrlKey: true, shiftKey: true },
  { ctrlKey: true, altKey: true, shiftKey: true, metaKey: true },
] as const;

describe("chords", () => {
  it("parses back to exactly what a key press produced, for every key and modifier mix", () => {
    for (const key of KEYS) {
      for (const modifiers of MODIFIERS) {
        const produced = chordFromEvent(new KeyboardEvent("keydown", { key, ...modifiers }));
        expect(produced, `${key} ${JSON.stringify(modifiers)}`).not.toBeNull();
        expect(normalizeChord(produced ?? ""), `${key} ${JSON.stringify(modifiers)} as ${String(produced)}`).toEqual({ ok: true, chord: produced });
      }
    }
  });

  it("can bind the plus, minus, space and comma keys, alone and with modifiers", () => {
    expect(normalizeChord("Ctrl++")).toEqual({ ok: true, chord: "Ctrl++" });
    expect(normalizeChord("ctrl+shift++")).toEqual({ ok: true, chord: "Ctrl+Shift++" });
    expect(normalizeChord("+")).toEqual({ ok: true, chord: "+" });
    expect(normalizeChord("Ctrl+-")).toEqual({ ok: true, chord: "Ctrl+-" });
    expect(normalizeChord("alt+space")).toEqual({ ok: true, chord: "Alt+Space" });
    expect(normalizeChord("Ctrl+,")).toEqual({ ok: true, chord: "Ctrl+," });
  });

  it("writes modifiers in one fixed order whatever order they were typed in", () => {
    expect(normalizeChord("meta+shift+alt+ctrl+k")).toEqual({ ok: true, chord: "Ctrl+Alt+Shift+Meta+K" });
  });

  it("rejects text that does not name a key or names a modifier that does not exist", () => {
    for (const text of ["", "Ctrl+", "a+", "++", "Ctrl+Banana", "Hyper+S", "Ctrl+Shift"]) {
      expect(normalizeChord(text).ok, text).toBe(false);
    }
  });

  it("gives no chord for a bare modifier key press", () => {
    for (const key of ["Control", "Shift", "Alt", "Meta"]) {
      expect(chordFromEvent(new KeyboardEvent("keydown", { key }))).toBeNull();
    }
  });
});
