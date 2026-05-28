import type { DiagnosisFormConfig } from "@/redux/api/diagnosisFormApi";
import type { DynamicFormValues, UserFormConfigGrouped } from "@/redux/types/formField";
import { flattenFormFields } from "@/redux/types/formField";

const TITLE_KEYS = [
  "header_title",
  "report_title",
  "title",
  "diagnosis_title",
  "entry_title",
];

const NOTE_KEYS = ["notes", "note", "comments", "remarks", "clinical_notes"];

export function deriveHeaderTitle(
  values: DynamicFormValues,
  formConfig?: DiagnosisFormConfig | null
): string {
  for (const key of TITLE_KEYS) {
    const v = values[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (formConfig?.title?.trim()) return formConfig.title.trim();
  return "Diagnosis report";
}

export function deriveNotes(values: DynamicFormValues): string | undefined {
  for (const key of NOTE_KEYS) {
    const v = values[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export function extractAttachmentIds(
  values: DynamicFormValues,
  grouped?: UserFormConfigGrouped | null
): string[] {
  if (!grouped) return [];
  const ids: string[] = [];
  const fileFields = flattenFormFields(grouped).filter((f) => f.field_type === "file");

  for (const field of fileFields) {
    const v = values[field.field_key];
    if (typeof v === "string" && v) ids.push(v);
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string" && item) ids.push(item);
      }
    }
  }

  return [...new Set(ids)];
}
