/**
 * The small part of JSON Schema that the control schema uses. Unsupported keywords are reported,
 * never skipped, so a rule added to the schema cannot go unenforced.
 */

export type PathStep = string | number;

export interface SchemaProblem {
  readonly path: readonly PathStep[];
  readonly keyword: string;
  readonly message: string;
}

const SUPPORTED_KEYWORDS: ReadonlySet<string> = new Set([
  "$schema",
  "$id",
  "title",
  "type",
  "additionalProperties",
  "required",
  "properties",
  "const",
  "enum",
  "minLength",
  "pattern",
  "minItems",
  "items",
]);

const JSON_TYPES = ["object", "array", "string", "null"] as const;

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function label(path: readonly PathStep[]): string {
  return path.length === 0 ? "the document" : path.join(".");
}

/** Keywords in the schema that this validator does not understand, with where they appear. */
export function unsupportedKeywords(schema: unknown, path: readonly PathStep[] = []): string[] {
  if (!isRecord(schema)) return [`${label(path)} is not a schema object`];
  const found: string[] = [];
  for (const [keyword, value] of Object.entries(schema)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) {
      found.push(`${label([...path, keyword])}`);
      continue;
    }
    if (keyword === "properties" && isRecord(value)) {
      for (const [name, child] of Object.entries(value)) found.push(...unsupportedKeywords(child, [...path, "properties", name]));
    }
    if (keyword === "items") found.push(...unsupportedKeywords(value, [...path, "items"]));
    if (keyword === "type") {
      const types = Array.isArray(value) ? value : [value];
      for (const type of types) {
        if (!(JSON_TYPES as readonly unknown[]).includes(type)) found.push(`${label([...path, "type"])} names the unsupported type ${String(type)}`);
      }
    }
  }
  return found;
}

/** Checks a value against a schema that already passed `unsupportedKeywords`; reports every problem found. */
export function validateAgainst(value: unknown, schema: Readonly<Record<string, unknown>>, path: readonly PathStep[] = []): SchemaProblem[] {
  const problems: SchemaProblem[] = [];
  const add = (keyword: string, message: string): void => {
    problems.push({ path, keyword, message });
  };
  const type = schema["type"];
  if (type !== undefined) {
    const allowed = Array.isArray(type) ? type : [type];
    if (!allowed.includes(typeOf(value))) {
      add("type", `${label(path)} must be ${allowed.join(" or ")}, not ${typeOf(value)}`);
      return problems;
    }
  }
  if ("const" in schema && value !== schema["const"]) add("const", `${label(path)} must be ${JSON.stringify(schema["const"])}`);
  const allowedValues = schema["enum"];
  if (Array.isArray(allowedValues) && !allowedValues.includes(value)) {
    add("enum", `${label(path)} must be one of ${allowedValues.join(", ")}`);
  }
  if (typeof value === "string") {
    const minLength = schema["minLength"];
    if (typeof minLength === "number" && value.length < minLength) {
      add("minLength", `${label(path)} is too short: it needs at least ${minLength} characters`);
    }
    const pattern = schema["pattern"];
    if (typeof pattern === "string") {
      let expression: RegExp | null = null;
      try {
        expression = new RegExp(pattern);
      } catch {
        add("pattern", `${label(path)} cannot be checked because the schema pattern ${pattern} is not a valid expression`);
      }
      if (expression && !expression.test(value)) add("pattern", `${label(path)} does not match ${pattern}`);
    }
  }
  if (Array.isArray(value)) {
    const minItems = schema["minItems"];
    if (typeof minItems === "number" && value.length < minItems) {
      add("minItems", `${label(path)} needs at least ${minItems} entries`);
    }
    const items = schema["items"];
    if (isRecord(items)) {
      value.forEach((entry: unknown, index) => problems.push(...validateAgainst(entry, items, [...path, index])));
    }
  }
  if (isRecord(value)) {
    const required = schema["required"];
    if (Array.isArray(required)) {
      for (const name of required) {
        if (typeof name === "string" && !(name in value)) {
          problems.push({ path: [...path, name], keyword: "required", message: `${label([...path, name])} is missing` });
        }
      }
    }
    const properties = schema["properties"];
    const declared = isRecord(properties) ? properties : {};
    for (const [name, child] of Object.entries(declared)) {
      if (name in value && isRecord(child)) problems.push(...validateAgainst(value[name], child, [...path, name]));
    }
    if (schema["additionalProperties"] === false) {
      for (const name of Object.keys(value)) {
        if (!(name in declared)) {
          problems.push({ path: [...path, name], keyword: "additionalProperties", message: `${label([...path, name])} is not a property the schema allows` });
        }
      }
    }
  }
  return problems;
}

/** Follows property names down a schema, for reading one declared value such as an enum. */
export function schemaAt(schema: unknown, steps: readonly string[]): unknown {
  let node = schema;
  for (const step of steps) {
    if (!isRecord(node)) return undefined;
    node = node[step];
  }
  return node;
}
