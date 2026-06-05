import type { FormField } from "@/redux/types/formField";
import type { ClinicalSuggestionCategory } from "@/redux/api/clinicalSuggestionApi";

export function inferSuggestionCategory(
  field: FormField
): ClinicalSuggestionCategory {
  const configured = field.config?.suggestion_category as
    | ClinicalSuggestionCategory
    | undefined;
  if (configured) return configured;

  const text = `${field.field_key} ${field.label} ${field.category}`.toLowerCase();
  if (/diagnos|icd|condition/.test(text)) return "diagnosis";
  if (/assess|impression|finding|exam/.test(text)) return "assessment";
  if (/plan|treatment/.test(text)) return "plan";
  if (/prescri|rx|medication|instruction/.test(text)) return "prescription";
  if (/refer/.test(text)) return "referral";
  if (/procedur|operation/.test(text)) return "procedure";
  if (/certif|remark/.test(text)) return "certificate";
  if (/lab|result|interpret/.test(text)) return "assessment";
  if (/discharge|follow/.test(text)) return "plan";
  if (/complaint|history|hpi|chief/.test(text)) return "general";
  return "general";
}

export function shouldEnableClinicalSuggestions(field: FormField) {
  if (field.config?.clinical_suggestions === false) return false;
  if (field.config?.clinical_suggestions === true) return true;
  return ["textarea", "richtext", "input"].includes(field.field_type);
}
