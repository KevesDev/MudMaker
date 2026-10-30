/** Reads source text: it shows who names the file and the commands, not that the shell behaves. */
import { describe, expect, it } from "vitest";
import capabilities from "../../src-tauri/capabilities/default.json";
import rustPreferences from "../../src-tauri/src/preferences.rs?raw";
import { PREFERENCES_VERSION } from "./prefsConfig";

const typescript = import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;
const rust = import.meta.glob("/src-tauri/src/*.rs", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;

const production = (files: Readonly<Record<string, string>>): [string, string][] => Object.entries(files).filter(([path]) => !/\.test\.tsx?$/.test(path));
const naming = (files: [string, string][], pattern: RegExp): string[] => files.filter(([, text]) => pattern.test(text)).map(([path]) => path.replace(/^\//, "")).sort();

describe("preferences ownership", () => {
  it("lets only the shell bridge and the launch wiring name the file commands, and only the store call them", () => {
    expect(naming(production(typescript), /read_preferences|write_preferences/)).toEqual(["src/appInfo.ts"]);
    expect(naming(production(typescript), /\b(read|write)Preferences\b/)).toEqual(["src/appInfo.ts", "src/main.tsx"]);
    expect(naming(production(typescript), /bridge\.(read|write)\(/)).toEqual(["src/prefs/PreferencesStore.ts"]);
  });

  it("lets only the preferences module of the shell name the file and its set-aside copies", () => {
    expect(naming(production(rust), /preferences\.json|preferences\.corrupt/)).toEqual(["src-tauri/src/preferences.rs"]);
  });

  it("keeps the file format version the same on both sides", () => {
    const declared = /pub const SCHEMA_VERSION: u64 = (\d+);/.exec(rustPreferences)?.[1];
    expect(Number(declared)).toBe(PREFERENCES_VERSION);
  });

  it("grants the window only the event and window permissions it names, and nothing for files, shell or network", () => {
    expect(capabilities.permissions.length).toBeGreaterThan(0);
    for (const permission of capabilities.permissions) {
      expect(permission, permission).toMatch(/^core:(event|window):allow-[a-z-]+$/);
    }
  });
});
