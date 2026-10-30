/** Valid TCP ports. */
export const PORT_RANGE = { min: 1, max: 65535 } as const;

export const PORT_INVALID_MESSAGE = "Enter a port from 1 to 65535.";

/** An empty entry is not yet wrong; anything typed must be a whole number inside the range. */
export function portIsInvalid(port: string): boolean {
  if (port.length === 0) return false;
  const number = Number(port);
  return !/^\d+$/.test(port) || number < PORT_RANGE.min || number > PORT_RANGE.max;
}
