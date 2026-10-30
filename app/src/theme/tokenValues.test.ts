import { describe, expect, it } from "vitest";
import { numberToken as fixtureNumberToken } from "./fixtures";
import { numberToken } from "./tokenValues";

describe("numberToken", () => {
  it("returns a numeric token", () => {
    expect(numberToken({ "spacing.row": 8 }, "spacing.row")).toBe(8);
  });

  it.each([
    ["a text token", { "spacing.row": "8" }],
    ["a boolean token", { "spacing.row": true }],
    ["a missing token", {}],
  ])("stops with the token's name for %s", (_name, tokens) => {
    expect(() => numberToken(tokens, "spacing.row")).toThrow(/"spacing\.row"/);
  });

  it("is the one helper the test fixtures use", () => {
    expect(fixtureNumberToken).toBe(numberToken);
  });
});
