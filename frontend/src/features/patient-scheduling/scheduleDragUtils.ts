import type { PatientScheduleStatus } from "@/redux/api/scheduleApi";

export function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

const NON_DRAGGABLE_STATUSES: PatientScheduleStatus[] = ["admitted", "cancelled"];

export function isScheduleDraggable(status: PatientScheduleStatus) {
  return !NON_DRAGGABLE_STATUSES.includes(status);
}

export function isDateOnOrAfterToday(date: string) {
  return date >= formatToday();
}

export function canDropScheduleOnCell(
  date: string,
  slotAvailable: boolean,
  occupied: boolean
) {
  return isDateOnOrAfterToday(date) && slotAvailable && !occupied;
}

export function canCancelSchedule(schedule: {
  status: PatientScheduleStatus;
  schedule_date: string;
}) {
  return schedule.status === "scheduled" && isDateOnOrAfterToday(schedule.schedule_date);
}

export type ShiftAnchor = { date: string; time?: string };

export type ShiftRangeMode =
  | "from_start_to_end"
  | "from_start_to_column"
  | "column_to_column";

export function compareScheduleSlot(date: string, time: string) {
  return `${date}T${time || "00:00"}`;
}

/** True if slot is strictly before the anchor start. */
export function isBeforeShiftStart(
  date: string,
  time: string,
  start: ShiftAnchor | null | undefined
) {
  if (!start) return false;
  if (date < start.date) return true;
  if (date > start.date) return false;
  if (!start.time) return false;
  return time < start.time;
}

/** True if slot is strictly after the anchor end. */
export function isAfterShiftEnd(
  date: string,
  time: string,
  end: ShiftAnchor | null | undefined
) {
  if (!end) return false;
  if (date > end.date) return true;
  if (date < end.date) return false;
  if (!end.time) return false;
  return time > end.time;
}

export function isInShiftRange(
  date: string,
  time: string,
  start: ShiftAnchor | null | undefined,
  end: ShiftAnchor | null | undefined,
  mode: ShiftRangeMode
) {
  if (!start) return false;
  if (isBeforeShiftStart(date, time, start)) return false;
  if (mode === "from_start_to_end" || !end?.date) return true;
  if (isAfterShiftEnd(date, time, end)) return false;
  return true;
}

export function isShiftStartColumn(
  colDate: string,
  start: ShiftAnchor | null | undefined
) {
  return Boolean(start && start.date === colDate && !start.time);
}

export function isShiftStartCell(
  colDate: string,
  time: string,
  start: ShiftAnchor | null | undefined
) {
  return Boolean(start && start.date === colDate && start.time === time);
}

export function isShiftEndColumn(
  colDate: string,
  end: ShiftAnchor | null | undefined
) {
  return Boolean(end && end.date === colDate && !end.time);
}
