import type { PatientSchedule, PatientScheduleStatus } from "@/redux/api/scheduleApi";

/** Statuses that occupy the calendar (matches backend overlap checks). */
export const BLOCKING_SCHEDULE_STATUSES: PatientScheduleStatus[] = [
  "scheduled",
  "pending",
  "admitted",
  "updated",
  "rescheduled",
  "completed",
];

export function isBlockingScheduleStatus(status: PatientScheduleStatus) {
  return BLOCKING_SCHEDULE_STATUSES.includes(status);
}

function parseTimeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function slotEndTime(startTime: string, intervalMinutes: number) {
  const end = parseTimeToMinutes(startTime) + intervalMinutes;
  const h = Math.floor(end / 60);
  const m = end % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  const a0 = parseTimeToMinutes(startA);
  const a1 = parseTimeToMinutes(endA);
  const b0 = parseTimeToMinutes(startB);
  const b1 = parseTimeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

export function getBlockingSchedules(schedules: PatientSchedule[]) {
  return schedules.filter((s) => isBlockingScheduleStatus(s.status));
}

/** Schedule whose slot starts exactly at this cell (for card display). */
export function getScheduleStartingAt(
  schedules: PatientSchedule[],
  date: string,
  time: string
) {
  return schedules.find(
    (s) => s.schedule_date === date && s.start_time === time && isBlockingScheduleStatus(s.status)
  );
}

/** True if any blocking appointment overlaps this slot window. */
export function isSlotOccupied(
  schedules: PatientSchedule[],
  date: string,
  time: string,
  intervalMinutes: number
) {
  const slotEnd = slotEndTime(time, intervalMinutes);
  return getBlockingSchedules(schedules).some(
    (s) =>
      s.schedule_date === date &&
      timesOverlap(time, slotEnd, s.start_time, s.end_time)
  );
}
