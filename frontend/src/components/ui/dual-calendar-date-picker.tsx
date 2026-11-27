"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type CalendarSystem,
  ETHIOPIAN_MONTH_NAMES_EN,
  ETHIOPIAN_MONTH_NAMES_AM,
  convertEthiopianToGregorian,
  convertGregorianToEthiopian,
  formatDateByCalendar,
  getCalendarDateParts,
  getEthiopianDaysInMonth,
  isEthiopianLeapYear,
} from "@/utils/calendarUtils";
import { toDateOnlyString } from "@/utils/planDraftUtils";

interface DualCalendarDatePickerProps {
  /** Canonical Gregorian YYYY-MM-DD date string */
  value?: string | null;
  /** Callback receives canonical Gregorian YYYY-MM-DD date string */
  onChange: (canonicalDateStr: string) => void;
  calendarSystem?: CalendarSystem;
  placeholder?: string;
  disabled?: boolean;
  showEquivalent?: boolean;
  className?: string;
}

const EC_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DualCalendarDatePicker({
  value,
  onChange,
  calendarSystem = "GC",
  placeholder = "Pick date",
  disabled = false,
  showEquivalent = true,
  className,
}: DualCalendarDatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedGcDate = useMemo(() => {
    if (!value) return undefined;
    try {
      const d = parseISO(value);
      return isNaN(d.getTime()) ? undefined : d;
    } catch {
      return undefined;
    }
  }, [value]);

  const selectedEcParts = useMemo(() => {
    if (!value) return null;
    try {
      return getCalendarDateParts(value, "EC");
    } catch {
      return null;
    }
  }, [value]);

  const initialEc = useMemo(() => {
    if (selectedEcParts) {
      return { year: selectedEcParts.year, month: selectedEcParts.month };
    }
    const nowEc = convertGregorianToEthiopian(new Date());
    return { year: nowEc.year, month: nowEc.month };
  }, [selectedEcParts]);

  const [viewEcYear, setViewEcYear] = useState<number>(initialEc.year);
  const [viewEcMonth, setViewEcMonth] = useState<number>(initialEc.month);

  useEffect(() => {
    if (selectedEcParts) {
      setViewEcYear(selectedEcParts.year);
      setViewEcMonth(selectedEcParts.month);
    }
  }, [selectedEcParts]);

  const ecDaysInMonth = getEthiopianDaysInMonth(viewEcYear, viewEcMonth);
  const firstDayOfEcMonthGc = useMemo(() => {
    const gc = convertEthiopianToGregorian(viewEcYear, viewEcMonth, 1);
    return new Date(Date.UTC(gc.year, gc.month - 1, gc.day)).getUTCDay();
  }, [viewEcYear, viewEcMonth]);

  const ecYears = useMemo(() => {
    const arr: number[] = [];
    for (let y = 2000; y <= 2050; y += 1) arr.push(y);
    return arr;
  }, []);

  const handlePrevEcMonth = () => {
    if (viewEcMonth === 1) {
      setViewEcYear((y) => y - 1);
      setViewEcMonth(13);
    } else {
      setViewEcMonth((m) => m - 1);
    }
  };

  const handleNextEcMonth = () => {
    if (viewEcMonth === 13) {
      setViewEcYear((y) => y + 1);
      setViewEcMonth(1);
    } else {
      setViewEcMonth((m) => m + 1);
    }
  };

  const displayLabel = useMemo(() => {
    if (!value) return placeholder;
    if (calendarSystem === "EC") {
      return formatDateByCalendar(value, "EC", { includeAmharic: false, showSuffix: true });
    }
    return selectedGcDate ? format(selectedGcDate, "PPP") : value;
  }, [value, calendarSystem, selectedGcDate, placeholder]);

  const equivalentLabel = useMemo(() => {
    if (!value || !showEquivalent) return null;
    if (calendarSystem === "EC") {
      return `GC: ${formatDateByCalendar(value, "GC")}`;
    }
    return `EC: ${formatDateByCalendar(value, "EC")}`;
  }, [value, calendarSystem, showEquivalent]);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
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
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {calendarSystem === "GC" ? (
            <Calendar
              mode="single"
              selected={selectedGcDate}
              onSelect={(date) => {
                if (date) {
                  onChange(toDateOnlyString(date));
                  setOpen(false);
                }
              }}
              defaultMonth={selectedGcDate}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={2100}
              initialFocus
            />
          ) : (
            <div className="p-3 w-[300px] space-y-3">
              <div className="flex items-center justify-between gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePrevEcMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 flex-1">
                  <Select
                    value={String(viewEcMonth)}
                    onValueChange={(v) => setViewEcMonth(Number(v))}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {ETHIOPIAN_MONTH_NAMES_EN.map((mName, idx) => (
                        <SelectItem key={idx + 1} value={String(idx + 1)} className="text-xs">
                          {mName} ({ETHIOPIAN_MONTH_NAMES_AM[idx]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(viewEcYear)}
                    onValueChange={(v) => setViewEcYear(Number(v))}
                  >
                    <SelectTrigger className="h-7 text-xs w-[76px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {ecYears.map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextEcMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {viewEcMonth === 13 && (
                <div className="text-[11px] text-center rounded bg-amber-50 text-amber-800 px-2 py-1 border border-amber-200">
                  Pagume ({viewEcYear} EC) — {isEthiopianLeapYear(viewEcYear) ? "6 days (Leap Year)" : "5 days"}
                </div>
              )}

              <div className="grid grid-cols-7 gap-1 text-center">
                {EC_WEEKDAYS.map((wd) => (
                  <div key={wd} className="text-[11px] font-medium text-muted-foreground py-1">
                    {wd}
                  </div>
                ))}
                {Array.from({ length: firstDayOfEcMonthGc }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: ecDaysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isSelected =
                    selectedEcParts?.year === viewEcYear &&
                    selectedEcParts?.month === viewEcMonth &&
                    selectedEcParts?.day === dayNum;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => {
                        const gc = convertEthiopianToGregorian(viewEcYear, viewEcMonth, dayNum);
                        onChange(gc.dateStr);
                        setOpen(false);
                      }}
                      className={cn(
                        "h-8 w-8 rounded-md text-xs font-normal flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-slate-100 text-slate-800"
                      )}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {equivalentLabel && (
        <p className="text-[11px] text-muted-foreground pl-0.5">{equivalentLabel}</p>
      )}
    </div>
  );
}
