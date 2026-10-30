import { describe, expect, it, vi } from "vitest";
import { HelpTracker } from "./HelpTracker";

describe("HelpTracker", () => {
  it("shows the first of pinned, hovered and focused that has a registered tooltip", () => {
    const help = new HelpTracker();
    help.register("a");
    help.register("b");
    help.register("c");
    help.setFocused("c");
    expect(help.current()).toBe("c");
    help.setHovered("b");
    expect(help.current()).toBe("b");
    expect(help.pin("a")).toBe(true);
    expect(help.current()).toBe("a");
  });

  it("skips keys with no tooltip, and a pin for such a key is refused", () => {
    const help = new HelpTracker();
    help.register("b");
    help.setHovered("a");
    help.setFocused("b");
    expect(help.current()).toBe("b");
    expect(help.pin("a")).toBe(false);
    expect(help.current()).toBe("b");
  });

  it("shows help at once when a hovered key gains a tooltip, and stops when it loses it", () => {
    const help = new HelpTracker();
    const listener = vi.fn();
    help.subscribe(listener);
    help.setHovered("a");
    expect(listener).not.toHaveBeenCalled();
    const stop = help.register("a");
    expect(help.current()).toBe("a");
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    expect(help.current()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps a key registered until every tooltip that registered it is gone", () => {
    const help = new HelpTracker();
    const first = help.register("a");
    const second = help.register("a");
    help.setHovered("a");
    first();
    expect(help.current()).toBe("a");
    second();
    expect(help.current()).toBeNull();
  });

  it("drops a pin when its tooltip goes, so the pin does not return with the next tooltip", () => {
    const help = new HelpTracker();
    const stop = help.register("a");
    help.register("b");
    help.setHovered("b");
    help.pin("a");
    stop();
    expect(help.current()).toBe("b");
    help.register("a");
    expect(help.current()).toBe("b");
  });

  it("hides dismissed help until another control takes it", () => {
    const help = new HelpTracker();
    help.register("a");
    help.setHovered("a");
    expect(help.dismiss()).toBe(true);
    expect(help.current()).toBeNull();
    expect(help.dismiss()).toBe(false);
  });
});
