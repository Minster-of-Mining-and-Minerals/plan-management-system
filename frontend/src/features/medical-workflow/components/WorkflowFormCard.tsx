"use client";

import { Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DynamicUserFormFields } from "@/components/dynamic-form/DynamicUserFormFields";
import type { DynamicFormValues, UserFormConfigGrouped } from "@/redux/types/formField";
import type { DiagnosisFormConfig } from "@/redux/api/diagnosisFormApi";

type Props = {
  formConfig?: DiagnosisFormConfig | null;
  grouped?: UserFormConfigGrouped | null;
  values: DynamicFormValues;
  errors: Record<string, string>;
  disabled?: boolean;
  saving?: boolean;
  onChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function WorkflowFormCard({
  formConfig,
  grouped,
  values,
  errors,
  disabled,
  saving,
  onChange,
  onSave,
  onCancel,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">New workflow</CardTitle>
          {formConfig?.title && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formConfig.title}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1.5 h-4 w-4" />
          Cancel
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped ? (
          <DynamicUserFormFields
            grouped={grouped}
            values={values}
            errors={errors}
            onChange={onChange}
            disabled={disabled}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No form configured for your staff account. Ask an admin to assign a
            diagnosis form template.
          </p>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button
            type="button"
            disabled={disabled || saving || !grouped}
            onClick={onSave}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
