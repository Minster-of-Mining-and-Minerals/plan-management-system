"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorPickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

export function ColorPickerField({
  value,
  onChange,
  id = "color_hex",
  disabled = false,
}: ColorPickerFieldProps) {
  const normalized = value?.startsWith("#") ? value : `#${value || "000000"}`;

  const handleTextChange = (raw: string) => {
    let next = raw.trim();
    if (next && !next.startsWith("#")) next = `#${next}`;
    onChange(next.toUpperCase());
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          id={`${id}-picker`}
          value={normalized}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="flex-1 space-y-1">
        <Label htmlFor={id} className="sr-only">
          Color hex
        </Label>
        <Input
          id={id}
          value={normalized}
          disabled={disabled}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="#DC2626"
          maxLength={7}
          className="font-mono uppercase"
        />
      </div>
      <div
        className="h-11 w-11 shrink-0 rounded-lg border border-gray-200 shadow-inner"
        style={{ backgroundColor: normalized }}
        aria-hidden
      />
    </div>
  );
}
