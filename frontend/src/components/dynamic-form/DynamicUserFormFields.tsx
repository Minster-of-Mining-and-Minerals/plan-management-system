"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SuggestionTextarea } from "@/components/clinical-suggestions/SuggestionTextarea";
import { SuggestionInput } from "@/components/clinical-suggestions/SuggestionInput";
import {
  inferSuggestionCategory,
  shouldEnableClinicalSuggestions,
} from "@/lib/clinicalSuggestionField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { RepeaterField } from "@/components/dynamic-form/RepeaterField";
import { isFieldVisibleByRules } from "@/lib/formConditionUtils";
import { cn } from "@/lib/utils";
import { FileUploadField } from "@/features/template/component/FileUploadField";
const CanvasAnnotationField = dynamic(
  () =>
    import("@/components/canvas-annotation/CanvasAnnotationField").then(
      (m) => m.CanvasAnnotationField
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading canvas editor…</p>
    ),
  }
);
import type {
  FormField,
  DynamicFormValues,
  UserFormConfigGrouped,
} from "@/redux/types/formField";
import { flattenFormFields } from "@/redux/types/formField";

interface DynamicUserFormFieldsProps {
  fields?: FormField[];
  grouped?: UserFormConfigGrouped;
  values: DynamicFormValues;
  errors?: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  onFileSelect?: (key: string, file: File | null) => void;
  disabled?: boolean;
  /** Master switch for clinical suggestions on text fields (default true). */
  enableClinicalSuggestions?: boolean;
}

function FieldGrid({
  fields,
  values,
  errors,
  onChange,
  onFileSelect,
  disabled,
  enableClinicalSuggestions = true,
}: {
  fields: FormField[];
  values: DynamicFormValues;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  onFileSelect?: (key: string, file: File | null) => void;
  disabled: boolean;
  enableClinicalSuggestions?: boolean;
}) {
  const visibleFields = useMemo(
    () =>
      [...fields]
        .filter((f) => f.is_visible && isFieldVisibleByRules(f, values))
        .sort((a, b) => a.sort_order - b.sort_order),
    [fields, values]
  );

  if (!visibleFields.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleFields.map((field) => {
        const error = errors[field.field_key];
        const config = field.config || {};
        const requiredMark = field.is_required ? (
          <span className="text-red-500 ml-0.5">*</span>
        ) : null;

        return (
          <div
            key={field.field_id}
            className={cn(
              "space-y-2",
              (field.field_type === "repeater" ||
                field.field_type === "textarea" ||
                field.field_type === "richtext") &&
                "sm:col-span-2 xl:col-span-3"
            )}
          >
            <Label className="text-sm text-section-accent font-medium">
              {field.label}
              {requiredMark}
            </Label>

            {field.field_type === "input" && (
              (() => {
                const useSuggestions =
                  enableClinicalSuggestions &&
                  shouldEnableClinicalSuggestions(field) &&
                  config.pattern !== "email" &&
                  config.pattern !== "phone";
                const common = {
                  placeholder: config.placeholder,
                  value: String(values[field.field_key] ?? ""),
                  onChange: (v: string) => onChange(field.field_key, v),
                  disabled,
                  category: inferSuggestionCategory(field),
                  className: "h-12 border-section-accent",
                };
                return useSuggestions ? (
                  <SuggestionInput {...common} />
                ) : (
                  <Input
                    type={
                      config.pattern === "email"
                        ? "email"
                        : config.pattern === "phone"
                          ? "tel"
                          : "text"
                    }
                    placeholder={config.placeholder}
                    value={String(values[field.field_key] ?? "")}
                    onChange={(e) => onChange(field.field_key, e.target.value)}
                    disabled={disabled}
                    className="h-12 border-section-accent"
                  />
                );
              })()
            )}

            {field.field_type === "number" && (
              <Input
                type="number"
                value={
                  values[field.field_key] != null
                    ? String(values[field.field_key])
                    : ""
                }
                onChange={(e) => onChange(field.field_key, e.target.value)}
                disabled={disabled}
                className="h-12 border-section-accent"
              />
            )}

            {field.field_type === "date" && (
              <Input
                type="date"
                value={String(values[field.field_key] ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                disabled={disabled}
                className="h-12 border-section-accent"
              />
            )}

            {field.field_type === "time" && (
              <Input
                type="time"
                value={String(values[field.field_key] ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                disabled={disabled}
                className="h-12 border-section-accent"
              />
            )}

            {field.field_type === "switch" && (
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={Boolean(values[field.field_key])}
                  onCheckedChange={(v) => onChange(field.field_key, v)}
                  disabled={disabled}
                />
                <span className="text-sm text-muted-foreground">
                  {values[field.field_key] ? "Yes" : "No"}
                </span>
              </div>
            )}

            {field.field_type === "radio" && (
              <div className="flex flex-col gap-2 border rounded-md p-3">
                {(config.options || []).map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={field.field_key}
                      checked={String(values[field.field_key]) === opt}
                      disabled={disabled}
                      onChange={() => onChange(field.field_key, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {field.field_type === "richtext" && (
              enableClinicalSuggestions && shouldEnableClinicalSuggestions(field) ? (
                <SuggestionTextarea
                  value={String(values[field.field_key] ?? "")}
                  placeholder={config.placeholder}
                  onChange={(v) => onChange(field.field_key, v)}
                  disabled={disabled}
                  category={inferSuggestionCategory(field)}
                  className="h-24 border-section-accent resize-none"
                />
              ) : (
                <Textarea
                  value={String(values[field.field_key] ?? "")}
                  placeholder={config.placeholder}
                  onChange={(e) => onChange(field.field_key, e.target.value)}
                  disabled={disabled}
                  className="h-24 border-section-accent resize-none"
                />
              )
            )}

            {field.field_type === "textarea" && (
              enableClinicalSuggestions && shouldEnableClinicalSuggestions(field) ? (
                <SuggestionTextarea
                  value={String(values[field.field_key] ?? "")}
                  onChange={(v) => onChange(field.field_key, v)}
                  disabled={disabled}
                  category={inferSuggestionCategory(field)}
                  className="h-24 border-section-accent resize-none"
                />
              ) : (
                <Textarea
                  value={String(values[field.field_key] ?? "")}
                  onChange={(e) => onChange(field.field_key, e.target.value)}
                  disabled={disabled}
                  className="h-24 border-section-accent resize-none"
                />
              )
            )}

            {field.field_type === "select" && !config.multiple && config.searchable && (
              <SearchableSelect
                options={(config.options || []).map((opt) => ({
                  value: opt,
                  label: opt,
                }))}
                value={
                  values[field.field_key]
                    ? {
                        value: String(values[field.field_key]),
                        label: String(values[field.field_key]),
                      }
                    : null
                }
                onChange={(opt) =>
                  onChange(
                    field.field_key,
                    (opt as SelectOption | null)?.value ?? ""
                  )
                }
                placeholder={config.placeholder || `Select ${field.label}`}
                isDisabled={disabled}
              />
            )}

            {field.field_type === "select" && !config.multiple && !config.searchable && (
              <Select
                value={String(values[field.field_key] ?? "")}
                onValueChange={(v) => onChange(field.field_key, v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-12 border-section-accent">
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {(config.options || []).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.field_type === "select" && config.multiple && config.searchable && (
              <SearchableSelect
                isMulti
                options={(config.options || []).map((opt) => ({
                  value: opt,
                  label: opt,
                }))}
                value={((values[field.field_key] as string[]) || []).map(
                  (v) => ({ value: v, label: v })
                )}
                onChange={(opts) =>
                  onChange(
                    field.field_key,
                    Array.isArray(opts)
                      ? opts.map((o) => o.value)
                      : []
                  )
                }
                placeholder={config.placeholder || `Select ${field.label}`}
                isDisabled={disabled}
              />
            )}

            {field.field_type === "select" && config.multiple && !config.searchable && (
              <div className="flex flex-wrap gap-2 border rounded-md p-3">
                {(config.options || []).map((opt) => {
                  const selected = (values[field.field_key] as string[]) || [];
                  const checked = selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        className="h-4 w-4"
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selected, opt]
                            : selected.filter((x) => x !== opt);
                          onChange(field.field_key, next);
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}

            {field.field_type === "checkbox" && (
              <div className="flex flex-wrap gap-3 border rounded-md p-3">
                {(config.options || []).map((opt) => {
                  const selected = (values[field.field_key] as string[]) || [];
                  const checked = selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        className="h-4 w-4"
                        onChange={(e) => {
                          let next = e.target.checked
                            ? [...selected, opt]
                            : selected.filter((x) => x !== opt);
                          if (
                            config.max_selected &&
                            next.length > config.max_selected
                          ) {
                            next = next.slice(0, config.max_selected);
                          }
                          onChange(field.field_key, next);
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}

            {field.field_type === "repeater" && (
              <RepeaterField
                fieldKey={field.field_key}
                label={field.label}
                config={config}
                value={values[field.field_key]}
                disabled={disabled}
                onChange={onChange}
              />
            )}

            {field.field_type === "canvas_annotation" && (
              <CanvasAnnotationField
                fieldKey={field.field_key}
                label={field.label}
                config={config}
                value={values[field.field_key]}
                disabled={disabled}
                readOnly={disabled}
                onChange={onChange}
              />
            )}

            {field.field_type === "file" && (() => {
              const allowMultiple = Boolean(config.multiple);
              const raw = values[field.field_key];
              const fileValue = Array.isArray(raw)
                ? raw.map(String)
                : raw
                  ? allowMultiple
                    ? [String(raw)]
                    : String(raw)
                  : allowMultiple
                    ? []
                    : "";

              return (
                <FileUploadField
                  id={`file-${field.field_id}`}
                  label={field.label}
                  value={fileValue}
                  onChange={(v) => {
                    if (allowMultiple) {
                      onChange(
                        field.field_key,
                        Array.isArray(v) ? v : v ? [String(v)] : []
                      );
                      return;
                    }
                    onChange(
                      field.field_key,
                      Array.isArray(v) ? v[0] || "" : String(v ?? "")
                    );
                  }}
                  accept={(config.allowed_types || [])
                    .map((t) => `.${String(t).replace(/^\./, "")}`)
                    .join(",") || "image/*,.pdf"}
                  required={field.is_required}
                  multiple={allowMultiple}
                  showPreview
                  hideLabel
                  compact
                  valueFormat="fileUrls"
                />
              );
            })()}

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function DynamicUserFormFields({
  fields,
  grouped,
  values,
  errors = {},
  onChange,
  onFileSelect,
  disabled = false,
  enableClinicalSuggestions = true,
}: DynamicUserFormFieldsProps) {
  const flatFields = useMemo(
    () => (grouped ? flattenFormFields(grouped) : fields || []),
    [grouped, fields]
  );

  const stepGroups = grouped?.groups || grouped?.steps || [];
  const useGroupedLayout = Boolean(
    grouped &&
      (grouped.core_fields?.length ||
        stepGroups.length ||
        (grouped.categories?.length ?? 0) > 0)
  );

  if (!flatFields.some((f) => f.is_visible)) {
    return (
      <p className="text-sm text-muted-foreground">
        No user form fields configured yet. An admin must add fields under
        Users → Configure User Forms before users can be created.
      </p>
    );
  }

  if (!useGroupedLayout) {
    return (
      <FieldGrid
        fields={flatFields}
        values={values}
        errors={errors}
        onChange={onChange}
        onFileSelect={onFileSelect}
        disabled={disabled}
        enableClinicalSuggestions={enableClinicalSuggestions}
      />
    );
  }

  return (
    <div className="space-y-8">
      {grouped!.core_fields?.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-primary border-b pb-2">
            Account
          </h3>
          <FieldGrid
            fields={grouped!.core_fields}
            values={values}
            errors={errors}
            onChange={onChange}
            onFileSelect={onFileSelect}
            disabled={disabled}
            enableClinicalSuggestions={enableClinicalSuggestions}
          />
        </section>
      )}

      {stepGroups.map((step) => (
        <section key={step.group_id} className="space-y-3">
          <h3 className="text-sm font-semibold text-primary border-b pb-2">
            {step.title}
          </h3>
          <FieldGrid
            fields={step.fields}
            values={values}
            errors={errors}
            onChange={onChange}
            onFileSelect={onFileSelect}
            disabled={disabled}
            enableClinicalSuggestions={enableClinicalSuggestions}
          />
        </section>
      ))}

      {(grouped?.categories ?? []).map((cat) => (
        <section key={cat.category} className="space-y-3">
          <h3 className="text-sm font-semibold text-primary border-b pb-2">
            {cat.category}
          </h3>
          <FieldGrid
            fields={cat.fields}
            values={values}
            errors={errors}
            onChange={onChange}
            onFileSelect={onFileSelect}
            disabled={disabled}
            enableClinicalSuggestions={enableClinicalSuggestions}
          />
        </section>
      ))}
    </div>
  );
}
