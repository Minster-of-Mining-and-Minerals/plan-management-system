"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DynamicUserFormFields } from "@/components/dynamic-form/DynamicUserFormFields";
import type {
  UserFormConfigGrouped,
  DynamicFormValues,
  FormFieldStepGroup,
} from "@/redux/types/formField";
import { getVisibleSteps } from "@/redux/types/formField";
import {
  isFormStepComplete,
  validateFormStep,
} from "@/lib/dynamicFormValidation";
import { isGroupStepRequired } from "@/lib/formFieldRules";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MultiStepUserFormProps {
  config: UserFormConfigGrouped | undefined;
  values: DynamicFormValues;
  errors?: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  onFileSelect?: (key: string, file: File | null) => void;
  filesByKey?: Record<string, File>;
  disabled?: boolean;
  onStepChange?: (index: number) => void;
  onStepErrors?: (errors: Record<string, string>) => void;
  onStepStateChange?: (state: {
    stepIndex: number;
    totalSteps: number;
    isLast: boolean;
    isCurrentStepComplete: boolean;
  }) => void;
  /** Change to reset wizard to step 1 (e.g. when modal reopens). */
  resetKey?: string | number;
}

export function MultiStepUserForm({
  config,
  values,
  errors = {},
  onChange,
  onFileSelect,
  filesByKey,
  disabled = false,
  onStepChange,
  onStepErrors,
  onStepStateChange,
  resetKey,
}: MultiStepUserFormProps) {
  const steps = useMemo(() => getVisibleSteps(config), [config]);
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = steps[stepIndex] as FormFieldStepGroup | undefined;
  const isFirst = stepIndex === 0;
  const isLast = steps.length > 0 && stepIndex >= steps.length - 1;
  const stepRequired = currentStep ? isGroupStepRequired(currentStep) : true;

  const isCurrentStepComplete = currentStep
    ? isFormStepComplete(currentStep, values, filesByKey)
    : false;

  useEffect(() => {
    setStepIndex(0);
  }, [resetKey]);

  useEffect(() => {
    onStepStateChange?.({
      stepIndex,
      totalSteps: steps.length,
      isLast,
      isCurrentStepComplete,
    });
  }, [
    stepIndex,
    steps.length,
    isLast,
    isCurrentStepComplete,
    onStepStateChange,
  ]);

  const goTo = (index: number) => {
    if (
      index > stepIndex &&
      currentStep &&
      !isFormStepComplete(currentStep, values, filesByKey)
    ) {
      return;
    }
    setStepIndex(index);
    onStepChange?.(index);
  };

  const validateCurrentStep = () => {
    if (!currentStep) return true;
    const stepErrors = validateFormStep(currentStep, values, filesByKey);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (!currentStep) return false;
    const stepErrors = validateFormStep(currentStep, values, filesByKey);
    if (Object.keys(stepErrors).length) {
      onStepErrors?.(stepErrors);
      return false;
    }
    onStepErrors?.({});
    if (!isLast) goTo(stepIndex + 1);
    return true;
  };

  const handleBack = () => {
    if (!isFirst) goTo(stepIndex - 1);
  };

  const handleSkip = () => {
    if (!currentStep || stepRequired) return;
    if (!isLast) goTo(stepIndex + 1);
  };

  if (!steps.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No form steps configured. Contact an administrator.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {steps.map((step, i) => (
          <button
            key={step.group_id}
            type="button"
            onClick={() => goTo(i)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              i === stepIndex
                ? "bg-primary text-white border-primary"
                : "bg-white text-primary border-section-accent hover:bg-primary/5"
            }`}
          >
            {i + 1}. {step.title}
            {isGroupStepRequired(step) && (
              <span className="ml-1 text-red-300">*</span>
            )}
          </button>
        ))}
      </div>

      {currentStep && (
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {currentStep.title}
            </h3>
            {currentStep.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentStep.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stepRequired
                ? "Required step — complete all required fields to continue"
                : "Optional step — you can skip or fill in any fields"}
            </p>
          </div>

          <DynamicUserFormFields
            fields={currentStep.fields}
            values={values}
            errors={errors}
            onChange={onChange}
            onFileSelect={onFileSelect}
            disabled={disabled}
          />
        </section>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isFirst || disabled}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex gap-2">
          {!stepRequired && !isLast && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={disabled}
            >
              Skip step
            </Button>
          )}
          {!isLast && (
            <Button
              type="button"
              onClick={() => handleNext()}
              disabled={disabled || !isCurrentStepComplete}
              title={
                !isCurrentStepComplete
                  ? "Complete all required fields on this step to continue"
                  : undefined
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function useMultiStepValidation(
  config: UserFormConfigGrouped | undefined,
  values: DynamicFormValues,
  filesByKey?: Record<string, File>
) {
  const steps = getVisibleSteps(config);

  const validateAll = () => {
    const allErrors: Record<string, string> = {};
    for (const step of steps) {
      Object.assign(
        allErrors,
        validateFormStep(step, values, filesByKey)
      );
    }
    return allErrors;
  };

  return { steps, validateAll };
}
