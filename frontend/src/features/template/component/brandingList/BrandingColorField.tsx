"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hexToHslString,
  hslStringToHex,
  parseHslString,
  type HslFormat,
} from "@/utils/brandingColorFormat";

interface BrandingColorFieldProps {
  label: string;
  value: string;
  format: HslFormat;
  preserveAlpha?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function BrandingColorField({
  label,
  value,
  format,
  preserveAlpha = false,
  placeholder,
  onChange,
}: BrandingColorFieldProps) {
  const pickerHex = useMemo(() => {
    const hex = hslStringToHex(value);
    return hex ?? "#000000";
  }, [value]);

  const swatchStyle = useMemo(() => {
    const parsed = parseHslString(value);
    if (!parsed) return { backgroundColor: pickerHex };
    if (parsed.alpha !== undefined) {
      return {
        backgroundColor: `hsla(${parsed.h}, ${parsed.s}%, ${parsed.l}%, ${parsed.alpha / 100})`,
      };
    }
    return format === "space"
      ? { backgroundColor: `hsl(${parsed.h} ${parsed.s}% ${parsed.l}%)` }
      : { backgroundColor: `hsl(${parsed.h}, ${parsed.s}%, ${parsed.l}%)` };
  }, [value, pickerHex, format]);

  const handlePickerChange = (hex: string) => {
    const existing = parseHslString(value);
    const alpha =
      preserveAlpha && existing?.alpha !== undefined
        ? existing.alpha
        : undefined;
    onChange(hexToHslString(hex, format, alpha));
  };

  const handleInputChange = (raw: string) => {
    onChange(raw);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="relative shrink-0">
          <div
            className="h-12 w-12 rounded-md border shadow-sm"
            style={swatchStyle}
          />
          <input
            type="color"
            value={pickerHex}
            onChange={(e) => handlePickerChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground">Color picker</p>
          <p className="font-mono text-xs">{pickerHex.toUpperCase()}</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">HSL value (saved to theme)</p>
        <Input
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
