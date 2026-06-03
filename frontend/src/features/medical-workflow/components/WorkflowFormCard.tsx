"use client";

import { Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicUserFormFields } from "@/components/dynamic-form/DynamicUserFormFields";
import type { DynamicFormValues, UserFormConfigGrouped } from "@/redux/types/formField";
import type { DiagnosisFormConfig } from "@/redux/api/diagnosisFormApi";

type FormOption = {
  config: DiagnosisFormConfig;
  form: UserFormConfigGrouped | null;
};

type Props = {
  formOptions: FormOption[];
  selectedFormConfigId: string;
  onFormConfigChange: (configId: string) => void;
  entryTitle: string;
  entryTitleError?: string;
  values: DynamicFormValues;
  errors: Record<string, string>;
  disabled?: boolean;
  saving?: boolean;
  onEntryTitleChange: (value: string) => void;
  onChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function WorkflowFormCard({
  formOptions,
  selectedFormConfigId,
  onFormConfigChange,
  entryTitle,
  entryTitleError,
  values,
  errors,
  disabled,
  saving,
  onEntryTitleChange,
  onChange,
  onSave,
  onCancel,
}: Props) {
  const selected =
    formOptions.find((o) => o.config.config_id === selectedFormConfigId) ??
    formOptions[0];
  const grouped = selected?.form ?? null;
  const hasMultiple = formOptions.length > 1;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <CardTitle className="text-base">New workflow report</CardTitle>
          {hasMultiple ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Diagnosis form template
              </Label>
              <Select
                value={selectedFormConfigId}
                onValueChange={onFormConfigChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select form…" />
                </SelectTrigger>
                <SelectContent>
                  {formOptions.map((opt) => (
                    <SelectItem
                      key={opt.config.config_id}
                      value={opt.config.config_id}
                    >
                      {opt.config.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            selected?.config?.title && (
              <p className="text-xs text-muted-foreground">{selected.config.title}</p>
            )
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1.5 h-4 w-4" />
          Cancel
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workflow_entry_title">
            Report title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="workflow_entry_title"
            placeholder="e.g. Lab Report, Dr. Xyz Diagnosis, Imaging Result"
            value={entryTitle}
            onChange={(e) => onEntryTitleChange(e.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(entryTitleError)}
          />
          {entryTitleError ? (
            <p className="text-xs text-destructive">{entryTitleError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              This title appears on the timeline for this entry.
            </p>
          )}
        </div>

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
            disabled={
              disabled || saving || !grouped || !entryTitle.trim() || !selectedFormConfigId
            }
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
