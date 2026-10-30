import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager } from "../theme";
import type { UiDiagnostic } from "../ui";
import { ClientProfileBook } from "./ClientProfileBook";
import { PreferencesStore, type PreferencesDocument } from "./PreferencesStore";
import { PREFERENCES_VERSION, SAVE_DEBOUNCE_MS, SCOPE_NAMESPACE } from "./prefsConfig";

const ADAPTER_IDS = ["telnet", "mudmaker"];
const entry = (over: Record<string, unknown> = {}) => ({ id: "a", name: "Ashenvale", adapter: "telnet", host: "mud.example.test", port: 4000, tls: true, favorite: false, ...over });
const withProfiles = (profiles: unknown, extra: Record<string, unknown> = {}): unknown => ({ version: PREFERENCES_VERSION, [SCOPE_NAMESPACE.client]: { profiles, ...extra }, "other.namespace": { keep: 1 } });
const draft = { name: "  Brackwater ", adapter: "mudmaker", host: " play.example.test ", port: "5000", tls: false };

function harness(saved: unknown) {
  const writes: PreferencesDocument[] = [];
  const reports: UiDiagnostic[] = [];
  const profiles = new ClientProfileBook(ADAPTER_IDS);
  const bridge = {
    read: () => Promise.resolve(saved),
    write: (document: PreferencesDocument) => {
      writes.push(document);
      return Promise.resolve();
    },
  };
  const store = new PreferencesStore({ bridge, report: (record) => reports.push(record), profiles });
  return { profiles, store, manager: new ThemeManager(themeDefaults), writes, reports };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("saved world profiles", () => {
  it("saves, edits and favorites through one debounced write that a reload restores, keeping unknown keys", async () => {
    const first = harness(withProfiles([], { futureKey: true }));
    await first.store.restore(first.manager);
    first.store.bind(first.manager);
    const created = first.profiles.save(null, draft);
    if (!created.ok) throw new Error("The draft is valid.");
    first.profiles.save(created.profile.id, { ...draft, name: "Brackwater Two", port: "5001" });
    first.profiles.toggleFavorite(created.profile.id);
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(first.writes).toHaveLength(1);
    const written = first.writes[0];
    expect(written?.["other.namespace"]).toEqual({ keep: 1 });
    expect(written?.[SCOPE_NAMESPACE.client]).toMatchObject({ futureKey: true });

    const second = harness(written);
    await second.store.restore(second.manager);
    expect(second.profiles.getSnapshot()).toEqual([{ id: created.profile.id, name: "Brackwater Two", adapter: "mudmaker", host: "play.example.test", port: 5001, tls: false, favorite: true }]);
  });

  it("writes the removal of the last profile", async () => {
    const { profiles, store, manager, writes } = harness(withProfiles([entry()]));
    await store.restore(manager);
    store.bind(manager);
    profiles.remove("a");
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(writes[0]?.[SCOPE_NAMESPACE.client]).toMatchObject({ profiles: [] });
  });

  it("refuses an invalid draft without changing anything", () => {
    const { profiles } = harness(null);
    const bad = profiles.save(null, { ...draft, name: " ", host: "", port: "70000", adapter: "carrier-pigeon" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["adapter", "host", "name", "port"]);
    expect(profiles.getSnapshot()).toEqual([]);
  });

  it("drops corrupt entries with one diagnostic each and keeps the valid ones", async () => {
    const { manager, store, profiles, reports } = harness(
      withProfiles([entry(), entry({ id: "b", port: 0 }), "junk", entry({ id: "a", name: "Dup" }), entry({ id: "c", tls: "yes" }), entry({ id: "d", adapter: "nope" })]),
    );
    await store.restore(manager);
    expect(profiles.getSnapshot().map((profile) => profile.id)).toEqual(["a"]);
    expect(reports.map((record) => record.code)).toEqual(Array<string>(5).fill("preferences-profile-dropped"));
  });
});
