/** See homeTestSupport.tsx for what these tests cannot prove. */
import { describe, expect, it, vi } from "vitest";
import type { DiagnosticRecord } from "../appInfo";
import shellLogSource from "../../src-tauri/src/diagnostic_log.rs?raw";
import { DIAGNOSTIC_SEVERITIES } from "../ui";
import { createDiagnosticSink } from "./diagnosticSink";

const record: DiagnosticRecord = {
  severity: "info",
  code: "no-action-owner",
  message: "Create has no registered owner.",
  actionId: "ui.nav.create",
  controlId: "home.splash.04",
  correlation: { launchId: "launch-1" },
};

describe("the diagnostic sink", () => {
  it("forwards every record to the shell log exactly as it received it", async () => {
    const write = vi.fn(() => Promise.resolve());
    createDiagnosticSink({ write, logFailed: vi.fn() })(record);
    await Promise.resolve();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(record);
  });

  it("returns at once and reports the failure when the log cannot be written, so the interface is never blocked", async () => {
    const failure = new Error("disk full");
    const logFailed = vi.fn();
    const sink = createDiagnosticSink({ write: () => Promise.reject(failure), logFailed });
    expect(sink(record)).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve));
    expect(logFailed).toHaveBeenCalledWith(failure);
  });

  it("reports a write that throws before it returns a promise", async () => {
    const logFailed = vi.fn();
    const sink = createDiagnosticSink({
      write: () => {
        throw new Error("bridge missing");
      },
      logFailed,
    });
    expect(() => sink(record)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve));
    expect(logFailed).toHaveBeenCalledTimes(1);
  });

  it("echoes each record to the development console only when an echo is supplied", () => {
    const echo = vi.fn();
    createDiagnosticSink({ write: () => Promise.resolve(), logFailed: vi.fn(), echo })(record);
    expect(echo).toHaveBeenCalledWith(record);
    createDiagnosticSink({ write: () => Promise.resolve(), logFailed: vi.fn() })(record);
    expect(echo).toHaveBeenCalledTimes(1);
  });
});

/** Problems with how a Rust source names its severities compared with the interface list; empty when they agree. */
function severityMismatches(rustSource: string): string[] {
  const body = /pub enum Severity \{([^}]*)\}/.exec(rustSource)?.[1] ?? "";
  const rust = [...body.matchAll(/^\s*([A-Z][A-Za-z]*),/gm)].map((match) => (match[1] ?? "").toLowerCase());
  const problems: string[] = [];
  if (rust.join(",") !== DIAGNOSTIC_SEVERITIES.join(",")) problems.push(`the shell lists [${rust.join(", ")}]`);
  if (!/rename_all = "lowercase"\)\]\s*pub enum Severity/.test(rustSource)) problems.push("the shell does not read severities in lowercase");
  return problems;
}

describe("the severity list shared with the shell log", () => {
  it("names the same levels, in the same order, as the Rust enum the shell reads them into", () => {
    expect(severityMismatches(shellLogSource)).toEqual([]);
  });

  it.each([
    ["a level missing", shellLogSource.replace(/\n\s*Warning,/, "")],
    ["a level renamed", shellLogSource.replace("Info,", "Notice,")],
    ["levels in another order", shellLogSource.replace(/Error,(\s*)Warning,/, "Warning,$1Error,")],
    ["no lowercase reading", shellLogSource.replace('rename_all = "lowercase"', 'rename_all = "camelCase"')],
  ])("reports %s as a mismatch", (_name, mutated) => {
    expect(mutated).not.toBe(shellLogSource);
    expect(severityMismatches(mutated).length).toBeGreaterThan(0);
  });
});
