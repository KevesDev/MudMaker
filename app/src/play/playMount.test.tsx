/** See home/homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SPLASH } from "../home/homeLayout";
import { productionDependencies } from "../home/homeDependencies";
import { healthyHome, renderApp } from "../home/homeTestSupport";
import { NAVIGATION } from "../nav/destinations";
import { PreferencesStore } from "../prefs";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager } from "../theme";
import { loadShippedRegistry } from "../ui";
import { LIBRARY } from "./playLayout";
import { clientProfiles } from "./clientProfiles";

const registry = loadShippedRegistry();

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
});

it("shows the World Library, with its controls visible, when Play opens through the production surfaces and a restored profile store", async () => {
  const manager = new ThemeManager(themeDefaults);
  const store = new PreferencesStore({ bridge: { read: () => Promise.resolve(null), write: () => Promise.resolve() }, report: () => undefined, profiles: clientProfiles });
  await store.restore(manager);
  const home = healthyHome({ surfaces: productionDependencies.surfaces, theme: manager });
  const { unbind } = renderApp(home, { strict: true });
  try {
    await screen.findByRole("heading", { level: 1 });
    await act(async () => undefined);
    fireEvent.click(screen.getByRole("button", { name: registry.requireControl(SPLASH.play).label }));
    const surface = await screen.findByRole("main", { name: registry.requireControl(NAVIGATION.play.entries.play).label });
    expect(surface.hidden).toBe(false);
    expect(surface.closest("[hidden]")).toBeNull();
    for (const id of [LIBRARY.search, LIBRARY.add, LIBRARY.edit, LIBRARY.remove, LIBRARY.connect]) {
      const control = surface.querySelector<HTMLElement>(`[data-control-id="${id}"]`);
      expect(control, id).not.toBeNull();
      expect(control?.closest("[hidden]")).toBeNull();
    }
  } finally {
    unbind();
  }
});
