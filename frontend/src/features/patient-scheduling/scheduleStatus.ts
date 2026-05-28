import type { PatientScheduleStatus } from "@/redux/api/scheduleApi";

export const SCHEDULE_STATUS_LABELS: Record<PatientScheduleStatus, string> = {
  scheduled: "Scheduled",
  pending: "Pending",
  admitted: "Admitted",
  completed: "Completed",
  cancelled: "Cancelled",
  updated: "Updated",
  rescheduled: "Rescheduled",
};

export const SCHEDULE_STATUS_STYLES: Record<
  PatientScheduleStatus,
  { bg: string; text: string; border: string }
> = {
  scheduled: {
    bg: "bg-blue-500/15",
    text: "text-blue-800 dark:text-blue-200",
    border: "border-blue-500/40",
  },
  pending: {
    bg: "bg-amber-500/15",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-500/40",
  },
  admitted: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-800 dark:text-cyan-200",
    border: "border-cyan-500/40",
  },
  completed: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-500/40",
  },
  cancelled: {
    bg: "bg-red-500/15",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-500/40",
  },
  updated: {
    bg: "bg-violet-500/15",
    text: "text-violet-800 dark:text-violet-200",
    border: "border-violet-500/40",
  },
  rescheduled: {
    bg: "bg-purple-500/15",
    text: "text-purple-800 dark:text-purple-200",
    border: "border-purple-500/40",
  },
};
