"use client";

import { cn } from "@/lib/utils";
import { formatScheduleTime } from "../patientPortalUtils";

function normalizeSlotValue(slot: string) {
  return slot.slice(0, 5);
}

type TimeSlotPickerProps = {
  slots: string[];
  value: string;
  onChange: (slot: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
};

export function TimeSlotPicker({
  slots,
  value,
  onChange,
  isLoading = false,
  disabled = false,
}: TimeSlotPickerProps) {
  const normalizedValue = value ? normalizeSlotValue(value) : "";

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-2">Loading available slots…</p>
    );
  }

  if (!slots.length) {
    return (
      <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center">
        No available time slots for this date. Try another day or provider.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 max-h-[220px] overflow-y-auto rounded-md border border-border/60 bg-muted/10 p-2">
      {slots.map((slot) => {
        const slotValue = normalizeSlotValue(slot);
        const selected = normalizedValue === slotValue;

        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            onClick={() => onChange(slotValue)}
            className={cn(
              "min-h-[40px] rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
              "border-dashed border-border hover:border-primary hover:bg-primary/5",
              selected &&
                "border-solid border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {formatScheduleTime(slotValue)}
          </button>
        );
      })}
    </div>
  );
}
