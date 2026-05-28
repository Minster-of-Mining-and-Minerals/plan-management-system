"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { PatientSchedule, ScheduleMatrixResponse } from "@/redux/api/scheduleApi";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_STYLES,
} from "./scheduleStatus";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cellKey(date: string, time: string) {
  return `${date}_${time}`;
}

export function ScheduleMatrix({
  matrix,
  highlightPatientId,
  statusFilter,
  onEmptyClick,
  onOccupiedClick,
}: {
  matrix: ScheduleMatrixResponse;
  highlightPatientId?: string;
  statusFilter?: string;
  onEmptyClick: (date: string, time: string) => void;
  onOccupiedClick: (schedule: PatientSchedule) => void;
}) {
  const scheduleMap = useMemo(() => {
    const map = new Map<string, PatientSchedule>();
    for (const s of matrix.schedules) {
      if (statusFilter && statusFilter !== "all" && s.status !== statusFilter) continue;
      if (s.status === "cancelled" && statusFilter !== "cancelled") continue;
      map.set(cellKey(s.schedule_date, s.start_time), s);
    }
    return map;
  }, [matrix.schedules, statusFilter]);

  const timeRows = useMemo(() => {
    const set = new Set<string>();
    for (const d of matrix.dates) {
      if (d.active) d.slots.forEach((t) => set.add(t));
    }
    return Array.from(set).sort();
  }, [matrix.dates]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 overflow-hidden">
      <div className="overflow-auto max-h-[min(70vh,720px)]">
        <table className="w-full border-collapse text-xs min-w-[800px]">
          <thead className="sticky top-0 z-20 bg-card shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 bg-card border-b border-r border-border/60 p-2 text-left font-semibold min-w-[72px]">
                Time
              </th>
              {matrix.dates.map((col) => (
                <th
                  key={col.date}
                  className={cn(
                    "border-b border-border/60 p-2 text-center font-semibold min-w-[100px]",
                    !col.active && "bg-muted/50 text-muted-foreground"
                  )}
                >
                  <div>{DAY_NAMES[Number(col.dayOfWeek)]}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">
                    {col.date.slice(5)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeRows.map((time) => (
              <tr key={time} className="border-t border-border/40">
                <td className="sticky left-0 z-10 bg-card/95 border-r border-border/60 p-2 font-mono text-muted-foreground whitespace-nowrap">
                  {time}
                </td>
                {matrix.dates.map((col) => {
                  const slotAvailable = col.active && col.slots.includes(time);
                  const schedule = scheduleMap.get(cellKey(col.date, time));
                  const styles = schedule
                    ? SCHEDULE_STATUS_STYLES[schedule.status]
                    : null;
                  const isHighlight =
                    schedule && highlightPatientId === schedule.patient_id;

                  return (
                    <td key={col.date + time} className="p-0.5">
                      <button
                        type="button"
                        disabled={!slotAvailable && !schedule}
                        onClick={() => {
                          if (schedule) onOccupiedClick(schedule);
                          else if (slotAvailable) onEmptyClick(col.date, time);
                        }}
                        className={cn(
                          "w-full min-h-[44px] rounded-md border text-left p-1 transition-all",
                          !slotAvailable && !schedule && "bg-muted/30 cursor-not-allowed opacity-50",
                          slotAvailable && !schedule &&
                            "border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer",
                          schedule && styles?.bg,
                          schedule && styles?.border,
                          schedule && styles?.text,
                          schedule && "cursor-pointer hover:opacity-90",
                          isHighlight && "ring-2 ring-primary ring-offset-1"
                        )}
                      >
                        {schedule ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold truncate leading-tight">
                              {schedule.patient?.full_name?.split(" ")[0] ?? "Patient"}
                            </p>
                            <p className="text-[9px] opacity-80 truncate">
                              {schedule.patient?.patientProfile?.patient_code ?? ""}
                            </p>
                            <p className="text-[9px] capitalize opacity-70">
                              {SCHEDULE_STATUS_LABELS[schedule.status]}
                            </p>
                          </div>
                        ) : slotAvailable ? (
                          <span className="text-[10px] text-muted-foreground">+</span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
