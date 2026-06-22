"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadField } from "@/components/common/FileUploadField";
import type { FormConfigField } from "@/redux/types/formConfig";
import type { Control } from "react-hook-form";

interface DynamicIssueFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  fields: FormConfigField[];
  heading?: string;
}

function getAttachmentAccept(field: FormConfigField) {
  const extensions = field.validation_rules?.allowed_extensions || [];
  if (!extensions.length) return "image/*,.pdf,.doc,.docx,.xls,.xlsx";
  return extensions.map((ext) => `.${ext.replace(/^\./, "")}`).join(",");
}

function getAttachmentIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value && typeof value === "object" && "attachment_ids" in value) {
    const ids = (value as { attachment_ids?: string[] }).attachment_ids;
    return Array.isArray(ids) ? ids.map(String) : [];
  }
  return [];
}

export function DynamicIssueFormFields({ control, fields, heading }: DynamicIssueFormFieldsProps) {
  if (!fields.length) return null;

  const sorted = [...fields].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {heading ? <p className="text-sm font-medium">{heading}</p> : null}

      {sorted.map((field) => {
        const name = `form_responses.${field.field_key}` as const;
        const fieldType = field.field_type;

        if (fieldType === "ATTACHMENT" || fieldType === "FILE" || fieldType === "IMAGE") {
          return (
            <FormField
              key={field.form_config_field_id}
              control={control}
              name={name}
              render={({ field: formField }) => (
                <FormItem>
                  <FileUploadField
                    id={field.form_config_field_id}
                    label={`${field.label}${field.required ? " *" : ""}`}
                    value={getAttachmentIds(formField.value)}
                    onChange={(ids) => formField.onChange({ attachment_ids: ids })}
                    required={field.required}
                    accept={getAttachmentAccept(field)}
                    multiple={field.validation_rules?.multiple_files !== false}
                  />
                  {field.help_text ? (
                    <p className="text-xs text-muted-foreground">{field.help_text}</p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        if (fieldType === "TEXTAREA") {
          return (
            <FormField
              key={field.form_config_field_id}
              control={control}
              name={name}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    {field.label}
                    {field.required ? " *" : ""}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      {...formField}
                      value={String(formField.value ?? field.default_value ?? "")}
                    />
                  </FormControl>
                  {field.help_text ? (
                    <p className="text-xs text-muted-foreground">{field.help_text}</p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        if (fieldType === "SELECT" || fieldType === "RADIO") {
          return (
            <FormField
              key={field.form_config_field_id}
              control={control}
              name={name}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    {field.label}
                    {field.required ? " *" : ""}
                  </FormLabel>
                  <Select onValueChange={formField.onChange} value={String(formField.value ?? "")}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.help_text ? (
                    <p className="text-xs text-muted-foreground">{field.help_text}</p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        if (fieldType === "MULTI_SELECT" || fieldType === "CHECKBOX") {
          return (
            <FormField
              key={field.form_config_field_id}
              control={control}
              name={name}
              render={({ field: formField }) => {
                const rawValue = formField.value as unknown;
                const selected: string[] = Array.isArray(rawValue)
                  ? rawValue.map(String)
                  : rawValue != null && rawValue !== ""
                    ? [String(rawValue)]
                    : [];

                const toggleValue = (value: string, checked: boolean) => {
                  const next = checked
                    ? [...new Set([...selected, value])]
                    : selected.filter((v: string) => v !== value);
                  formField.onChange(next);
                };

                return (
                  <FormItem>
                    <FormLabel>
                      {field.label}
                      {field.required ? " *" : ""}
                    </FormLabel>
                    <div className="space-y-2 rounded-md border p-3">
                      {(field.options ?? []).map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={selected.includes(option.value)}
                            onChange={(e) => toggleValue(option.value, e.target.checked)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                    {field.help_text ? (
                      <p className="text-xs text-muted-foreground">{field.help_text}</p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          );
        }

        if (fieldType === "BOOLEAN") {
          return (
            <FormField
              key={field.form_config_field_id}
              control={control}
              name={name}
              render={({ field: formField }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="mb-0">
                      {field.label}
                      {field.required ? " *" : ""}
                    </FormLabel>
                    {field.help_text ? (
                      <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
                    ) : null}
                  </div>
                  <FormControl>
                    <Switch
                      checked={Boolean(formField.value)}
                      onCheckedChange={formField.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          );
        }

        const inputType =
          fieldType === "NUMBER"
            ? "number"
            : fieldType === "EMAIL"
              ? "email"
              : fieldType === "PHONE"
                ? "tel"
                : fieldType === "URL"
                  ? "url"
                  : fieldType === "PASSWORD"
                    ? "password"
                    : fieldType === "DATE"
                      ? "date"
                      : fieldType === "DATETIME"
                        ? "datetime-local"
                        : fieldType === "TIME"
                          ? "time"
                          : "text";

        return (
          <FormField
            key={field.form_config_field_id}
            control={control}
            name={name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required ? " *" : ""}
                </FormLabel>
                <FormControl>
                  <Input
                    type={inputType}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    {...formField}
                    value={String(formField.value ?? field.default_value ?? "")}
                  />
                </FormControl>
                {field.help_text ? (
                  <p className="text-xs text-muted-foreground">{field.help_text}</p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      })}
    </div>
  );
}
