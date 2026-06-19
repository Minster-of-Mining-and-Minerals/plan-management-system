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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IssueFormFieldConfig } from "@/redux/types/issue";
import type { Control } from "react-hook-form";

interface IssueCategoryFormFieldsProps {
  control: Control<Record<string, unknown>>;
  fields: IssueFormFieldConfig[];
}

export function IssueCategoryFormFields({
  control,
  fields,
}: IssueCategoryFormFieldsProps) {
  if (!fields.length) return null;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm font-medium">Category Details</p>
      {fields.map((field) => (
        <FormField
          key={field.key}
          control={control}
          name={`form_data.${field.key}`}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.required ? " *" : ""}
              </FormLabel>
              <FormControl>
                {field.type === "textarea" ? (
                  <Textarea
                    rows={3}
                    placeholder={field.placeholder}
                    {...formField}
                    value={String(formField.value ?? "")}
                  />
                ) : field.type === "select" ? (
                  <Select
                    onValueChange={formField.onChange}
                    value={String(formField.value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || "Select option"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    {...formField}
                    value={String(formField.value ?? "")}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
