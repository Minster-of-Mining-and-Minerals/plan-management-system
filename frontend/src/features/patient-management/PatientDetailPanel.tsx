"use client";

import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicUserFormFields } from "@/components/dynamic-form/DynamicUserFormFields";
import type { PatientRecord } from "@/redux/api/patientApi";
import type {
  DynamicFormValues,
  UserFormConfigGrouped,
} from "@/redux/types/formField";
import {
  buildPatientDisplaySections,
  collectPatientFileAttachments,
  getPatientInitials,
  patientActiveBadge,
  patientStatusLabel,
} from "@/lib/patientDisplay";

function getProfile(patient: PatientRecord) {
  return (
    patient.profile ??
    (patient as { patientProfile?: PatientRecord["profile"] }).patientProfile
  );
}

interface PatientDetailPanelProps {
  patient: PatientRecord;
  formConfig?: UserFormConfigGrouped;
  isEditing?: boolean;
  values?: DynamicFormValues;
  errors?: Record<string, string>;
  onChange?: (key: string, value: unknown) => void;
  onFileSelect?: (key: string, file: File | null) => void;
  patientStatus?: string;
  onPatientStatusChange?: (status: string) => void;
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "yellow" | "gray";
}) {
  const tones = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
    yellow: "bg-amber-100 text-amber-800 border-amber-200",
    gray: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="text-muted-foreground">{label} — </span>
      <span className="font-semibold text-foreground">{value}</span>
    </p>
  );
}

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url, "http://local").pathname;
    const name = path.split("/").pop();
    return name && name.length > 0 ? decodeURIComponent(name) : "Document";
  } catch {
    return "Document";
  }
}

const PATIENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "deceased", label: "Deceased" },
  { value: "archived", label: "Archived" },
];

export function PatientDetailPanel({
  patient,
  formConfig,
  isEditing = false,
  values = {},
  errors = {},
  onChange,
  onFileSelect,
  patientStatus = "active",
  onPatientStatusChange,
}: PatientDetailPanelProps) {
  const profile = getProfile(patient);
  const sections = buildPatientDisplaySections(formConfig, patient);
  const attachments = collectPatientFileAttachments(formConfig, patient);
  const activeBadge = patientActiveBadge(patient);
  const accountSection = sections.find((s) => s.title === "Account");
  const otherSections = sections.filter((s) => s.title !== "Account");

  const statusTone =
    profile?.patient_status === "active"
      ? "green"
      : profile?.patient_status === "inactive"
        ? "gray"
        : "yellow";

  if (isEditing && formConfig && onChange) {
    return (
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="border-b p-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 shrink-0 rounded-xl border-2 border-primary/30">
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl font-bold">
                {getPatientInitials(patient.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              {profile?.patient_code && (
                <p className="text-sm text-muted-foreground">
                  Patient Code:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {profile.patient_code}
                  </span>
                </p>
              )}
              <div className="max-w-xs">
                <Label className="text-muted-foreground">Clinical Status</Label>
                <Select
                  value={patientStatus}
                  onValueChange={onPatientStatusChange}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATIENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <DynamicUserFormFields
            grouped={formConfig}
            values={values}
            errors={errors}
            onChange={onChange}
            onFileSelect={onFileSelect}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-col items-center gap-3 shrink-0 lg:w-36">
            <Avatar className="h-28 w-28 rounded-xl border-2 border-primary/30">
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                {getPatientInitials(patient.full_name)}
              </AvatarFallback>
            </Avatar>
            <StatusPill
              label={activeBadge.label}
              tone={activeBadge.variant === "active" ? "green" : "gray"}
            />
          </div>

          <div className="flex-1 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-primary font-semibold text-base mb-3">
                {accountSection?.title ?? "Basic Information"}
              </h3>
              <div className="space-y-1.5">
                {profile?.patient_code && (
                  <FieldRow
                    label="Patient Code"
                    value={profile.patient_code}
                  />
                )}
                <FieldRow label="Full Name" value={patient.full_name || "—"} />
                <FieldRow label="Email" value={patient.email || "—"} />
                <FieldRow
                  label="Phone Number"
                  value={patient.phone_number || "—"}
                />
                {accountSection?.fields
                  .filter(
                    (f) =>
                      !["full_name", "email", "phone_number"].includes(
                        f.field.field_key
                      )
                  )
                  .map((f) => (
                    <FieldRow
                      key={f.field.field_key}
                      label={f.label}
                      value={f.displayValue}
                    />
                  ))}
              </div>
            </div>

            <div>
              <h3 className="text-primary font-semibold text-base mb-3">
                Registration
              </h3>
              <div className="space-y-1.5">
                <p className="text-sm">
                  <span className="text-muted-foreground">Status — </span>
                  <StatusPill
                    label={patientStatusLabel(patient)}
                    tone={statusTone}
                  />
                </p>
                {profile?.registered_at && (
                  <FieldRow
                    label="Registered"
                    value={new Date(profile.registered_at).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {otherSections.length > 0 && (
        <div className="grid gap-6 p-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {otherSections.map((section) => (
            <div key={section.groupId}>
              <h3 className="text-primary font-semibold text-base mb-3">
                {section.title}
              </h3>
              {section.description && (
                <p className="text-xs text-muted-foreground mb-3">
                  {section.description}
                </p>
              )}
              <div className="space-y-1.5">
                {section.fields
                  .filter((f) => !f.isFile)
                  .map((f) => (
                    <FieldRow
                      key={f.field.field_key}
                      label={f.label}
                      value={f.displayValue}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="p-6 border-t">
          <h3 className="text-primary font-semibold text-base mb-3">
            Attachments
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {attachments.map((file) => {
              const url = String(file.value);
              return (
                <div
                  key={file.field.field_key}
                  className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3"
                >
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {file.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {fileNameFromUrl(url)}
                    </p>
                  </div>
                  <Link
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 shrink-0"
                  >
                    View
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
