"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PatientSchedule, ScheduleMatrixResponse } from "@/redux/api/scheduleApi";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_STYLES,
} from "./scheduleStatus";
import {
  canDropScheduleOnCell,
  isBeforeShiftStart,
  isInShiftRange,
  isScheduleDraggable,
  isShiftEndColumn,
  isShiftStartCell,
  isShiftStartColumn,
  type ShiftAnchor,
  type ShiftRangeMode,
} from "./scheduleDragUtils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DRAG_MIME = "application/x-novacure-schedule-id";

function cellKey(date: string, time: string) {
  return `${date}_${time}`;
}

export function ScheduleMatrix({
  matrix,
  highlightPatientId,
  statusFilter,
  onEmptyClick,
  onOccupiedClick,
  onReschedule,
  shiftSelectMode = false,
  shiftRangeMode = "from_start_to_end",
  shiftStart,
  shiftEnd,
  onShiftMatrixPick,
}: {
  matrix: ScheduleMatrixResponse;
  highlightPatientId?: string;
  statusFilter?: string;
  onEmptyClick: (date: string, time: string) => void;
  onOccupiedClick: (schedule: PatientSchedule) => void;
  onReschedule?: (
    schedule: PatientSchedule,
    date: string,
    time: string
  ) => Promise<void>;
  shiftSelectMode?: boolean;
  shiftRangeMode?: ShiftRangeMode;
  shiftStart?: ShiftAnchor | null;
  shiftEnd?: ShiftAnchor | null;
  onShiftMatrixPick?: (anchor: ShiftAnchor, fromHeader: boolean) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, PatientSchedule>();
    for (const s of matrix.schedules) {
      if (statusFilter && statusFilter !== "all" && s.status !== statusFilter) {
        continue;
      }
      if (s.status === "cancelled" && statusFilter !== "cancelled") continue;
      map.set(cellKey(s.schedule_date, s.start_time), s);
    }
    return map;
  }, [matrix.schedules, statusFilter]);

  const scheduleById = useMemo(() => {
    const map = new Map<string, PatientSchedule>();
    for (const s of matrix.schedules) {
      map.set(s.schedule_id, s);
    }
    return map;
  }, [matrix.schedules]);

  const timeRows = useMemo(() => {
    const set = new Set<string>();
    for (const d of matrix.dates) {
      if (d.active) d.slots.forEach((t) => set.add(t));
    }
    return Array.from(set).sort();
  }, [matrix.dates]);

  const handleDrop = async (
    e: React.DragEvent,
    date: string,
    time: string,
    slotAvailable: boolean
  ) => {
    e.preventDefault();
    setDragOverKey(null);

    if (!onReschedule || !slotAvailable) return;

    const scheduleId = e.dataTransfer.getData(DRAG_MIME);
    const schedule = scheduleById.get(scheduleId);
    if (!schedule || !isScheduleDraggable(schedule.status)) return;

    if (schedule.schedule_date === date && schedule.start_time === time) {
      setDraggingId(null);
      return;
    }

    if (!canDropScheduleOnCell(date, slotAvailable, false)) return;

    setIsDropping(true);
    try {
      await onReschedule(schedule, date, time);
    } finally {
      setIsDropping(false);
      setDraggingId(null);
    }
  };

  const handleCellClick = (
    date: string,
    time: string,
    slotAvailable: boolean,
    schedule: PatientSchedule | undefined
  ) => {
    if (shiftSelectMode && onShiftMatrixPick) {
      onShiftMatrixPick({ date, time }, false);
      return;
    }
    if (draggingId || isDropping) return;
    if (schedule) onOccupiedClick(schedule);
    else if (slotAvailable) onEmptyClick(date, time);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 overflow-hidden",
        shiftSelectMode && "ring-2 ring-amber-400/60"
      )}
    >
      {shiftSelectMode && (
        <p className="border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          Mark <strong className="text-amber-700">start</strong> (amber) and{" "}
          <strong className="text-violet-700">end</strong> (violet) per your range mode.
          Time-only shifts overflow to the next active column&apos;s slots.
        </p>
      )}
      {onReschedule && draggingId && !shiftSelectMode && (
        <p className="border-b border-border/60 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          Drag to an open slot on today or a future date. Admitted and cancelled
          appointments cannot be moved.
        </p>
      )}
      <div className="overflow-auto max-h-[min(70vh,720px)]">
        <table className="w-full border-collapse text-xs min-w-[800px]">
          <thead className="sticky top-0 z-20 bg-card shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 bg-card border-b border-r border-border/60 p-2 text-left font-semibold min-w-[72px]">
                Time
              </th>
              {matrix.dates.map((col) => {
                const startCol = isShiftStartColumn(col.date, shiftStart);
                const endCol = isShiftEndColumn(col.date, shiftEnd);
                const inRange =
                  shiftSelectMode &&
                  isInShiftRange(
                    col.date,
                    "00:00",
                    shiftStart,
                    shiftEnd,
                    shiftRangeMode
                  );
                return (
                  <th
                    key={col.date}
                    className={cn(
                      "border-b border-border/60 p-0 min-w-[100px]",
                      !col.active && "bg-muted/50 text-muted-foreground",
                      inRange && "bg-sky-50/70",
                      startCol && "bg-amber-100/80",
                      endCol && "bg-violet-100/80"
                    )}
                  >
                    <button
                      type="button"
                      disabled={!shiftSelectMode}
                      onClick={() =>
                        shiftSelectMode &&
                        onShiftMatrixPick?.({ date: col.date }, true)
                      }
                      className={cn(
                        "w-full p-2 text-center font-semibold transition-colors",
                        shiftSelectMode && "cursor-pointer hover:bg-amber-100/90",
                        startCol && "ring-2 ring-amber-500 ring-inset bg-amber-100",
                        endCol && "ring-2 ring-violet-500 ring-inset bg-violet-100"
                      )}
                    >
                      <div>{DAY_NAMES[Number(col.dayOfWeek)]}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {col.date.slice(5)}
                      </div>
                      {startCol && (
                        <div className="text-[9px] font-medium text-amber-800 mt-0.5">
                          Start
                        </div>
                      )}
                      {endCol && (
                        <div className="text-[9px] font-medium text-violet-800 mt-0.5">
                          End
                        </div>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {timeRows.map((time) => (
              <tr key={time} className="border-t border-border/40">
                <td className="sticky left-0 z-10 bg-card/95 border-r border-border/60 p-2 font-mono text-muted-foreground whitespace-nowrap">
                  {time}
                </td>
                {matrix.dates.map((col) => {
                  const key = cellKey(col.date, time);
                  const slotAvailable = col.active && col.slots.includes(time);
                  const schedule = scheduleMap.get(key);
                  const styles = schedule
                    ? SCHEDULE_STATUS_STYLES[schedule.status]
                    : null;
                  const isHighlight =
                    schedule && highlightPatientId === schedule.patient_id;
                  const draggable =
                    Boolean(
                      schedule &&
                        onReschedule &&
                        !shiftSelectMode &&
                        isScheduleDraggable(schedule.status)
                    );
                  const isDropTarget =
                    Boolean(
                      draggingId &&
                        !schedule &&
                        canDropScheduleOnCell(col.date, slotAvailable, Boolean(schedule))
                    );
                  const isDragOver = dragOverKey === key;
                  const beforeStart = isBeforeShiftStart(col.date, time, shiftStart);
                  const startCell = isShiftStartCell(col.date, time, shiftStart);
                  const inRange =
                    shiftSelectMode &&
                    isInShiftRange(
                      col.date,
                      time,
                      shiftStart,
                      shiftEnd,
                      shiftRangeMode
                    );
                  const outOfRange =
                    shiftSelectMode &&
                    shiftStart &&
                    !inRange &&
                    (beforeStart ||
                      (shiftEnd?.date &&
                        col.date > shiftEnd.date));

                  return (
                    <td
                      key={key}
                      className={cn("p-0.5", inRange && !startCell && "bg-sky-50/50")}
                      onDragOver={(e) => {
                        if (!isDropTarget || isDropping) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverKey(key);
                      }}
                      onDragLeave={() => {
                        if (dragOverKey === key) setDragOverKey(null);
                      }}
                      onDrop={(e) => handleDrop(e, col.date, time, slotAvailable)}
                    >
                      <button
                        type="button"
                        draggable={draggable}
                        disabled={!slotAvailable && !schedule && !shiftSelectMode}
                        onClick={() =>
                          handleCellClick(col.date, time, slotAvailable, schedule)
                        }
                        onDragStart={(e) => {
                          if (!schedule || !draggable) {
                            e.preventDefault();
                            return;
                          }
                          e.stopPropagation();
                          setDraggingId(schedule.schedule_id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData(DRAG_MIME, schedule.schedule_id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverKey(null);
                        }}
                        className={cn(
                          "relative w-full min-h-[44px] rounded-md border text-left p-1 transition-all",
                          outOfRange && "opacity-30",
                          !slotAvailable &&
                            !schedule &&
                            "bg-muted/30 cursor-not-allowed opacity-50",
                          slotAvailable &&
                            !schedule &&
                            !draggingId &&
                            !shiftSelectMode &&
                            "border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer",
                          shiftSelectMode &&
                            slotAvailable &&
                            "border-dashed border-amber-300/60 hover:border-amber-500 hover:bg-amber-50/80 cursor-pointer",
                          slotAvailable &&
                            !schedule &&
                            isDropTarget &&
                            "border-dashed border-primary/50 bg-primary/5",
                          isDropTarget &&
                            isDragOver &&
                            "ring-2 ring-primary ring-offset-1 bg-primary/10",
                          startCell &&
                            "ring-2 ring-amber-500 ring-offset-1 bg-amber-100/90",
                          schedule && styles?.bg,
                          schedule && styles?.border,
                          schedule && styles?.text,
                          schedule &&
                            !draggable &&
                            !shiftSelectMode &&
                            "cursor-pointer hover:opacity-90",
                          draggable && "cursor-grab active:cursor-grabbing",
                          draggingId === schedule?.schedule_id && "opacity-50",
                          isHighlight && "ring-2 ring-primary ring-offset-1"
                        )}
                      >
                        {startCell && (
                          <span className="pointer-events-none absolute top-0.5 right-0.5 rounded bg-amber-600 px-1 text-[8px] font-semibold text-white">
                            Start
                          </span>
                        )}
                        {schedule ? (
                          <div className="space-y-0.5 pointer-events-none relative">
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
                          <span className="text-[10px] text-muted-foreground pointer-events-none">
                            {draggingId ? "Drop" : shiftSelectMode ? "Anchor" : "+"}
                          </span>
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
