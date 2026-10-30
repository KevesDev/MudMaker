/** See homeTestSupport.tsx for what these tests cannot prove. */
import { describe, expect, it, vi } from "vitest";
import { ActionRegistry, CatalogLoadError } from "../ui";
import { fixtureSources } from "../ui/testSupport";
import { ENGINE_MISSING, SHELL_INFO, healthyHome, startupRecords } from "./homeTestSupport";
import { runStartupChecks, type CheckId, type StartupReport } from "./startupChecks";
import { STARTUP_REQUIRES_ENGINE } from "./startupConfig";

const ATTEMPT = 3;

function failuresOf(report: StartupReport): string[] {
  return report.ok ? [] : report.failures.map((failure) => failure.id);
}

function invalidCatalogError(): CatalogLoadError {
  const sources = fixtureSources();
  const broken = ActionRegistry.create({ ...sources, catalogs: { ...sources.catalogs, home: "not a catalog" } });
  if (broken.ok) throw new Error("The broken catalog must be refused.");
  return new CatalogLoadError(broken.issues);
}

describe("startup checks", () => {
  it("run in a fixed order and pass on a healthy install, treating a missing engine as a warning and not a failure", async () => {
    const home = healthyHome();
    const report = await runStartupChecks(home.dependencies, ATTEMPT);
    expect(report.results.map((result) => result.id)).toEqual(["shell", "catalogs", "theme", "engine"]);
    expect(report.results.map((result) => result.status)).toEqual(["passed", "passed", "passed", "attention"]);
    if (!report.ok) throw new Error("A healthy install must start.");
    expect(report.info).toEqual(SHELL_INFO);
    expect(report.registry.control("home.splash.04")?.label).toBe("Create");
  });

  it("write one log record per check, with its severity, the launch id and the attempt, and no record the screen could show", async () => {
    const home = healthyHome();
    await runStartupChecks(home.dependencies, ATTEMPT);
    const records = startupRecords(home.records);
    expect(home.records).toHaveLength(4);
    expect(records.map((record) => [record.check, record.severity, record.code])).toEqual([
      ["shell", "info", "startup-shell-passed"],
      ["catalogs", "info", "startup-catalogs-passed"],
      ["theme", "info", "startup-theme-passed"],
      ["engine", "warning", "startup-engine-missing"],
    ]);
    for (const record of records) {
      expect(record.correlation, record.check).toEqual({ launchId: SHELL_INFO.launchId });
      expect(record.attempt, record.check).toBe(ATTEMPT);
      expect(record.message, record.check).toMatch(/^The \w+ startup check (passed|needs attention)\.$/);
    }
    const preset = home.manager.listPresets().find((candidate) => candidate.id === home.manager.getSnapshot("home").themeId);
    expect(records[2]?.detail).toContain(preset?.label ?? "no preset found");
    expect(records[3]?.detail).toBe(ENGINE_MISSING.reason);
    expect(records[0]?.detail).toContain(`${SHELL_INFO.name} ${SHELL_INFO.version} build ${SHELL_INFO.buildId}`);
  });

  it("does not require the game engine by default", () => {
    expect(STARTUP_REQUIRES_ENGINE).toBe(false);
  });

  describe("when the game engine is not installed", () => {
    const engineRecords = (home: ReturnType<typeof healthyHome>) => startupRecords(home.records).filter((record) => record.check === "engine");

    it("still starts and logs a warning when the engine is not required", async () => {
      const home = healthyHome({ requireEngine: false });
      const report = await runStartupChecks(home.dependencies, ATTEMPT);
      expect(report.ok).toBe(true);
      expect(report.results.find((result) => result.id === "engine")?.status).toBe("attention");
      expect(engineRecords(home)).toEqual([expect.objectContaining({ severity: "warning", code: "startup-engine-missing" })]);
    });

    it("fails the launch with a retryable failure and logs an error when the engine is required", async () => {
      const home = healthyHome({ requireEngine: true });
      const report = await runStartupChecks(home.dependencies, ATTEMPT);
      expect(report.ok).toBe(false);
      expect(failuresOf(report)).toEqual(["engine"]);
      expect(report.ok ? null : report.registry?.control("home.splash.13")?.label).toBe("Retry");
      expect(engineRecords(home)).toEqual([expect.objectContaining({ severity: "error", code: "startup-engine-missing" })]);
    });

    it.each([true, false])("passes with an info record when it is installed and required is %s", async (requireEngine) => {
      const home = healthyHome({ requireEngine, getEngineStatus: () => Promise.resolve({ installed: true, reason: "The game engine is installed." }) });
      const report = await runStartupChecks(home.dependencies, ATTEMPT);
      expect(report.ok).toBe(true);
      expect(engineRecords(home)).toEqual([expect.objectContaining({ severity: "info", code: "startup-engine-installed" })]);
    });
  });

  it("calls each owner once and checks the home scope of the theme", async () => {
    const home = healthyHome();
    const snapshot = vi.spyOn(home.manager, "getSnapshot");
    const getAppInfo = vi.spyOn(home.dependencies, "getAppInfo");
    const getEngineStatus = vi.spyOn(home.dependencies, "getEngineStatus");
    await runStartupChecks(home.dependencies, ATTEMPT);
    expect(getAppInfo).toHaveBeenCalledTimes(1);
    expect(getEngineStatus).toHaveBeenCalledTimes(1);
    expect(snapshot).toHaveBeenCalledWith("home");
  });

  /** The raw text of each failure, which may only reach the operator log. */
  const BREAKS: readonly {
    readonly check: CheckId;
    readonly code: string;
    readonly raw: string;
    readonly break: (home: ReturnType<typeof healthyHome>) => Parameters<typeof healthyHome>[0];
  }[] = [
    {
      check: "shell",
      code: "startup-shell-failed",
      raw: "the shell is gone",
      break: () => ({ getAppInfo: () => Promise.reject(new Error("the shell is gone")) }),
    },
    {
      check: "catalogs",
      code: "startup-catalogs-invalid",
      raw: "home",
      break: () => ({
        loadRegistry: () => {
          throw invalidCatalogError();
        },
      }),
    },
    {
      check: "theme",
      code: "startup-theme-missing",
      raw: "no-such-preset",
      break: (home) => {
        const original = home.manager.getSnapshot.bind(home.manager);
        vi.spyOn(home.manager, "getSnapshot").mockImplementation((scope) => ({ ...original(scope), themeId: "no-such-preset" }));
        return {};
      },
    },
    {
      check: "engine",
      code: "startup-engine-failed",
      raw: "no folder",
      break: () => ({ getEngineStatus: () => Promise.reject({ code: "engine_status_unavailable", message: "no folder" }) }),
    },
  ];

  it.each(BREAKS)("name the $check check when only it fails and keep the raw text in its log record", async (scenario) => {
    const home = healthyHome();
    const broken = healthyHome({ ...scenario.break(home), theme: home.manager });
    const report = await runStartupChecks(broken.dependencies, ATTEMPT);
    expect(report.ok).toBe(false);
    expect(failuresOf(report)).toEqual([scenario.check]);
    expect(report.results).toHaveLength(4);
    expect(report.results.find((result) => result.id === scenario.check)?.status).toBe("failed");
    expect(report.results.filter((result) => result.id !== scenario.check).every((result) => result.status !== "failed")).toBe(true);
    expect(broken.records).toHaveLength(4);
    const own = startupRecords(broken.records).filter((record) => record.check === scenario.check);
    expect(own).toEqual([
      expect.objectContaining({
        severity: "error",
        code: scenario.code,
        attempt: ATTEMPT,
        actionId: null,
        controlId: null,
        message: `The ${scenario.check} startup check failed.`,
        detail: expect.stringContaining(scenario.raw),
      }),
    ]);
    expect(startupRecords(broken.records).filter((record) => record.check !== scenario.check).every((record) => record.severity !== "error")).toBe(true);
  });

  it("offers a registry to retry with unless the screen definitions are the failure", async () => {
    const catalogs = await runStartupChecks(healthyHome({ loadRegistry: () => { throw invalidCatalogError(); } }).dependencies, ATTEMPT);
    const shell = await runStartupChecks(healthyHome({ getAppInfo: () => Promise.reject(new Error("down")) }).dependencies, ATTEMPT);
    if (catalogs.ok || shell.ok) throw new Error("Both runs must fail.");
    expect(catalogs.registry).toBeNull();
    expect(shell.registry?.control("home.splash.13")?.label).toBe("Retry");
  });

  it("stamps every record after the shell has answered with the launch id, and leaves it to the shell when the shell never answered", async () => {
    const later = healthyHome({ getEngineStatus: () => Promise.reject(new Error("down")) });
    await runStartupChecks(later.dependencies, ATTEMPT);
    expect(later.records.map((record) => record.correlation)).toEqual(later.records.map(() => ({ launchId: SHELL_INFO.launchId })));
    const first = healthyHome({ getAppInfo: () => Promise.reject(new Error("down")) });
    await runStartupChecks(first.dependencies, ATTEMPT);
    expect(first.records.map((record) => record.correlation)).toEqual(first.records.map(() => ({})));
  });

  it("reports every failed check when several fail", async () => {
    const home = healthyHome({
      getAppInfo: () => Promise.reject(new Error("down")),
      getEngineStatus: () => Promise.reject(new Error("down")),
    });
    const report = await runStartupChecks(home.dependencies, ATTEMPT);
    expect(failuresOf(report)).toEqual(["shell", "engine"]);
    expect(home.records.filter((record) => record.severity === "error").map((record) => record.code)).toEqual(["startup-shell-failed", "startup-engine-failed"]);
  });

  it("keeps a failure that is only text in the log detail", async () => {
    const home = healthyHome({ getAppInfo: () => Promise.reject("command app_info not found") });
    const report = await runStartupChecks(home.dependencies, ATTEMPT);
    expect(report.ok).toBe(false);
    expect(startupRecords(home.records)[0]?.detail).toBe("command app_info not found");
  });
});
