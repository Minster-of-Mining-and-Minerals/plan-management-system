import type { MedicalHistoryLog } from "@/redux/api/medicalWorkflowApi";

export type ReportTheme = {
  card: string;
  trigger: string;
  triggerOpen: string;
  innerDot: string;
  timelineDot: string;
  actionBadge: string;
  statusBadge: string;
};

export function getReportTheme(entry: MedicalHistoryLog): ReportTheme {
  switch (entry.action_type) {
    case "forward":
    case "return":
      return {
        card: "border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-card to-card shadow-sm dark:border-violet-900/60 dark:from-violet-950/35",
        trigger: "hover:bg-violet-50/70 dark:hover:bg-violet-950/25",
        triggerOpen: "border-b border-violet-100/80 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20",
        innerDot: "bg-violet-500",
        timelineDot: "border-violet-500 bg-background",
        actionBadge:
          "border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100",
        statusBadge:
          "border-violet-300 bg-violet-500/15 text-violet-800 dark:text-violet-200",
      };
    case "prescribe":
      return {
        card: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-card to-card shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/35",
        trigger: "hover:bg-emerald-50/70 dark:hover:bg-emerald-950/25",
        triggerOpen:
          "border-b border-emerald-100/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
        innerDot: "bg-emerald-500",
        timelineDot: "border-emerald-500 bg-background",
        actionBadge:
          "border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
        statusBadge:
          "border-emerald-300 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
      };
    case "complete":
      return {
        card: "border-slate-300/90 bg-gradient-to-br from-slate-100/90 via-card to-card shadow-sm dark:border-slate-700 dark:from-slate-900/40",
        trigger: "hover:bg-slate-50/80 dark:hover:bg-slate-900/30",
        triggerOpen:
          "border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/25",
        innerDot: "bg-slate-500",
        timelineDot: "border-slate-500 bg-background",
        actionBadge:
          "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        statusBadge:
          "border-slate-300 bg-slate-500/15 text-slate-700 dark:text-slate-200",
      };
    default:
      return {
        card: "border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-card to-card shadow-sm dark:border-sky-900/60 dark:from-sky-950/35",
        trigger: "hover:bg-sky-50/70 dark:hover:bg-sky-950/25",
        triggerOpen:
          "border-b border-sky-100/80 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20",
        innerDot: "bg-sky-500",
        timelineDot: "border-sky-500 bg-background",
        actionBadge:
          "border-sky-200 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
        statusBadge:
          "border-sky-300 bg-sky-500/15 text-sky-800 dark:text-sky-200",
      };
  }
}
