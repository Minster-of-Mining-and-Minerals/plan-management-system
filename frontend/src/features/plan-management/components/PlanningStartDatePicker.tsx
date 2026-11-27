"use client";

import { DualCalendarDatePicker } from "@/components/ui/dual-calendar-date-picker";
import type { CalendarSystem } from "@/utils/calendarUtils";

interface PlanningStartDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  calendarSystem?: CalendarSystem;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PlanningStartDatePicker({
  value,
  onChange,
  calendarSystem = "GC",
  placeholder = "Pick start date",
  disabled = false,
  className,
}: PlanningStartDatePickerProps) {
  return (
    <DualCalendarDatePicker
      value={value}
      onChange={onChange}
      calendarSystem={calendarSystem}
      placeholder={placeholder}
      disabled={disabled}
      showEquivalent={true}
      className={className}
    />
  );
}
