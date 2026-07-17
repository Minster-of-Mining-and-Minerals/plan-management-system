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
    <div className={cn("min-w-0 space-y-1.5", className)}>
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
            "h-9 w-full min-w-0",
            onPrimary
              ? "border-primary-foreground/20 bg-primary-foreground/95 text-foreground"
              : "bg-white"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[min(18rem,50vh)] max-w-[min(100vw-2rem,28rem)]">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="max-w-full">
              <span className="block truncate">{opt.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
