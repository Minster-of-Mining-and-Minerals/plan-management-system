"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormFieldConfig, DynamicFormValues } from "@/redux/types/formField";

type RepeaterSubField = NonNullable<FormFieldConfig["repeater"]>["fields"][number];

type RepeaterRow = Record<string, unknown>;

type Props = {
  fieldKey: string;
  label: string;
  config: FormFieldConfig;
  value: unknown;
  disabled?: boolean;
  onChange: (key: string, value: unknown) => void;
};

function normalizeRows(value: unknown): RepeaterRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row && typeof row === "object") as RepeaterRow[];
}

function emptyRow(fields: RepeaterSubField[]): RepeaterRow {
  const row: RepeaterRow = {};
  for (const f of fields) {
    row[f.field_key] = f.field_type === "number" ? "" : "";
  }
  return row;
}

function renderSubField(
  sub: RepeaterSubField,
  row: RepeaterRow,
  rowIndex: number,
  disabled: boolean,
  onRowChange: (index: number, key: string, val: unknown) => void
) {
  const subConfig = sub.config || {};
  const raw = row[sub.field_key];

  switch (sub.field_type) {
    case "textarea":
      return (
        <Textarea
          value={String(raw ?? "")}
          placeholder={subConfig.placeholder}
          disabled={disabled}
          onChange={(e) => onRowChange(rowIndex, sub.field_key, e.target.value)}
          className="min-h-[72px] border-section-accent resize-none"
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={raw != null ? String(raw) : ""}
          disabled={disabled}
          onChange={(e) => onRowChange(rowIndex, sub.field_key, e.target.value)}
          className="h-10 border-section-accent"
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={String(raw ?? "")}
          disabled={disabled}
          onChange={(e) => onRowChange(rowIndex, sub.field_key, e.target.value)}
          className="h-10 border-section-accent"
        />
      );
    case "select":
      return (
        <Select
          value={String(raw ?? "")}
          onValueChange={(v) => onRowChange(rowIndex, sub.field_key, v)}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 border-section-accent">
            <SelectValue placeholder={`Select ${sub.label}`} />
          </SelectTrigger>
          <SelectContent>
            {(subConfig.options || []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return (
        <Input
          value={String(raw ?? "")}
          placeholder={subConfig.placeholder}
          disabled={disabled}
          onChange={(e) => onRowChange(rowIndex, sub.field_key, e.target.value)}
          className="h-10 border-section-accent"
        />
      );
  }
}

export function RepeaterField({
  fieldKey,
  label,
  config,
  value,
  disabled = false,
  onChange,
}: Props) {
  const repeater = config.repeater;
  const subFields = repeater?.fields || [];
  const minRows = repeater?.min_rows ?? 0;
  const maxRows = repeater?.max_rows ?? 20;
  const rows = normalizeRows(value);

  const updateRows = (next: RepeaterRow[]) => {
    onChange(fieldKey, next);
  };

  const onRowChange = (index: number, subKey: string, val: unknown) => {
    const next = rows.map((row, i) =>
      i === index ? { ...row, [subKey]: val } : row
    );
    updateRows(next);
  };

  const addRow = () => {
    if (rows.length >= maxRows) return;
    updateRows([...rows, emptyRow(subFields)]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= minRows) return;
    updateRows(rows.filter((_, i) => i !== index));
  };

  if (!subFields.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Repeater field &quot;{label}&quot; has no sub-fields configured.
      </p>
    );
  }

  const displayRows = rows.length > 0 ? rows : minRows > 0 ? [emptyRow(subFields)] : [];

  return (
    <div className="space-y-3">
      {displayRows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Row {rowIndex + 1}
            </span>
            {!disabled && rows.length > minRows && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => removeRow(rowIndex)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subFields.map((sub) => (
              <div key={sub.field_key} className="space-y-1.5">
                <Label className="text-xs text-section-accent">{sub.label}</Label>
                {renderSubField(sub, row, rowIndex, disabled, onRowChange)}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!disabled && rows.length < maxRows && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Add row
        </Button>
      )}
    </div>
  );
}
