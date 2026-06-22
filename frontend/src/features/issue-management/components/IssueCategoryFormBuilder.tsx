"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ISSUE_ENTITY_TYPE_LABELS,
  IssueCategoryFormConfig,
  IssueEntityType,
  IssueFormFieldConfig,
  IssueStandardFieldRule,
} from "@/redux/types/issue";
import {
  ISSUE_ENTITY_TYPE_OPTIONS,
  ISSUE_STANDARD_FIELD_DEFINITIONS,
  normalizeFormConfig,
  slugifyFieldKey,
} from "../utils/issueFormConfig";

interface IssueCategoryFormBuilderProps {
  value: IssueCategoryFormConfig;
  onChange: (value: IssueCategoryFormConfig) => void;
  disabled?: boolean;
}

function cloneConfig(config: IssueCategoryFormConfig): IssueCategoryFormConfig {
  return JSON.parse(JSON.stringify(config)) as IssueCategoryFormConfig;
}

export function IssueCategoryFormBuilder({
  value,
  onChange,
  disabled = false,
}: IssueCategoryFormBuilderProps) {
  const config = normalizeFormConfig(value);

  const updateStandardField = (
    fieldKey: string,
    patch: Partial<IssueStandardFieldRule>
  ) => {
    const next = cloneConfig(value);
    next.standardFields = next.standardFields ?? {};
    next.standardFields[fieldKey] = {
      ...(next.standardFields[fieldKey] ?? {}),
      ...patch,
    };
    onChange(next);
  };

  const updateCustomField = (index: number, patch: Partial<IssueFormFieldConfig>) => {
    const next = cloneConfig(value);
    const fields = [...(next.fields ?? [])];
    fields[index] = { ...fields[index], ...patch };
    next.fields = fields;
    onChange(next);
  };

  const addCustomField = () => {
    const next = cloneConfig(value);
    const fields = [...(next.fields ?? [])];
    fields.push({
      key: `field_${fields.length + 1}`,
      label: `Custom Field ${fields.length + 1}`,
      type: "text",
      required: false,
      placeholder: "",
    });
    next.fields = fields;
    onChange(next);
  };

  const removeCustomField = (index: number) => {
    const next = cloneConfig(value);
    next.fields = (next.fields ?? []).filter((_, i) => i !== index);
    onChange(next);
  };

  const addSelectOption = (fieldIndex: number) => {
    const next = cloneConfig(value);
    const fields = [...(next.fields ?? [])];
    const field = { ...fields[fieldIndex] };
    field.options = [...(field.options ?? []), { value: "", label: "" }];
    fields[fieldIndex] = field;
    next.fields = fields;
    onChange(next);
  };

  const updateSelectOption = (
    fieldIndex: number,
    optionIndex: number,
    patch: Partial<{ value: string; label: string }>
  ) => {
    const next = cloneConfig(value);
    const fields = [...(next.fields ?? [])];
    const field = { ...fields[fieldIndex] };
    const options = [...(field.options ?? [])];
    options[optionIndex] = { ...options[optionIndex], ...patch };
    field.options = options;
    fields[fieldIndex] = field;
    next.fields = fields;
    onChange(next);
  };

  const removeSelectOption = (fieldIndex: number, optionIndex: number) => {
    const next = cloneConfig(value);
    const fields = [...(next.fields ?? [])];
    const field = { ...fields[fieldIndex] };
    field.options = (field.options ?? []).filter((_, i) => i !== optionIndex);
    fields[fieldIndex] = field;
    next.fields = fields;
    onChange(next);
  };

  const toggleAllowedEntityType = (
    fieldKey: string,
    entityType: IssueEntityType,
    checked: boolean
  ) => {
    const rule = config.standardFields[fieldKey] ?? {};
    const current: IssueEntityType[] =
      rule.allowedTypes ?? [...ISSUE_ENTITY_TYPE_OPTIONS];
    const nextTypes: IssueEntityType[] = checked
      ? Array.from(new Set([...current, entityType]))
      : current.filter((type) => type !== entityType);
    updateStandardField(fieldKey, { allowedTypes: nextTypes });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="text-sm font-semibold">Standard Issue Fields</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Control which built-in fields appear when raising an issue for this category.
          </p>
        </div>

        <div className="space-y-3">
          {ISSUE_STANDARD_FIELD_DEFINITIONS.map((definition) => {
            const rule = config.standardFields[definition.key] ?? {};
            const visible = rule.visible !== false;
            const required =
              rule.required === true ||
              (rule.required === undefined && definition.defaultRequired);
            const allowedTypes =
              rule.allowedTypes?.length ? rule.allowedTypes : [...ISSUE_ENTITY_TYPE_OPTIONS];

            return (
              <div
                key={definition.key}
                className="rounded-md border bg-muted/20 p-3 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{definition.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{definition.key}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={visible}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          updateStandardField(definition.key, { visible: checked })
                        }
                      />
                      <Label className="text-xs">Visible</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={required}
                        disabled={disabled || !visible}
                        onCheckedChange={(checked) =>
                          updateStandardField(definition.key, { required: checked })
                        }
                      />
                      <Label className="text-xs">Required</Label>
                    </div>
                  </div>
                </div>

                {"supportsAllowedTypes" in definition && definition.supportsAllowedTypes ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Allowed entity types
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ISSUE_ENTITY_TYPE_OPTIONS.map((entityType) => (
                        <label
                          key={entityType}
                          className="flex items-center gap-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border"
                            checked={allowedTypes.includes(entityType)}
                            disabled={disabled || !visible}
                            onChange={(e) =>
                              toggleAllowedEntityType(
                                definition.key,
                                entityType,
                                e.target.checked
                              )
                            }
                          />
                          {ISSUE_ENTITY_TYPE_LABELS[entityType]}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Custom Fields</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Add category-specific inputs such as proposed names, system areas, or evaluation context.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={addCustomField}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Field
          </Button>
        </div>

        {(config.fields ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
            No custom fields yet. Add fields for requests like new KPIs, account issues, or evaluation concerns.
          </p>
        ) : (
          <div className="space-y-4">
            {(config.fields ?? []).map((field, index) => (
              <div key={`${field.key}-${index}`} className="rounded-md border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <Badge variant="secondary">Field {index + 1}</Badge>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => removeCustomField(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={field.label}
                      disabled={disabled}
                      onChange={(e) => {
                        const label = e.target.value;
                        updateCustomField(index, {
                          label,
                          key: field.key.startsWith("field_")
                            ? slugifyFieldKey(label) || field.key
                            : field.key,
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Field Key</Label>
                    <Input
                      value={field.key}
                      disabled={disabled}
                      className="font-mono text-xs"
                      onChange={(e) =>
                        updateCustomField(index, { key: slugifyFieldKey(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Field Type</Label>
                    <Select
                      value={field.type}
                      disabled={disabled}
                      onValueChange={(nextType: IssueFormFieldConfig["type"]) =>
                        updateCustomField(index, {
                          type: nextType,
                          options: nextType === "select" ? field.options ?? [{ value: "", label: "" }] : [],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short Text</SelectItem>
                        <SelectItem value="textarea">Long Text</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Placeholder</Label>
                    <Input
                      value={field.placeholder ?? ""}
                      disabled={disabled}
                      onChange={(e) =>
                        updateCustomField(index, { placeholder: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.required === true}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      updateCustomField(index, { required: checked })
                    }
                  />
                  <Label className="text-xs">Required field</Label>
                </div>

                {field.type === "select" ? (
                  <div className="space-y-2 rounded-md border border-dashed p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Dropdown Options</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={disabled}
                        onClick={() => addSelectOption(index)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    {(field.options ?? []).map((option, optionIndex) => (
                      <div key={optionIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input
                          placeholder="Value"
                          value={option.value}
                          disabled={disabled}
                          onChange={(e) =>
                            updateSelectOption(index, optionIndex, { value: e.target.value })
                          }
                        />
                        <Input
                          placeholder="Label"
                          value={option.label}
                          disabled={disabled}
                          onChange={(e) =>
                            updateSelectOption(index, optionIndex, { label: e.target.value })
                          }
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={disabled}
                          onClick={() => removeSelectOption(index, optionIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
