import type { PatientRecord } from "@/redux/api/patientApi";
import type { FormField, UserFormConfigGrouped } from "@/redux/types/formField";
import {
  getVisibleSteps,
  flattenFormFields,
} from "@/redux/types/formField";
import { isFieldEffectivelyVisible } from "@/lib/formFieldRules";

const CORE_USER_KEYS = ["full_name", "email", "phone_number"] as const;

const PROFILE_KEYS = [
  "date_of_birth",
  "gender",
  "blood_group",
  "marital_status",
  "nationality",
  "preferred_language",
] as const;

const PROFILE_KEY_ALIASES: Record<string, string> = {
  blood_type: "blood_group",
};

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function getProfile(patient: PatientRecord | undefined) {
  if (!patient) return undefined;
  return (
    patient.profile ??
    (patient as { patientProfile?: PatientRecord["profile"] }).patientProfile
  );
}

/** Resolve a field value from user root, profile columns, or custom_fields. */
export function getPatientFieldValue(
  patient: PatientRecord | undefined,
  fieldKey: string
): unknown {
  if (!patient) return undefined;

  if ((CORE_USER_KEYS as readonly string[]).includes(fieldKey)) {
    return patient[fieldKey as keyof PatientRecord];
  }

  const custom = patient.custom_fields ?? {};
  const profile = getProfile(patient);

  const profileKey =
    (PROFILE_KEY_ALIASES[fieldKey] as (typeof PROFILE_KEYS)[number]) ||
    (fieldKey as (typeof PROFILE_KEYS)[number]);

  if ((PROFILE_KEYS as readonly string[]).includes(profileKey)) {
    const fromProfile = profile?.[profileKey as keyof NonNullable<typeof profile>];
    if (!isEmpty(fromProfile)) return fromProfile;
  }

  if (!isEmpty(custom[fieldKey])) return custom[fieldKey];

  return undefined;
}

export function formatPatientFieldValue(
  field: FormField | undefined,
  value: unknown
): string {
  if (isEmpty(value)) return "—";

  if (field?.field_type === "date") {
    const d = new Date(String(value));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  if (field?.field_type === "checkbox" || Array.isArray(value)) {
    return Array.isArray(value) ? value.join(", ") : String(value);
  }

  if (field?.field_type === "file") {
    return typeof value === "string" ? value : "—";
  }

  return String(value);
}

export type PatientDisplayField = {
  field: FormField;
  label: string;
  value: unknown;
  displayValue: string;
  isFile: boolean;
};

export type PatientDisplaySection = {
  groupId: string;
  title: string;
  description?: string | null;
  fields: PatientDisplayField[];
};

export function buildPatientDisplaySections(
  config: UserFormConfigGrouped | undefined,
  patient: PatientRecord | undefined
): PatientDisplaySection[] {
  if (!patient || !config) return [];

  const sections: PatientDisplaySection[] = [];

  for (const step of getVisibleSteps(config)) {
    const fields: PatientDisplayField[] = [];

    for (const field of step.fields || []) {
      if (!isFieldEffectivelyVisible(step, field)) continue;

      const value = getPatientFieldValue(patient, field.field_key);
      if (isEmpty(value) && field.field_type !== "file") continue;

      fields.push({
        field,
        label: field.label,
        value,
        displayValue: formatPatientFieldValue(field, value),
        isFile: field.field_type === "file",
      });
    }

    if (fields.length > 0) {
      sections.push({
        groupId: step.group_id,
        title: step.title,
        description: step.description,
        fields,
      });
    }
  }

  return sections;
}

export function collectPatientFileAttachments(
  config: UserFormConfigGrouped | undefined,
  patient: PatientRecord | undefined
): PatientDisplayField[] {
  if (!patient || !config) return [];

  const files: PatientDisplayField[] = [];
  for (const field of flattenFormFields(config)) {
    if (field.field_type !== "file" || !field.is_visible) continue;
    const value = getPatientFieldValue(patient, field.field_key);
    if (isEmpty(value)) continue;
    files.push({
      field,
      label: field.label,
      value,
      displayValue: formatPatientFieldValue(field, value),
      isFile: true,
    });
  }
  return files;
}

/** Values commonly shown on the identification slip. */
export function getPatientSlipData(patient: PatientRecord | undefined) {
  const profile = getProfile(patient);
  const city = getPatientFieldValue(patient, "city");
  const region = getPatientFieldValue(patient, "region");
  const country = getPatientFieldValue(patient, "country");

  const placeParts = [city, region, country]
    .filter((v) => !isEmpty(v))
    .map(String);

  return {
    registrationNo: profile?.patient_code ?? "—",
    fullName: patient?.full_name ?? "—",
    placeOfBirth: placeParts.length ? placeParts.join(", ") : "—",
    dateOfBirth: formatPatientFieldValue(
      { field_type: "date" } as FormField,
      getPatientFieldValue(patient, "date_of_birth")
    ),
    sex: String(getPatientFieldValue(patient, "gender") ?? "—"),
    subCity: String(city ?? "—"),
    woreda: String(getPatientFieldValue(patient, "postal_code") ?? "—"),
    houseNo: String(getPatientFieldValue(patient, "street_address") ?? "—"),
    phone: String(patient?.phone_number ?? "—"),
    barcode: profile?.barcode ?? profile?.patient_code ?? "",
  };
}

export function patientStatusLabel(patient: PatientRecord | undefined): string {
  const status = getProfile(patient)?.patient_status ?? "active";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function patientActiveBadge(patient: PatientRecord | undefined): {
  label: string;
  variant: "active" | "inactive";
} {
  const active = patient?.is_active !== false;
  return active
    ? { label: "Active", variant: "active" }
    : { label: "Inactive", variant: "inactive" };
}

export function getPatientInitials(name?: string): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
