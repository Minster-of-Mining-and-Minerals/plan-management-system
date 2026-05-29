import type { MedicalHistoryLog } from "@/redux/api/medicalWorkflowApi";

/** Routing / workflow meta — shown in history log panel only, not diagnosis reports. */
export const WORKFLOW_ROUTING_ACTION_TYPES = new Set([
  "forward",
  "return",
  "complete",
]);

export function isDiagnosisReportEntry(entry: MedicalHistoryLog): boolean {
  return !WORKFLOW_ROUTING_ACTION_TYPES.has(entry.action_type);
}

export function filterDiagnosisReportEntries(
  entries: MedicalHistoryLog[]
): MedicalHistoryLog[] {
  return entries.filter(isDiagnosisReportEntry);
}
