"use strict";

/**
 * Generate time slot strings (HH:mm) for a day from schedule rules.
 */
function parseTimeToMinutes(timeStr) {
  const [h, m] = String(timeStr).split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateSlotsForDay(dayConfig, intervalMinutes) {
  if (!dayConfig?.active) return [];

  const start = parseTimeToMinutes(dayConfig.start || "07:30");
  const end = parseTimeToMinutes(dayConfig.end || "17:00");
  const lunchStart = dayConfig.lunch_start
    ? parseTimeToMinutes(dayConfig.lunch_start)
    : null;
  const lunchEnd = dayConfig.lunch_end
    ? parseTimeToMinutes(dayConfig.lunch_end)
    : null;

  const interval = Math.min(7, Math.max(5, Number(intervalMinutes) || 5));
  const slots = [];

  for (let t = start; t < end; t += interval) {
    if (lunchStart != null && lunchEnd != null && t >= lunchStart && t < lunchEnd) {
      continue;
    }
    slots.push(minutesToTime(t));
  }

  return slots;
}

function getEndTimeFromStart(startTime, intervalMinutes) {
  const start = parseTimeToMinutes(startTime);
  const end = start + (Number(intervalMinutes) || 5);
  return minutesToTime(end);
}

function timesOverlap(startA, endA, startB, endB) {
  const a0 = parseTimeToMinutes(startA);
  const a1 = parseTimeToMinutes(endA);
  const b0 = parseTimeToMinutes(startB);
  const b1 = parseTimeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

function addMinutesToTime(timeStr, minutes) {
  return minutesToTime(parseTimeToMinutes(timeStr) + minutes);
}

function formatDateOnly(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

function addDaysToDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatDateOnly(d);
}

module.exports = {
  parseTimeToMinutes,
  minutesToTime,
  generateSlotsForDay,
  getEndTimeFromStart,
  timesOverlap,
  addMinutesToTime,
  formatDateOnly,
  addDaysToDate,
};
