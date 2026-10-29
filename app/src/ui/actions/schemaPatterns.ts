import { schemaAt } from "./schemaRules";

export type PatternResult =
  | { readonly ok: true; readonly pattern: RegExp }
  | { readonly ok: false; readonly message: string };

const ACTION_ID_STEPS = ["properties", "controls", "items", "properties", "actionId", "pattern"] as const;

/** The action id rule comes from the published control schema, so the registry cannot drift from it. */
export function readActionIdPattern(schema: unknown): PatternResult {
  const pattern = schemaAt(schema, ACTION_ID_STEPS);
  if (typeof pattern !== "string") return { ok: false, message: `The control schema has no pattern at ${ACTION_ID_STEPS.join(".")}.` };
  try {
    return { ok: true, pattern: new RegExp(pattern) };
  } catch (failure) {
    return { ok: false, message: `The control schema pattern for action ids is not a valid expression: ${failure instanceof Error ? failure.message : String(failure)}` };
  }
}
