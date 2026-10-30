import { schemaAt } from "./schemaRules";

type DefaultResult =
  | { readonly ok: true; readonly value: boolean }
  | { readonly ok: false; readonly message: string };

const SHOW_HELP_STEPS = ["properties", "controls", "items", "properties", "showHelp", "default"] as const;

/** Whether a catalog entry that omits showHelp asks for help: the published control schema decides, so the registry cannot drift from it. */
export function readShowHelpDefault(schema: unknown): DefaultResult {
  const value = schemaAt(schema, SHOW_HELP_STEPS);
  if (typeof value !== "boolean") return { ok: false, message: `The control schema has no true or false default at ${SHOW_HELP_STEPS.join(".")}.` };
  return { ok: true, value };
}
