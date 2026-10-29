/** See homeTestSupport.tsx for what these tests cannot prove. */
import { describe, expect, it, vi } from "vitest";
import { ActionRegistry, CatalogLoadError } from "../ui";
import { fixtureSources } from "../ui/testSupport";
import { ENGINE_MISSING, SHELL_INFO, breaksCopyRules, healthyHome } from "./homeTestSupport";
import { runStartupChecks, type CheckId, type StartupReport } from "./startupChecks";

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
  it("run in a fixed order and pass on a healthy install, reporting a missing engine as a notice and not a failure", async () => {
    const home = healthyHome();
    const report = await runStartupChecks(home.dependencies, ATTEMPT);
    expect(report.results.map((result) => result.id)).toEqual(["shell", "catalogs", "theme", "engine"]);
    expect(report.results.map((result) => result.status)).toEqual(["passed", "passed", "passed", "attention"]);
    if (!report.ok) throw new Error("A healthy install must start.");
    expect(report.info).toEqual(SHELL_INFO);
    expect(report.registry.control("home.splash.04")?.label).toBe("Create");
    const preset = home.manager.listPresets().find((candidate) => candidate.id === home.manager.getSnapshot("home").themeId);
    expect(report.results[2]?.detail).toContain(preset?.label ?? "no preset found");
    expect(report.results[3]?.detail).toContain(ENGINE_MISSING.reason);
    expect(home.records).toEqual([]);
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

  /** The sentence a person reads for each failure, and the raw text that may only reach the operator log. */
  const BREAKS: readonly {
    readonly check: CheckId;
    readonly code: string;
    readonly sentence: string;
    readonly raw: string;
    readonly break: (home: ReturnType<typeof healthyHome>) => Parameters<typeof healthyHome>[0];
  }[] = [
    {
      check: "shell",
      code: "startup-shell-failed",
      sentence: "MudMaker could not reach its own program.",
      raw: "the shell is gone",
      break: () => ({ getAppInfo: () => Promise.reject(new Error("the shell is gone")) }),
    },
    {
      check: "catalogs",
      code: "startup-catalogs-invalid",
      sentence: "Some parts of this screen are missing or damaged.",
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
      sentence: "MudMaker could not load its colors and fonts.",
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
      sentence: "MudMaker could not check whether the game engine is installed.",
      raw: "no folder",
      break: () => ({ getEngineStatus: () => Promise.reject({ code: "engine_status_unavailable", message: "no folder" }) }),
    },
  ];

  it.each(BREAKS)("name the $check check when only it fails, with a plain sentence, and keep the raw text in the log record", async (scenario) => {
    const home = healthyHome();
    const broken = healthyHome({ ...scenario.break(home), theme: home.manager });
    const report = await runStartupChecks(broken.dependencies, ATTEMPT);
    expect(report.ok).toBe(false);
    expect(failuresOf(report)).toEqual([scenario.check]);
    expect(report.results).toHaveLength(4);
    const failure = report.results.find((result) => result.id === scenario.check);
    expect(failure).toMatchObject({ status: "failed", detail: scenario.sentence });
    expect(breaksCopyRules(failure?.detail ?? "")).toBe(false);
    expect(failure?.detail).not.toContain(scenario.raw);
    expect(report.results.filter((result) => result.id !== scenario.check).every((result) => result.status !== "failed")).toBe(true);
    expect(broken.records).toHaveLength(1);
    const [record] = broken.records;
    expect(record).toMatchObject({ severity: "error", code: scenario.code, check: scenario.check, attempt: ATTEMPT, actionId: null, controlId: null });
    expect(record?.message).toBe(`The ${scenario.check} startup check failed.`);
    expect("detail" in (record ?? {}) ? (record as { detail: string }).detail : "").toContain(scenario.raw);
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
    expect(later.records[0]?.correlation).toEqual({ launchId: SHELL_INFO.launchId });
    const first = healthyHome({ getAppInfo: () => Promise.reject(new Error("down")) });
    await runStartupChecks(first.dependencies, ATTEMPT);
    expect(first.records[0]?.correlation).toEqual({});
  });

  it("reports every failed check when several fail", async () => {
    const home = healthyHome({
      getAppInfo: () => Promise.reject(new Error("down")),
      getEngineStatus: () => Promise.reject(new Error("down")),
    });
    const report = await runStartupChecks(home.dependencies, ATTEMPT);
    expect(failuresOf(report)).toEqual(["shell", "engine"]);
    expect(home.records.map((record) => record.code)).toEqual(["startup-shell-failed", "startup-engine-failed"]);
  });

  it("keeps a failure that is only text out of the sentence and in the log detail", async () => {
    const home = healthyHome({ getAppInfo: () => Promise.reject("command app_info not found") });
    const report = await runStartupChecks(home.dependencies, ATTEMPT);
    expect(report.results[0]?.detail).not.toContain("app_info");
    expect(JSON.stringify(home.records[0])).toContain("command app_info not found");
  });
});
