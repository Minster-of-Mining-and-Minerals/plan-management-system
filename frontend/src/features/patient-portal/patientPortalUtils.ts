import type { PatientPortalSchedule } from "@/redux/api/patientPortalApi";
import type { NotificationType } from "./types";

const UPCOMING_STATUSES = new Set([
  "scheduled",
  "pending",
  "updated",
  "rescheduled",
  "admitted",
  "confirmed",
]);

export function initialsFromName(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function formatScheduleTime(time?: string | null) {
  if (!time) return "—";
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isUpcomingSchedule(schedule: PatientPortalSchedule) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    UPCOMING_STATUSES.has(schedule.status) && schedule.schedule_date >= today
  );
}

export function notificationTypeFromCategory(
  category?: string | null
): NotificationType {
  const value = (category || "").toLowerCase();
  if (value.includes("appointment") || value.includes("schedule")) {
    return "appointment";
  }
  if (value.includes("prescription") || value.includes("pharmacy")) {
    return "prescription";
  }
  if (value.includes("lab")) return "lab";
  if (value.includes("bill") || value.includes("payment")) return "billing";
  return "general";
}
