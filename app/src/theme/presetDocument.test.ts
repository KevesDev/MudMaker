import { describe, expect, it } from "vitest";
import presetsDocument from "../../../docs/03-contracts/ui-ux/theme-presets.md?raw";
import { fixtureBaseTokens, fixturePresetIds, fixturePresetTokens, type RootScope } from "./fixtures";

const SCOPES: readonly RootScope[] = ["editor", "client"];
const BLEND_TARGETS: Readonly<Record<string, readonly number[]>> = { white: [255, 255, 255], black: [0, 0, 0] };

function section(document: string, title: string): string {
  const found = document.split(/^## /m).find((part) => part.startsWith(`${title}\n`));
  if (!found) throw new Error(`theme-presets.md has no section "${title}"`);
  return found;
}

function colorEntries(tokens: Readonly<Record<string, string | number | boolean>>): [string, string][] {
  return Object.entries(tokens).flatMap(([name, value]): [string, string][] =>
    name.startsWith("color.") && typeof value === "string" ? [[name, value.toUpperCase()]] : [],
  );
}

/** Independent blend: round(source + (target - source) * amount / 100) per channel. */
function blendHex(source: string, target: readonly number[], amount: number): string {
  const channels = [1, 3, 5].map((start, index) => {
    const from = parseInt(source.slice(start, start + 2), 16);
    const to = target[index] ?? 0;
    return Math.round(from + ((to - from) * amount) / 100)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  });
  return `#${channels.join("")}`;
}

const PALETTE_ROW = /^\| ([^|]+?) \| (#[0-9A-Fa-f]{6}) \| (.+) \|$/;
const DERIVATION_ROW = /^\| (.+?) \| ([^|]+?) (#[0-9A-Fa-f]{6}) \| (white|black) \| (\d+)% \| `(#[0-9A-Fa-f]{6})` \| .+ \|$/;

function tokensIn(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
}

/** Every disagreement between one preset section of the document and the pinned JSON. */
function presetProblems(document: string, presetId: string): string[] {
  const problems: string[] = [];
  const text = section(document, presetId);
  const values = new Map<string, Set<string>>();
  for (const scope of SCOPES) {
    for (const [name, value] of colorEntries(fixturePresetTokens(presetId, scope))) {
      values.set(name, (values.get(name) ?? new Set<string>()).add(value));
    }
  }
  const listed = new Map<string, number>();
  const checkTokens = (tokens: readonly string[], expected: string, where: string): void => {
    for (const token of tokens) {
      listed.set(token, (listed.get(token) ?? 0) + 1);
      const actual = values.get(token);
      if (!actual) problems.push(`${where}: ${token} is not a color of ${presetId}`);
      else if (actual.size !== 1 || !actual.has(expected)) {
        problems.push(`${where}: ${token} is ${[...actual].join("/")} in the file, document says ${expected}`);
      }
    }
  };

  const palette = new Map<string, string>();
  const paletteRows: { name: string; hex: string; tokens: string[] }[] = [];
  const derivationRows: { source: string; sourceHex: string; target: string; amount: number; result: string; tokens: string[] }[] = [];
  for (const line of text.split("\n")) {
    const derived = DERIVATION_ROW.exec(line);
    if (derived) {
      derivationRows.push({
        tokens: tokensIn(derived[1] ?? ""),
        source: derived[2] ?? "",
        sourceHex: (derived[3] ?? "").toUpperCase(),
        target: derived[4] ?? "",
        amount: Number(derived[5]),
        result: (derived[6] ?? "").toUpperCase(),
      });
      continue;
    }
    const direct = PALETTE_ROW.exec(line);
    if (direct && !line.startsWith("| Palette color")) {
      const row = { name: direct[1] ?? "", hex: (direct[2] ?? "").toUpperCase(), tokens: tokensIn(direct[3] ?? "") };
      paletteRows.push(row);
      palette.set(row.name, row.hex);
    }
  }
  if (paletteRows.length === 0) problems.push(`${presetId}: no palette table`);
  if (derivationRows.length === 0) problems.push(`${presetId}: no derivation table`);

  for (const row of paletteRows) checkTokens(row.tokens, row.hex, `palette ${row.name}`);
  for (const row of derivationRows) {
    const where = `derivation ${row.tokens.join(", ")}`;
    if (palette.get(row.source) !== row.sourceHex) problems.push(`${where}: ${row.source} ${row.sourceHex} is not in the palette table`);
    const recomputed = blendHex(row.sourceHex, BLEND_TARGETS[row.target] ?? [], row.amount);
    if (recomputed !== row.result) problems.push(`${where}: ${row.amount}% toward ${row.target} gives ${recomputed}, document says ${row.result}`);
    checkTokens(row.tokens, row.result, where);
  }
  for (const token of values.keys()) {
    const count = listed.get(token) ?? 0;
    if (count !== 1) problems.push(`${token} is listed ${count} times in ${presetId}, expected once`);
  }
  return problems;
}

function lineMatching(document: string, presetId: string, pattern: RegExp, skip = 0): string {
  const lines = section(document, presetId).split("\n").filter((line) => pattern.test(line));
  const line = lines[skip];
  if (!line) throw new Error("Expected document line is missing");
  return line;
}

describe("theme-presets.md matches the pinned defaults", () => {
  const documented = new Map<string, string>();
  for (const match of section(presetsDocument, "Functional fallback set").matchAll(/^\| `([^`]+)` \| `(#[0-9A-Fa-f]{6})` \|/gm)) {
    documented.set(match[1] ?? "", (match[2] ?? "").toUpperCase());
  }

  const fileFallback = new Map<string, string>();
  for (const scope of SCOPES) {
    for (const [name, value] of colorEntries(fixtureBaseTokens(scope))) {
      const existing = fileFallback.get(name);
      if (existing !== undefined && existing !== value) throw new Error(`Fallback ${name} differs between scopes`);
      fileFallback.set(name, value);
    }
  }

  it("lists exactly the colors that the application defaults hold outside any preset", () => {
    expect([...documented.keys()].sort()).toEqual([...fileFallback.keys()].sort());
  });

  it("documents the same value the file holds for every fallback color", () => {
    expect(Object.fromEntries(documented)).toEqual(Object.fromEntries(fileFallback));
  });

  it.each(fixturePresetIds())("lists every color of preset %s once, with palette and recomputed derived values", (presetId) => {
    expect(presetProblems(presetsDocument, presetId)).toEqual([]);
  });
});

describe("the document check catches drift", () => {
  const presetId = "neon-lights";

  it("fails when a documented amount no longer produces the documented result", () => {
    const row = lineMatching(presetsDocument, presetId, /\| black \| [1-9]\d?% \|/);
    const amount = Number(/\| (\d+)% \|/.exec(row)?.[1]);
    const drifted = presetsDocument.replace(row, row.replace(`| ${amount}% |`, `| ${amount + 1}% |`));
    expect(presetProblems(drifted, presetId).some((problem) => problem.includes("document says"))).toBe(true);
  });

  it("fails when a hex is moved onto a different token", () => {
    const first = lineMatching(presetsDocument, presetId, /\| white \| \d+% \|/, 0);
    const second = lineMatching(presetsDocument, presetId, /\| white \| \d+% \|/, 3);
    const firstToken = tokensIn(first)[0] ?? "";
    const secondToken = tokensIn(second)[0] ?? "";
    expect(firstToken).not.toBe(secondToken);
    const moved = presetsDocument
      .replace(first, first.replace(`\`${firstToken}\``, `\`${secondToken}\``))
      .replace(second, second.replace(`\`${secondToken}\``, `\`${firstToken}\``));
    const problems = presetProblems(moved, presetId);
    expect(problems.some((problem) => problem.includes(`${firstToken} is`))).toBe(true);
    expect(problems.some((problem) => problem.includes(`${secondToken} is`))).toBe(true);
  });

  it("fails when a palette color is listed against a token that uses another color", () => {
    const vulcan = lineMatching(presetsDocument, presetId, /^\| Vulcan \|/);
    const moved = presetsDocument.replace(vulcan, vulcan.replace("`color.surface.app`", "`color.surface.overlay`"));
    expect(moved).not.toBe(presetsDocument);
    expect(presetProblems(moved, presetId).some((problem) => problem.includes("color.surface.overlay"))).toBe(true);
  });

  it("fails when a color of the preset is missing from the tables", () => {
    const row = lineMatching(presetsDocument, presetId, /\| `color\.text\.disabled` \|/);
    const dropped = presetsDocument.replace(`${row}\n`, "");
    expect(presetProblems(dropped, presetId)).toContain("color.text.disabled is listed 0 times in neon-lights, expected once");
  });
});
