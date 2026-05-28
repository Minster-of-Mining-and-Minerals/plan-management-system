"use strict";

/** Weekday keys: 0=Sunday … 6=Saturday */
const DEFAULT_SCHEDULE_SETTINGS = {
  slot_interval_minutes: 5,
  horizon_days: 365,
  days_config: {
    "0": { active: false, start: "07:30", end: "17:00", lunch_start: "13:30", lunch_end: "14:00" },
    "1": { active: true, start: "07:30", end: "17:00", lunch_start: "13:30", lunch_end: "14:00" },
    "2": { active: true, start: "07:30", end: "17:00", lunch_start: "13:30", lunch_end: "14:00" },
    "3": { active: true, start: "07:30", end: "17:00", lunch_start: "13:30", lunch_end: "14:00" },
    "4": { active: true, start: "07:30", end: "17:00", lunch_start: "13:30", lunch_end: "14:00" },
    "5": { active: true, start: "07:30", end: "17:00", lunch_start: "13:30", lunch_end: "14:00" },
    "6": { active: false, start: "07:30", end: "17:00", lunch_start: "13:30", lunch_end: "14:00" },
  },
};

const SCHEDULE_STATUSES = [
  "scheduled",
  "pending",
  "admitted",
  "completed",
  "cancelled",
  "updated",
  "rescheduled",
];

module.exports = {
  DEFAULT_SCHEDULE_SETTINGS,
  SCHEDULE_STATUSES,
};
