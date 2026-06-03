"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Edit, Save, X } from "lucide-react";
import {
  useGetPatientByIdQuery,
  useUpdatePatientMutation,
  type PatientRecord,
} from "@/redux/api/patientApi";
import { useGetUserFormConfigQuery } from "@/redux/api/formFieldApi";
import { useUploadAttachmentsMutation } from "@/redux/api/attachementApi";
import { PatientDetailPanel } from "@/features/patient-management/PatientDetailPanel";
import { PatientIdentificationSlip } from "@/features/patient-management/PatientIdentificationSlip";
import { PatientScheduleListCards } from "@/features/patient-management/PatientScheduleListCards";
import { PatientPrescriptionPharmacyPanel } from "@/features/patient-management/PatientPrescriptionPharmacyPanel";
import Loading01 from "@/features/template/component/Loading/Loading01";
import DetailHeader from "@/components/common/DetailHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getFileUrl } from "@/utils/fileUrl";
import {
  validateAllFormSteps,
  buildUserPayloadFromDynamicValues,
  flattenFormFields,
} from "@/lib/dynamicFormValidation";
import { initialValuesFromPatient } from "@/lib/patientDisplay";
import type { DynamicFormValues } from "@/redux/types/formField";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;

  const { data: patient, isLoading, isError, refetch } =
    useGetPatientByIdQuery(patientId);
  const { data: formConfig } = useGetUserFormConfigQuery();
  const [updatePatient, { isLoading: isUpdating }] = useUpdatePatientMutation();
  const [uploadFiles] = useUploadAttachmentsMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<DynamicFormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filesByKey, setFilesByKey] = useState<Record<string, File>>({});
  const [patientStatus, setPatientStatus] = useState("active");

  const profile = patient
    ? patient.profile ??
      (patient as { patientProfile?: PatientRecord["profile"] }).patientProfile
    : undefined;

  const resetEditState = () => {
    if (!patient || !formConfig) return;
    const fields = flattenFormFields(formConfig);
    setValues(initialValuesFromPatient(fields, patient));
    setErrors({});
    setFilesByKey({});
    setPatientStatus(profile?.patient_status ?? "active");
  };

  useEffect(() => {
    if (patient && formConfig && !isEditing) {
      resetEditState();
    }
  }, [patient, formConfig, isEditing]);

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (!patient || !formConfig) return;

    const validationErrors = validateAllFormSteps(
      formConfig,
      values,
      filesByKey
    );
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      toast.error("Please fix form errors");
      return;
    }

    try {
      const formFields = flattenFormFields(formConfig);
      const payload = buildUserPayloadFromDynamicValues(formFields, values);
      payload.patient_status = patientStatus;

      for (const field of formFields) {
        if (field.field_type !== "file") continue;
        const file = filesByKey[field.field_key];
        if (!file) continue;
        const uploaded = await uploadFiles({ files: [file] }).unwrap();
        const attachment = uploaded.attachments?.[0];
        const url = attachment ? getFileUrl(attachment.file_path) : undefined;
        if (url) {
          if (!payload.custom_fields) payload.custom_fields = {};
          (payload.custom_fields as Record<string, unknown>)[field.field_key] =
            url;
          payload[field.field_key] = url;
        }
      }

      await updatePatient({ id: patientId, body: payload }).unwrap();
      toast.success("Patient updated successfully");
      setIsEditing(false);
      refetch();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to update patient";
      toast.error(message);
    }
  };

  const handleCancel = () => {
    resetEditState();
    setIsEditing(false);
  };

  if (isLoading) return <Loading01 />;

  if (isError || !patient) {
    return (
      <div className="space-y-4">
        <DetailHeader
          breadcrumbs={[
            { title: "Patients", link: "/patients/list" },
            { title: "Not found" },
          ]}
        />
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <DetailHeader
          breadcrumbs={[
            { title: "Patients", link: "/patients/list" },
            { title: patient.full_name },
          ]}
        />
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isUpdating}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                <Save className="mr-2 h-4 w-4" />
                {isUpdating ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetEditState();
                setIsEditing(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Patient
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_auto]">
        <PatientDetailPanel
          patient={patient}
          formConfig={formConfig}
          isEditing={isEditing}
          values={values}
          errors={errors}
          onChange={handleChange}
          onFileSelect={(key: string, file: File | null) => {
            setFilesByKey((prev) => {
              const next = { ...prev };
              if (file) next[key] = file;
              else delete next[key];
              return next;
            });
          }}
          patientStatus={patientStatus}
          onPatientStatusChange={setPatientStatus}
        />
        <div className="flex w-full justify-center xl:sticky xl:top-4 xl:w-auto xl:justify-start">
          <PatientIdentificationSlip patient={patient} />
        </div>
      </div>

      {/* <PatientPrescriptionPharmacyPanel patientId={patientId} /> */}

      <PatientScheduleListCards patientId={patientId} />
    </div>
  );
}
