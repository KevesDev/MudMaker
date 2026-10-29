const NON_TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

const EDITABLE_VALUES: ReadonlySet<string> = new Set(["", "true", "plaintext-only"]);

/**
 * Reads the attribute, not the isContentEditable property, so the answer is the same in every
 * environment. The nearest ancestor with a valid value decides, and "false" switches editing off.
 */
function isEditableByAttribute(element: Element): boolean {
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    const value = node.getAttribute("contenteditable")?.trim().toLowerCase();
    if (value === undefined) continue;
    if (EDITABLE_VALUES.has(value)) return true;
    if (value === "false") return false;
  }
  return false;
}

/** True for elements where typing produces text, so global shortcuts must stay out of the way. */
export function isTextEntry(element: Element | null): boolean {
  if (element === null) return false;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(element.type);
  return isEditableByAttribute(element);
}

/** Native elements that the browser already turns Enter or Space into a click for. */
export function activatesNatively(element: Element): boolean {
  if (element instanceof HTMLButtonElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLAnchorElement) return element.hasAttribute("href");
  return element instanceof HTMLInputElement;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.closest("[hidden]") === null);
}
