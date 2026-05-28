"use client";

import { useEffect, useState } from "react";
import { Stethoscope, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { DynamicUserFormFields } from "@/components/dynamic-form/DynamicUserFormFields";
import {
  useGetAppointmentDiagnosisQuery,
  useSaveAppointmentDiagnosisMutation,
} from "@/redux/api/diagnosisRecordApi";
import type { DynamicFormValues } from "@/redux/types/formField";
import { validateDynamicForm } from "@/lib/dynamicFormValidation";
import { flattenFormFields } from "@/redux/types/formField";
import { toast } from "sonner";

type Props = {
  appointmentId: string;
};

export function AppointmentDiagnosisPanel({ appointmentId }: Props) {
  const { data, isLoading, isError } = useGetAppointmentDiagnosisQuery(appointmentId);
  const [saveDiagnosis, { isLoading: saving }] = useSaveAppointmentDiagnosisMutation();

  const [values, setValues] = useState<DynamicFormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.record?.form_data) {
      setValues(data.record.form_data as DynamicFormValues);
    } else if (data?.form) {
      const defaults: DynamicFormValues = {};
      for (const field of data.form.fields || []) {
        if (field.config?.default_value !== undefined) {
          defaults[field.field_key] = field.config.default_value;
        }
      }
      setValues(defaults);
    }
  }, [data]);

  const grouped = data?.form;

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async (status: "draft" | "submitted") => {
    if (!grouped) return;

    const fields = flattenFormFields(grouped).filter((f) => f.is_visible);
    const fieldErrors =
      status === "draft"
        ? {}
        : validateDynamicForm(
            fields.filter((f) => f.is_required),
            values
          );

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      toast.error("Please fix validation errors before saving");
      return;
    }

    try {
      await saveDiagnosis({
        appointmentId,
        form_data: values,
        status,
      }).unwrap();
      toast.success(
        status === "draft" ? "Diagnosis draft saved" : "Diagnosis submitted"
      );
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to save diagnosis";
      toast.error(message);
    }
  };

  const recordStatus = data?.record?.status;

  if (isLoading) return <Loading01 />;

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load diagnosis form.
        </CardContent>
      </Card>
    );
  }

  const hasFields = (grouped?.fields || []).some((f) => f.is_visible);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Stethoscope className="h-4 w-4" />
          Diagnosis
        </CardTitle>
        {recordStatus && (
          <Badge variant="outline">{recordStatus}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Form configuration: <strong>{data.formConfig.title}</strong> (staff-specific)
        </p>

        {!hasFields ? (
          <p className="text-sm text-muted-foreground">
            No diagnosis fields configured for your account yet. Ask an administrator
            with diagnosis form permissions to configure your form.
          </p>
        ) : (
          <DynamicUserFormFields
            grouped={grouped}
            values={values}
            errors={errors}
            onChange={handleChange}
          />
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            disabled={saving || !hasFields}
            onClick={() => handleSave("draft")}
          >
            Save draft
          </Button>
          <Button disabled={saving || !hasFields} onClick={() => handleSave("submitted")}>
            <Save className="mr-2 h-4 w-4" />
            Submit diagnosis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
