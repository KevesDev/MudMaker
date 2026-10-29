export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const HEX_COLOR = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/;

export function parseHexColor(value: string): Rgb | null {
  const match = HEX_COLOR.exec(value);
  if (!match) return null;
  return {
    r: Number.parseInt(match[1] ?? "", 16),
    g: Number.parseInt(match[2] ?? "", 16),
    b: Number.parseInt(match[3] ?? "", 16),
  };
}

export function formatHexColor(color: Rgb): string {
  const channel = (value: number): string => value.toString(16).padStart(2, "0").toUpperCase();
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function linearChannel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * linearChannel(color.r) +
    0.7152 * linearChannel(color.g) +
    0.0722 * linearChannel(color.b)
  );
}

export function contrastRatio(first: Rgb, second: Rgb): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function blendColor(from: Rgb, to: Rgb, amount: number): Rgb {
  const mix = (start: number, end: number): number => Math.round(start + (end - start) * amount);
  return { r: mix(from.r, to.r), g: mix(from.g, to.g), b: mix(from.b, to.b) };
}
