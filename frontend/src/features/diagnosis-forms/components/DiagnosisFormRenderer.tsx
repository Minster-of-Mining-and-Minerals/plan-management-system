"use client";

import { useGetDiagnosisGroupedFormQuery } from "@/redux/api/diagnosisFormApi";
import { DynamicUserFormFields } from "@/components/dynamic-form/DynamicUserFormFields";
import type { ClinicalOrderDefinition } from "@/redux/api/clinicalOrderDefinitionApi";

interface DiagnosisFormRendererProps {
  configId: string;
  values: Record<string, any>;
  onChange: (newVals: Record<string, any>) => void;
  disabled?: boolean;
}

export function DiagnosisFormRenderer({
  configId,
  values,
  onChange,
  disabled = false,
}: DiagnosisFormRendererProps) {
  const { data: grouped, isLoading } = useGetDiagnosisGroupedFormQuery(configId, {
    skip: !configId,
  });

  if (isLoading) {
    return <div className="p-3 text-xs text-muted-foreground animate-pulse">Loading form schema...</div>;
  }

  if (!grouped) {
    return <div className="p-3 text-xs text-muted-foreground">Form template schema not found.</div>;
  }

  return (
    <DynamicUserFormFields
      grouped={grouped}
      values={values}
      onChange={(key: string, val: unknown) => onChange({ ...values, [key]: val })}
      disabled={disabled}
    />
  );
}
