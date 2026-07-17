"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { useGetUserFormConfigQuery } from "@/redux/api/formFieldApi";
import { useCreatePatientMutation } from "@/redux/api/patientApi";
import { useUploadAttachmentsMutation } from "@/redux/api/attachementApi";
import { MultiStepUserForm } from "@/components/dynamic-form/MultiStepUserForm";
import {
  validateAllFormSteps,
  buildUserPayloadFromDynamicValues,
  flattenFormFields,
} from "@/lib/dynamicFormValidation";
import {
  hasConfiguredFormFields,
  type DynamicFormValues,
} from "@/redux/types/formField";
import { cn } from "@/lib/utils";
import {
  modalOverlayClassName,
  modalPanelClassName,
} from "@/lib/modalLayout";

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePatientModal: React.FC<CreatePatientModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [values, setValues] = useState<DynamicFormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filesByKey, setFilesByKey] = useState<Record<string, File>>({});
  const [stepState, setStepState] = useState({
    isLast: false,
    isCurrentStepComplete: false,
  });

  const { data: formConfig, isLoading: loadingFields } =
    useGetUserFormConfigQuery(undefined, { skip: !isOpen });
  const [createPatient, { isLoading }] = useCreatePatientMutation();
  const [uploadFiles] = useUploadAttachmentsMutation();

  useEffect(() => {
    if (!isOpen) return;
    setValues({});
    setErrors({});
    setFilesByKey({});
    setStepState({ isLast: false, isCurrentStepComplete: false });
  }, [isOpen]);

  const canRegister =
    stepState.isLast &&
    stepState.isCurrentStepComplete &&
    !loadingFields;

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
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

    if (!hasConfiguredFormFields(formConfig)) {
      toast.error(
        "Patient form is not configured. Go to Patients → Configure Patient Forms, or run backend migrations."
      );
      return;
    }

    try {
      const formFields = flattenFormFields(formConfig);
      const payload = buildUserPayloadFromDynamicValues(formFields, values);

      for (const field of formFields) {
        if (field.field_type !== "file") continue;
        const file = filesByKey[field.field_key];
        if (!file) continue;
        const uploaded = await uploadFiles({ files: [file] }).unwrap();
        const attachment = uploaded.attachments?.[0];
        const url = attachment?.attachment_id
          ? attachment.attachment_id
          : undefined;
        if (url) {
          if (!payload.custom_fields) payload.custom_fields = {};
          (payload.custom_fields as Record<string, unknown>)[field.field_key] =
            url;
        }
      }

      await createPatient(payload).unwrap();
      toast.success("Patient registered");
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to register patient";
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={modalOverlayClassName}>
      <div className={cn(modalPanelClassName, "max-w-2xl")}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Register Patient</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {loadingFields ? (
          <p className="text-muted-foreground">Loading form…</p>
        ) : (
          <MultiStepUserForm
            key={isOpen ? "open" : "closed"}
            resetKey={isOpen ? "open" : "closed"}
            config={formConfig}
            values={values}
            errors={errors}
            onChange={handleChange}
            filesByKey={filesByKey}
            onStepStateChange={setStepState}
            onStepErrors={setErrors}
            onFileSelect={(key, file) => {
              setFilesByKey((prev) => {
                const next = { ...prev };
                if (file) next[key] = file;
                else delete next[key];
                return next;
              });
            }}
          />
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !canRegister}
            title={
              !stepState.isLast
                ? "Complete all steps to register"
                : !stepState.isCurrentStepComplete
                  ? "Fill required fields on this step"
                  : undefined
            }
          >
            {isLoading ? "Saving…" : "Register Patient"}
          </Button>
        </div>
      </div>
    </div>
  );
};
