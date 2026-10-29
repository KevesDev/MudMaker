/** Reads source text only: it shows that the two sides name the same commands and arguments, not that a call succeeds. */
import { describe, expect, it } from "vitest";
import bridgeSource from "./appInfo.ts?raw";
import shellSource from "../src-tauri/src/lib.rs?raw";

const camel = (name: string): string => name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Every `invoke<...>("name", { key, ... })` in the bridge: the command and the argument keys it sends. */
function bridgeCalls(bridge: string): Map<string, string[]> {
  const calls = new Map<string, string[]>();
  for (const match of bridge.matchAll(/invoke<[^>]*>\(\s*"([a-z_]+)"(?:\s*,\s*\{([^}]*)\})?\s*\)/g)) {
    const keys = (match[2] ?? "").split(",").map((key) => key.trim().split(":")[0]?.trim() ?? "").filter((key) => key.length > 0);
    calls.set(match[1] ?? "", keys);
  }
  return calls;
}

/** Every `#[tauri::command]` function: its name and the parameters the interface supplies (injected handles and state excluded). */
function shellCommands(shell: string): Map<string, string[]> {
  const commands = new Map<string, string[]>();
  for (const match of shell.matchAll(/#\[tauri::command\]\s*fn\s+([a-z_]+)\s*\(([^)]*)\)/g)) {
    const parameters = (match[2] ?? "")
      .split(",")
      .map((parameter) => parameter.trim())
      .filter((parameter) => parameter.length > 0 && !/tauri::(AppHandle|State)/.test(parameter))
      .map((parameter) => camel(parameter.replace(/^mut\s+/, "").split(":")[0]?.trim() ?? ""));
    commands.set(match[1] ?? "", parameters);
  }
  return commands;
}

function registeredCommands(shell: string): string[] {
  const list = /generate_handler!\[([^\]]*)\]/.exec(shell)?.[1] ?? "";
  return list.split(",").map((name) => name.trim()).filter((name) => name.length > 0);
}

/** Every way the bridge and the shell disagree about commands, as sentences; empty when they agree. */
function mismatches(bridge: string, shell: string): string[] {
  const calls = bridgeCalls(bridge);
  const commands = shellCommands(shell);
  const registered = registeredCommands(shell).sort();
  const problems: string[] = [];
  for (const [name, keys] of calls) {
    const parameters = commands.get(name);
    if (parameters === undefined) problems.push(`the bridge calls ${name}, which the shell does not define`);
    else if (keys.join(",") !== parameters.join(",")) problems.push(`${name} sends [${keys.join(", ")}] but takes [${parameters.join(", ")}]`);
  }
  for (const name of commands.keys()) {
    if (!registered.includes(name)) problems.push(`${name} is defined but not registered`);
  }
  for (const name of registered) {
    if (!commands.has(name)) problems.push(`${name} is registered but not defined`);
    if (!calls.has(name)) problems.push(`${name} is registered but the bridge never calls it`);
  }
  return problems;
}

describe("the shell command bridge", () => {
  it("reads the commands it compares", () => {
    expect(bridgeCalls(bridgeSource).size).toBeGreaterThan(3);
    expect(shellCommands(shellSource).size).toBeGreaterThan(3);
    expect(shellCommands(shellSource).get("write_diagnostic")).toEqual(["record"]);
  });

  it("agrees between the real bridge and the real shell", () => {
    expect(mismatches(bridgeSource, shellSource)).toEqual([]);
  });

  it.each([
    ["a command renamed in the shell", bridgeSource, shellSource.replace("fn write_diagnostic(", "fn write_diagnostics(")],
    ["an argument key renamed in the bridge", bridgeSource.replace("{ record }", "{ records }"), shellSource],
    ["a command left out of the handler list", bridgeSource, shellSource.replace("write_diagnostic, quit_app", "quit_app")],
    ["a bridge command the shell does not define", `${bridgeSource}\nexport const ghost = () => invoke<void>("ghost_command");`, shellSource],
  ])("reports %s as a mismatch", (_name, bridge, shell) => {
    expect(mismatches(bridge, shell).length).toBeGreaterThan(0);
  });

  it("names the command in the problem it reports", () => {
    const problems = mismatches(bridgeSource, shellSource.replace("fn write_diagnostic(", "fn write_diagnostics("));
    expect(problems.some((problem) => problem.includes("write_diagnostic"))).toBe(true);
  });
});
