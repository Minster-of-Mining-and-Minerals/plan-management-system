export type HslFormat = "space" | "comma";

export interface ParsedHsl {
  h: number;
  s: number;
  l: number;
  alpha?: number;
}

/** Parse stored HSL strings (space or comma separated, optional alpha). */
export function parseHslString(input: string): ParsedHsl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.includes(",")
    ? trimmed.split(",").map((p) => p.trim().replace(/%/g, ""))
    : trimmed.split(/\s+/).map((p) => p.replace(/%/g, ""));

  const nums = parts.map((p) => parseFloat(p)).filter((n) => !Number.isNaN(n));
  if (nums.length < 3) return null;

  return {
    h: nums[0],
    s: nums[1],
    l: nums[2],
    alpha: nums.length > 3 ? nums[3] : undefined,
  };
}

export function formatHsl(
  { h, s, l, alpha }: ParsedHsl,
  format: HslFormat
): string {
  if (format === "space") {
    return alpha !== undefined
      ? `${h} ${s}% ${l}% / ${alpha}%`
      : `${h} ${s}% ${l}%`;
  }

  return alpha !== undefined
    ? `${h}, ${s}%, ${l}%, ${alpha}%`
    : `${h}, ${s}%, ${l}%`;
}

export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);

  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex: string): ParsedHsl {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return { h: 0, s: 0, l: 0 };
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslStringToHex(hslValue: string): string | null {
  const parsed = parseHslString(hslValue);
  if (!parsed) return null;
  return hslToHex(parsed.h, parsed.s, parsed.l);
}

export function hexToHslString(
  hex: string,
  format: HslFormat,
  preserveAlpha?: number
): string {
  const { h, s, l } = hexToHsl(hex);
  return formatHsl(
    { h, s, l, alpha: preserveAlpha },
    format
  );
}
