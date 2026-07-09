"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onPrimary?: boolean;
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  className,
  disabled,
  onPrimary = false,
}: FilterDropdownProps) {
  return (
    <div className={cn("space-y-1.5 min-w-[140px]", className)}>
      <Label
        className={cn(
          "text-xs",
          onPrimary ? "text-primary-foreground/75" : "text-muted-foreground"
        )}
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            "h-9",
            onPrimary
              ? "border-primary-foreground/20 bg-primary-foreground/95 text-foreground"
              : "bg-white"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
