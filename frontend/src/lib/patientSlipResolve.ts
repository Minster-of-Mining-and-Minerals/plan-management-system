import type { PatientRecord } from "@/redux/api/patientApi";
import type { FormField } from "@/redux/types/formField";
import type {
  PatientSlipConfig,
  SlipFieldSlot,
} from "@/redux/types/patientSlipConfig";
import {
  formatPatientFieldValue,
  getPatientFieldValue,
} from "@/lib/patientDisplay";

function getProfile(patient: PatientRecord) {
  return (
    patient.profile ??
    (patient as { patientProfile?: PatientRecord["profile"] }).patientProfile
  );
}

/** Resolve a configured slip field key to a display string. */
export function resolveSlipFieldValue(
  patient: PatientRecord | undefined,
  fieldKey: string,
  fieldMeta?: FormField
): string {
  if (!patient) return "—";

  const profile = getProfile(patient);

  switch (fieldKey) {
    case "@patient_code":
      return profile?.patient_code ?? "—";
    case "@barcode":
      return profile?.barcode ?? profile?.patient_code ?? "—";
    case "@full_name":
      return patient.full_name ?? "—";
    case "@email":
      return patient.email ?? "—";
    case "@phone":
      return patient.phone_number ?? "—";
    case "@place_of_birth": {
      const city = getPatientFieldValue(patient, "city");
      const region = getPatientFieldValue(patient, "region");
      const country = getPatientFieldValue(patient, "country");
      const parts = [city, region, country]
        .filter((v) => v != null && String(v).trim() !== "")
        .map(String);
      return parts.length ? parts.join(", ") : "—";
    }
    default: {
      const raw = getPatientFieldValue(patient, fieldKey);
      return formatPatientFieldValue(fieldMeta, raw);
    }
  }
}

export function resolveSlipBarcode(
  patient: PatientRecord | undefined,
  config: PatientSlipConfig,
  fieldByKey: Map<string, FormField>
): string {
  if (!patient) return "";
  const key = config.barcode_field_key || "@barcode";
  const value = resolveSlipFieldValue(
    patient,
    key,
    fieldByKey.get(key.replace(/^@/, ""))
  );
  return value === "—" ? "" : value;
}

export function buildSlipRows(
  patient: PatientRecord | undefined,
  slots: SlipFieldSlot[],
  fieldByKey: Map<string, FormField>
) {
  return slots
    .filter((s) => s.enabled)
    .map((slot) => ({
      labelAm: slot.label_am,
      labelEn: slot.label_en,
      value: resolveSlipFieldValue(
        patient,
        slot.field_key,
        fieldByKey.get(slot.field_key)
      ),
    }));
}

export function resolveSlipHeader(config: PatientSlipConfig, branding: {
  logo_url?: string;
  system_name?: string;
  system_name_am?: string | null;
}) {
  return {
    logoUrl: config.header.use_branding_logo
      ? branding.logo_url
      : config.header.logo_url || branding.logo_url,
    titleAm: config.header.use_branding_title
      ? branding.system_name_am
      : config.header.title_am || branding.system_name_am,
    titleEn: config.header.use_branding_title
      ? branding.system_name
      : config.header.title_en || branding.system_name,
    logoWidth: config.header.logo_width_px,
    logoHeight: config.header.logo_height_px,
  };
}
