/**
 * Shared setup for the home tests. They run in jsdom, which draws nothing, never turns Enter or Space
 * into a click, never moves focus on Tab and has no screen reader, so pixels, touch feel, native Tab
 * order and spoken output are checked by hand instead.
 */
import { render, screen, type RenderResult } from "@testing-library/react";
import { StrictMode } from "react";
import { vi, type Mock } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import type { AppInfo, EngineStatus } from "../appInfo";
import { App } from "../App";
import { fakeWindowShell, type FakeWindowShell } from "../frame/frameTestSupport";
import { GLYPHS } from "../frame/frameLayout";
import { loadFrameRegistry } from "../frame/frameRegistry";
import { ThemeManager, bindThemeToElement } from "../theme";
import { loadShippedRegistry } from "../ui";
import type { HomeDependencies } from "./homeDependencies";
import { SPLASH_GLYPHS } from "./homeLayout";
import type { HomeDiagnostic, StartupDiagnostic } from "./startupChecks";
import { WORDMARK_TEXT } from "./wordmark";

export const SHELL_INFO: AppInfo = {
  name: "MudMaker",
  version: "9.8.7",
  buildId: "abc1234",
  platform: "windows",
  arch: "x86_64",
  profile: "debug",
  launchId: "launch-test-1",
};

export const ENGINE_MISSING: EngineStatus = { installed: false, reason: "The game engine is not installed in this build." };

export interface TestHome {
  readonly dependencies: HomeDependencies;
  readonly manager: ThemeManager;
  readonly quit: Mock<() => Promise<void>>;
  readonly windowShell: FakeWindowShell;
  readonly records: HomeDiagnostic[];
}

/** Dependencies where every check passes; a test replaces the one it wants to break. */
export function healthyHome(overrides: Partial<HomeDependencies> = {}): TestHome {
  const manager = overrides.theme ?? new ThemeManager(themeDefaults);
  const quit = vi.fn<() => Promise<void>>(() => Promise.resolve());
  const records: HomeDiagnostic[] = [];
  const windowShell = fakeWindowShell();
  const dependencies: HomeDependencies = {
    getAppInfo: () => Promise.resolve(SHELL_INFO),
    getEngineStatus: () => Promise.resolve(ENGINE_MISSING),
    loadRegistry: loadShippedRegistry,
    theme: manager,
    requireEngine: false,
    quit,
    windowShell,
    loadFrameRegistry,
    report: (record) => records.push(record),
    ...overrides,
  };
  return { dependencies, manager, quit, windowShell, records };
}

/** The records the startup checks wrote, apart from anything the screen's own controls reported. */
export function startupRecords(records: readonly HomeDiagnostic[]): StartupDiagnostic[] {
  return records.filter((record): record is StartupDiagnostic => "check" in record);
}

/** Renders the application with the manager's home scope mirrored onto the document root, as the real window does. */
export function renderApp(home: TestHome, options: { readonly strict?: boolean } = {}): RenderResult & { readonly unbind: () => void } {
  const unbind = bindThemeToElement(home.manager, "home", document.documentElement);
  const app = <App dependencies={home.dependencies} />;
  const rendered = render(options.strict === true ? <StrictMode>{app}</StrictMode> : app);
  return Object.assign(rendered, { unbind });
}

/** The text of the frame row while the window is restored: its title, then the glyph of each control. */
export const FRAME_TEXT: readonly string[] = ["MudMaker", GLYPHS.minimize, GLYPHS.maximize, GLYPHS.close];

/** The brand composition the loaded and the failed screens share: the banner, the star of its divider and the brand line. */
export const BRAND_TEXT: readonly string[] = [WORDMARK_TEXT.trim(), SPLASH_GLYPHS.ornament, "BUILD WORLDS. YOUR WAY."];

/** Elements matching the selector that are not part of the window frame row. */
export function outsideFrame(selector: string): Element[] {
  return [...document.querySelectorAll(selector)].filter((element) => element.closest(".app-frame") === null);
}

/** Words that belong to the engineering side of the product, written out here as the plain-language rule needs them. */
export const JARGON =
  /\b(sidecar|catalog|catalogs|registry|handler|ecs|adr|tdd|dispatch|payload|schema|token|stub|placeholder|api|ipc|invoke|tauri|json|exception|stack|undefined|null|errno|command|assistive|technology|semantic|identifier|validation|recovery|preset)\b/i;
/** Symbols that stand for navigation paths or code, which a sentence for a person does not use. */
const CODE_SYMBOL = /[<>]/;
export const SPRINT_ID = /\bS\d{2}(\.\d)?[a-z]?\b|sprint/i;
export const EM_DASH = /—/;
export const EMOJI = /\p{Extended_Pictographic}/u;
/** A catalog control id such as home.splash.04, which means nothing to a person. */
export const CONTROL_ID = /\b(home|editor|client|host)\.[a-zA-Z]+\.\d{2}\b/;

export function breaksCopyRules(text: string): boolean {
  return [JARGON, SPRINT_ID, EM_DASH, EMOJI, CONTROL_ID, CODE_SYMBOL].some((rule) => rule.test(text));
}

/** Everything a person could read or hear: the text of the page plus accessible names. */
export function copyOnScreen(): string {
  const labels = [...document.querySelectorAll("[aria-label]")].map((element) => element.getAttribute("aria-label") ?? "");
  return [document.body.textContent ?? "", ...labels].join("\n");
}

/** Every piece of text a sighted person can read: not in a hidden help tooltip and not in a visually hidden region. */
export function visibleText(): string[] {
  const found: string[] = [];
  const walk = (node: Node): void => {
    if (node instanceof HTMLElement && (node.hidden || node.style.visibility === "hidden" || node.classList.contains("ui-visually-hidden"))) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      if (text.length > 0) found.push(text);
      return;
    }
    node.childNodes.forEach(walk);
  };
  walk(document.body);
  return found;
}

/** Live regions that currently hold the words, which is what assistive technology reads out. */
export function liveAnnouncements(words: string): HTMLElement[] {
  return screen
    .queryAllByRole("status")
    .concat(screen.queryAllByRole("alert"))
    .filter((region) => (region.textContent ?? "").includes(words));
}

/** The alert a person sees, not the hidden live region the shared library keeps for announcements. */
export function visibleAlert(): HTMLElement {
  const found = screen.getAllByRole("alert").find((region) => region.closest(".ui-visually-hidden") === null);
  if (!found) throw new Error("No visible alert is on screen.");
  return found;
}
