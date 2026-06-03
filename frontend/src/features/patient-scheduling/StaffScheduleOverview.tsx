"use client";

import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PatientSchedule } from "@/redux/api/scheduleApi";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_STYLES,
} from "./scheduleStatus";
import { getBlockingSchedules } from "./scheduleSlotUtils";
import { cn } from "@/lib/utils";

type Props = {
  schedules: PatientSchedule[];
  highlightPatientId?: string;
  weekStart: string;
  weekEnd: string;
  staffName?: string;
};

export function StaffScheduleOverview({
  schedules,
  highlightPatientId,
  weekStart,
  weekEnd,
  staffName,
}: Props) {
  const blocking = useMemo(() => getBlockingSchedules(schedules), [schedules]);

  const sorted = useMemo(
    () =>
      [...blocking].sort((a, b) => {
        const ak = `${a.schedule_date}T${a.start_time}`;
        const bk = `${b.schedule_date}T${b.start_time}`;
        return ak.localeCompare(bk);
      }),
    [blocking]
  );

  const freeSlotHint =
    blocking.length === 0
      ? "No appointments this week — all configured slots are free."
      : `${blocking.length} appointment${blocking.length === 1 ? "" : "s"} this week. Click an empty “+” cell to book.`;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <CalendarClock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {staffName ? `${staffName}'s schedule` : "Staff schedule"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {weekStart} → {weekEnd} · {freeSlotHint}
          </p>
        </div>
      </div>

      {sorted.length > 0 ? (
        <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
          {sorted.map((s) => {
            const styles = SCHEDULE_STATUS_STYLES[s.status];
            const isCurrentPatient = highlightPatientId === s.patient_id;
            return (
              <li
                key={s.schedule_id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5",
                  styles?.bg,
                  styles?.border,
                  isCurrentPatient && "ring-1 ring-primary"
                )}
              >
                <span className="font-medium truncate">
                  {s.patient?.full_name ?? "Patient"}
                  {s.patient?.patientProfile?.patient_code
                    ? ` (${s.patient.patientProfile.patient_code})`
                    : ""}
                </span>
                <span className="flex items-center gap-2 shrink-0 text-muted-foreground">
                  <span className="font-mono">
                    {s.schedule_date} {s.start_time?.slice(0, 5)}–
                    {s.end_time?.slice(0, 5)}
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize h-5">
                    {SCHEDULE_STATUS_LABELS[s.status]}
                  </Badge>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
