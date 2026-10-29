import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { fixtureTokens, stringToken } from "./fixtures";
import { themeManager } from "./instance";
import { useTheme } from "./useTheme";

afterEach(() => {
  cleanup();
  themeManager.setOverrides("client", {});
  themeManager.setOverrides("editor", {});
});

it("re-renders with the new snapshot after an accepted change in its own scope only", () => {
  const client = renderHook(() => useTheme("client"));
  const editor = renderHook(() => useTheme("editor"));
  const editorBefore = editor.result.current;
  expect(client.result.current.tokens["color.text.primary"]).toBe(
    stringToken(fixtureTokens("client"), "color.text.primary"),
  );

  act(() => {
    themeManager.setOverrides("client", { "color.text.primary": "#FFFFFF" });
  });

  expect(client.result.current.tokens["color.text.primary"]).toBe("#FFFFFF");
  expect(editor.result.current).toBe(editorBefore);
});

it("keeps the same snapshot object between renders when nothing changed", () => {
  const { result, rerender } = renderHook(() => useTheme("host"));
  const first = result.current;
  rerender();
  expect(result.current).toBe(first);
});
