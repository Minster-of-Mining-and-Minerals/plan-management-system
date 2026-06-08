"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toDateOnlyString } from "@/utils/planDraftUtils";

interface PlanningStartDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PlanningStartDatePicker({
  value,
  onChange,
  placeholder = "Pick start date",
  disabled = false,
  className,
}: PlanningStartDatePickerProps) {
  const selectedDate = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(selectedDate!, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onChange(toDateOnlyString(date));
            }
          }}
          defaultMonth={selectedDate}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={2100}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
