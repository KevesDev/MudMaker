import type { TokenMap } from "./types";

/** A numeric theme token. The theme validates every token it resolves, so a missing or non-numeric one is a defect in the data and stops the caller with the token's name. */
export function numberToken(tokens: TokenMap, name: string): number {
  const value = tokens[name];
  if (typeof value !== "number") throw new Error(`Theme token "${name}" is not a number.`);
  return value;
}
