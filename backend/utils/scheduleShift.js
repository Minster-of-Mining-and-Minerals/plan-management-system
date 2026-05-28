"use strict";

const {
  parseTimeToMinutes,
  addDaysToDate,
} = require("./scheduleSlots");

/**
 * Move by N active weekdays (skips inactive days in settings.days_config).
 */
function shiftDateByActiveDays(dateStr, activeDaySteps, settings, isDateInHorizon, isDayActive) {
  if (!activeDaySteps) return dateStr;

  const dir = activeDaySteps > 0 ? 1 : -1;
  let remaining = Math.abs(activeDaySteps);
  let date = dateStr;

  while (remaining > 0) {
    date = addDaysToDate(date, dir);
    let guard = 0;
    while (guard < 400) {
      if (!isDateInHorizon(date, settings)) {
        const err = new Error(
          `Shift moved beyond allowed scheduling horizon (${date})`
        );
        err.status = 400;
        throw err;
      }
      if (isDayActive(date, settings)) break;
      date = addDaysToDate(date, dir);
      guard++;
    }
    if (guard >= 400) {
      const err = new Error("Could not find an active day for shift");
      err.status = 400;
      throw err;
    }
    remaining--;
  }

  return date;
}

function snapTimeToDateSlots(timeStr, fromDate, toDate, getSlotsForDate) {
  const slots = getSlotsForDate(toDate);
  if (!slots.length) {
    const err = new Error(`No active slots on ${toDate}`);
    err.status = 400;
    throw err;
  }
  if (slots.includes(timeStr)) return timeStr;

  const fromSlots = getSlotsForDate(fromDate);
  const fromIdx = fromSlots.indexOf(timeStr);
  if (fromIdx >= 0 && fromIdx < slots.length) {
    return slots[fromIdx];
  }

  const targetMin = parseTimeToMinutes(timeStr);
  let best = slots[0];
  let bestDiff = Infinity;
  for (const s of slots) {
    const diff = Math.abs(parseTimeToMinutes(s) - targetMin);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  return best;
}

/**
 * Shift date/time: horizontal steps skip inactive days; vertical overflow
 * wraps to the first slot(s) of the next active day.
 */
function computeShiftedDateTime(
  dateStr,
  timeStr,
  shiftMinutes,
  shiftDays,
  settings,
  { getSlotsForDate, isDateInHorizon, isDayActive }
) {
  if (!settings) {
    const err = new Error("Schedule settings are not configured");
    err.status = 500;
    throw err;
  }

  let date = dateStr;
  let time = timeStr;
  const interval = Math.min(7, Math.max(5, Number(settings.slot_interval_minutes) || 5));

  if (shiftDays) {
    date = shiftDateByActiveDays(
      date,
      shiftDays,
      settings,
      isDateInHorizon,
      isDayActive
    );
    time = snapTimeToDateSlots(time, dateStr, date, getSlotsForDate);
  }

  if (!shiftMinutes) {
    const slots = getSlotsForDate(date);
    if (!slots.includes(time)) {
      time = snapTimeToDateSlots(time, dateStr, date, getSlotsForDate);
    }
    return { date, time };
  }

  const slotSteps = Math.round(shiftMinutes / interval);
  if (slotSteps === 0) {
    return { date, time };
  }

  let slots = getSlotsForDate(date);
  if (!slots.length) {
    date = shiftDateByActiveDays(
      date,
      slotSteps > 0 ? 1 : -1,
      settings,
      isDateInHorizon,
      isDayActive
    );
    slots = getSlotsForDate(date);
    time = slotSteps > 0 ? slots[0] : slots[slots.length - 1];
  }

  let idx = slots.indexOf(time);
  if (idx < 0) {
    const target = parseTimeToMinutes(time);
    idx = slots.findIndex((s) => parseTimeToMinutes(s) >= target);
    if (idx < 0) idx = slots.length - 1;
  }

  idx += slotSteps;

  while (idx >= slots.length) {
    idx -= slots.length;
    date = shiftDateByActiveDays(date, 1, settings, isDateInHorizon, isDayActive);
    slots = getSlotsForDate(date);
    if (!slots.length) {
      const err = new Error(`No active slots on ${date} after time shift`);
      err.status = 400;
      throw err;
    }
  }

  while (idx < 0) {
    date = shiftDateByActiveDays(date, -1, settings, isDateInHorizon, isDayActive);
    slots = getSlotsForDate(date);
    if (!slots.length) {
      const err = new Error(`No active slots on ${date} after time shift`);
      err.status = 400;
      throw err;
    }
    idx += slots.length;
  }

  time = slots[idx];
  return { date, time };
}

/**
 * @param {object} row schedule row
 * @param {object} range
 * @param {string} range.anchor_date
 * @param {string} [range.anchor_time]
 * @param {string} [range.end_date]
 * @param {string} [range.end_time]
 * @param {string} [range.range_mode] from_start_to_end | from_start_to_column | column_to_column
 */
function rowMatchesShiftRange(
  row,
  {
    anchor_date,
    anchor_time,
    end_date,
    end_time,
    range_mode = "from_start_to_end",
  }
) {
  if (!anchor_date) return true;

  const d = row.schedule_date;
  const t = row.start_time;

  if (d < anchor_date) return false;
  if (d === anchor_date && anchor_time && t < anchor_time) return false;

  if (range_mode === "from_start_to_end" || !end_date) {
    return true;
  }

  if (d > end_date) return false;
  if (d === end_date && end_time && t > end_time) return false;

  return true;
}

module.exports = {
  shiftDateByActiveDays,
  computeShiftedDateTime,
  rowMatchesShiftRange,
};
