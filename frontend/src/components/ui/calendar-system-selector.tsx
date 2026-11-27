"use client";

import React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarSystem } from "@/utils/calendarUtils";

interface CalendarSystemSelectorProps {
  value: CalendarSystem;
  onChange: (value: CalendarSystem) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function CalendarSystemSelector({
  value,
  onChange,
  disabled = false,
  size = "md",
  className,
}: CalendarSystemSelectorProps) {
  const options: Array<{ id: CalendarSystem; label: string; sub: string }> = [
    { id: "GC", label: "Gregorian (GC)", sub: "12 months" },
    { id: "EC", label: "Ethiopian (EC)", sub: "13 months + Pagume" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
      role="group"
      aria-label="Calendar System"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-all",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs",
              active
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            )}
          >
            <CalendarDays className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-slate-400")} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
