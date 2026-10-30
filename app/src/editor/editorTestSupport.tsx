/** jsdom draws nothing, so widths are supplied by the test; pixels, touch feel and native focus movement are checked by hand. */
import { vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { loadShippedRegistry } from "../ui";

const registry = loadShippedRegistry();

/** A control of the shipped editor catalog, for the name an editor part takes. */
export const described = (id: string) => registry.requireControl(id);

/** The default editor token value, read from the theme data the application ships. */
export function editorToken(name: string): number {
  const value = (themeDefaults.scopes.editor.tokens as Readonly<Record<string, string | number | boolean>>)[name];
  if (typeof value !== "number") throw new Error(`Default editor token ${name} is not a number.`);
  return value;
}

/** Makes elements matching the selector report this width and left edge, and every other element report none. */
export function stubBox(selector: string, box: { readonly width: number; readonly left?: number }): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const matches = this.matches(selector);
    const left = matches ? (box.left ?? 0) : 0;
    const width = matches ? box.width : 0;
    return { x: left, y: 0, left, top: 0, right: left + width, bottom: 0, width, height: 0, toJSON: () => ({}) };
  });
}

export function stubMatchMedia(matches: boolean): { readonly set: (next: boolean) => void; readonly queries: string[] } {
  const listeners = new Set<() => void>();
  const queries: string[] = [];
  let current = matches;
  vi.stubGlobal("matchMedia", (query: string) => {
    queries.push(query);
    return {
      get matches() {
        return current;
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    };
  });
  return {
    queries,
    set: (next) => {
      current = next;
      for (const listener of listeners) listener();
    },
  };
}
