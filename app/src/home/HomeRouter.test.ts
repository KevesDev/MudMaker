/** See homeTestSupport.tsx for what these tests cannot prove. */
import { describe, expect, it, vi } from "vitest";
import { createUiRuntime, loadShippedRegistry } from "../ui";
import { HOME_ROUTER, registerHomeRouter } from "./HomeRouter";
import { SPLASH } from "./homeLayout";

const registry = loadShippedRegistry();

function actionOf(controlId: string): string {
  const actionId = registry.requireControl(controlId).actionId;
  if (actionId === null) throw new Error(`${controlId} has no action`);
  return actionId;
}

function setup() {
  const runtime = createUiRuntime({ registry, document, diagnostics: () => undefined });
  const retry = vi.fn();
  const stop = registerHomeRouter(runtime.bus, registry, { retryStartup: retry });
  const dispatch = (controlId: string) => runtime.bus.dispatch({ actionId: actionOf(controlId), controlId });
  return { retry, stop, dispatch };
}

describe("the home router", () => {
  it("is the owner the action table names for the retry action", () => {
    expect(registry.action(actionOf(SPLASH.retry))?.owner).toBe(HOME_ROUTER);
  });

  it("starts the startup checks again once, and stops handling the action when it is torn down", async () => {
    const { dispatch, stop, retry } = setup();
    expect(await dispatch(SPLASH.retry)).toMatchObject({ status: "success" });
    expect(retry).toHaveBeenCalledTimes(1);
    stop();
    expect(await dispatch(SPLASH.retry)).toMatchObject({ status: "unavailable", code: "no-action-owner" });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
