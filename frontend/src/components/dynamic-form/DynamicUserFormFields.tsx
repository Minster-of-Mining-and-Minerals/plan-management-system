"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

function FieldGrid({
  fields,
  values,
  errors,
  onChange,
  onFileSelect,
  disabled,
}: {
  fields: FormField[];
  values: DynamicFormValues;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  onFileSelect?: (key: string, file: File | null) => void;
  disabled: boolean;
}) {
  const visibleFields = useMemo(
    () =>
      [...fields]
        .filter((f) => f.is_visible)
        .sort((a, b) => a.sort_order - b.sort_order),
    [fields]
  );

  if (!visibleFields.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {visibleFields.map((field) => {
        const error = errors[field.field_key];
        const config = field.config || {};
        const requiredMark = field.is_required ? (
          <span className="text-red-500 ml-0.5">*</span>
        ) : null;

        return (
          <div
            key={field.field_id}
            className={
              field.field_type === "textarea"
                ? "md:col-span-2 space-y-2"
                : "space-y-2"
            }
          >
            <Label className="text-sm text-section-accent font-medium">
              {field.label}
              {requiredMark}
            </Label>

            {field.field_type === "input" && (
              <Input
                type={
                  config.pattern === "email"
                    ? "email"
                    : config.pattern === "phone"
                      ? "tel"
                      : "text"
                }
                value={String(values[field.field_key] ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                disabled={disabled}
                className="h-12 border-section-accent"
              />
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

            {field.field_type === "textarea" && (
              <Textarea
                value={String(values[field.field_key] ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                disabled={disabled}
                className="border-section-accent min-h-[100px]"
              />
            )}

            {field.field_type === "select" && !config.multiple && (
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

            {field.field_type === "select" && config.multiple && (
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

            {field.field_type === "file" && (
              <div className="space-y-2">
                <Input
                  type="file"
                  accept={(config.allowed_types || [])
                    .map((t) => `.${t.replace(/^\./, "")}`)
                    .join(",")}
                  disabled={disabled}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    onFileSelect?.(field.field_key, file);
                    if (file) {
                      onChange(field.field_key, URL.createObjectURL(file));
                    }
                  }}
                  className="border-section-accent"
                />
                {values[field.field_key] != null &&
                  String(values[field.field_key]) !== "" && (
                    <div className="text-xs text-muted-foreground break-all">
                      {String(values[field.field_key]).startsWith("blob:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={String(values[field.field_key])}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded border"
                        />
                      ) : (
                        <span>{String(values[field.field_key])}</span>
                      )}
                    </div>
                  )}
              </div>
            )}

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
          />
        </section>
      ))}
    </div>
  );
}
