"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DIALOG_SIMPLE_SCROLL } from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import {
  useCreateFormConfigFieldMutation,
  useDeleteFormConfigFieldMutation,
  useGetFormConfigContainerByIdQuery,
  useReorderFormConfigFieldsMutation,
  useUpdateFormConfigFieldMutation,
} from "@/redux/api/formConfigApi";
import {
  FORM_CONFIG_FIELD_TYPES,
  FORM_CONFIG_FIELD_TYPE_LABELS,
  FormConfigContainer,
  FormConfigField,
  FormConfigFieldOption,
  FormConfigFieldType,
  FormConfigValidationRules,
} from "@/redux/types/formConfig";

interface ManageFormConfigFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: FormConfigContainer | null;
}

const OPTION_FIELD_TYPES = new Set<FormConfigFieldType>([
  "SELECT",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
]);

const ATTACHMENT_FIELD_TYPES = new Set<FormConfigFieldType>([
  "FILE",
  "IMAGE",
  "ATTACHMENT",
]);

const emptyField = (): Partial<FormConfigField> & {
  label: string;
  field_key: string;
  options: FormConfigFieldOption[];
  validation_rules: FormConfigValidationRules;
} => ({
  label: "",
  field_key: "",
  field_type: "TEXT",
  placeholder: "",
  help_text: "",
  required: false,
  display_order: 0,
  options: [],
  validation_rules: {},
});

function parseAllowedExtensions(text: string): string[] {
  return text
    .split(/[,;]+/)
    .map((ext) => ext.trim().replace(/^\./, ""))
    .filter(Boolean);
}

function fieldToDraft(field: FormConfigField): ReturnType<typeof emptyField> {
  return {
    label: field.label,
    field_key: field.field_key,
    field_type: field.field_type,
    placeholder: field.placeholder || "",
    help_text: field.help_text || "",
    required: field.required,
    display_order: field.display_order,
    options: field.options?.length ? [...field.options] : [],
    validation_rules: field.validation_rules ? { ...field.validation_rules } : {},
  };
}

function buildFieldPayload(
  draft: ReturnType<typeof emptyField>,
  draftType: FormConfigFieldType,
  allowedExtensionsText: string
) {
  const showOptionsEditor = OPTION_FIELD_TYPES.has(draftType);
  const showAttachmentRules = ATTACHMENT_FIELD_TYPES.has(draftType);

  const validationRules: FormConfigValidationRules = showAttachmentRules
    ? {
        allowed_extensions: parseAllowedExtensions(allowedExtensionsText),
        max_file_size: draft.validation_rules?.max_file_size,
        multiple_files: draft.validation_rules?.multiple_files,
      }
    : {};

  return {
    label: draft.label,
    field_key: draft.field_key || undefined,
    field_type: draftType,
    placeholder: draft.placeholder || undefined,
    help_text: draft.help_text || undefined,
    required: draft.required,
    validation_rules: validationRules,
    options: showOptionsEditor ? draft.options || [] : [],
  };
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: FormConfigFieldOption[];
  onChange: (options: FormConfigFieldOption[]) => void;
}) {
  const addOption = () => onChange([...options, { label: "", value: "" }]);

  const updateOption = (index: number, patch: Partial<FormConfigFieldOption>) => {
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label>Options</Label>
        <Button type="button" size="sm" variant="outline" onClick={addOption}>
          <Plus className="h-3 w-3 mr-1" />
          Add Option
        </Button>
      </div>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">Add at least one option.</p>
      ) : (
        options.map((option, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="Label"
              value={option.label}
              onChange={(e) => {
                const label = e.target.value;
                updateOption(index, {
                  label,
                  value: option.value || label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                });
              }}
            />
            <Input
              placeholder="Value"
              value={option.value}
              onChange={(e) => updateOption(index, { value: e.target.value })}
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(index)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}

export function ManageFormConfigFieldsModal({
  isOpen,
  onClose,
  container,
}: ManageFormConfigFieldsModalProps) {
  const containerId = container?.form_config_container_id || "";
  const { data: freshContainer, refetch } = useGetFormConfigContainerByIdQuery(containerId, {
    skip: !containerId || !isOpen,
  });
  const fields = [...(freshContainer?.fields ?? container?.fields ?? [])].sort(
    (a, b) => a.display_order - b.display_order
  );

  const [draft, setDraft] = useState(emptyField());
  const [allowedExtensionsText, setAllowedExtensionsText] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [createField, { isLoading: creating }] = useCreateFormConfigFieldMutation();
  const [updateField, { isLoading: updating }] = useUpdateFormConfigFieldMutation();
  const [deleteField] = useDeleteFormConfigFieldMutation();
  const [reorderFields] = useReorderFormConfigFieldsMutation();

  const resetFieldForm = () => {
    setDraft(emptyField());
    setAllowedExtensionsText("");
    setEditingFieldId(null);
  };

  useEffect(() => {
    if (isOpen) resetFieldForm();
  }, [isOpen, containerId]);

  const draftType = (draft.field_type as FormConfigFieldType) || "TEXT";
  const showOptionsEditor = OPTION_FIELD_TYPES.has(draftType);
  const showAttachmentRules = ATTACHMENT_FIELD_TYPES.has(draftType);

  const handleStartEdit = (field: FormConfigField) => {
    setEditingFieldId(field.form_config_field_id);
    setDraft(fieldToDraft(field));
    setAllowedExtensionsText((field.validation_rules?.allowed_extensions || []).join(", "));
  };

  const handleCancelEdit = () => {
    resetFieldForm();
  };

  const handleSaveField = async () => {
    if (!containerId || !draft.label.trim()) {
      actionFeedback.error("Field label is required");
      return;
    }

    if (showOptionsEditor && (draft.options?.length ?? 0) === 0) {
      actionFeedback.error("Add at least one option for this field type");
      return;
    }

    const payload = buildFieldPayload(draft, draftType, allowedExtensionsText);

    try {
      if (editingFieldId) {
        await updateField({
          fieldId: editingFieldId,
          data: payload,
        }).unwrap();
        actionFeedback.success("Field updated");
      } else {
        await createField({
          containerId,
          data: {
            ...payload,
            display_order: fields.length + 1,
          },
        }).unwrap();
        actionFeedback.success("Field added");
      }
      resetFieldForm();
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(
        error.data?.message ||
          (editingFieldId ? "Failed to update field" : "Failed to add field")
      );
    }
  };

  const handleDeleteField = async (field: FormConfigField) => {
    if (!(await actionFeedback.confirm(`Delete field "${field.label}"?`, { destructive: true }))) {
      return;
    }
    try {
      await deleteField(field.form_config_field_id).unwrap();
      if (editingFieldId === field.form_config_field_id) {
        resetFieldForm();
      }
      actionFeedback.success("Field deleted");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to delete field");
    }
  };

  const handleToggleRequired = async (field: FormConfigField) => {
    await updateField({
      fieldId: field.form_config_field_id,
      data: { required: !field.required },
    });
    refetch();
  };

  const handleToggleActive = async (field: FormConfigField) => {
    await updateField({
      fieldId: field.form_config_field_id,
      data: { is_active: !field.is_active },
    });
    refetch();
  };

  const handleMoveField = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const ordered = [...fields];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(targetIndex, 0, moved);

    try {
      await reorderFields({
        containerId,
        ordered_field_ids: ordered.map((field) => field.form_config_field_id),
      }).unwrap();
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to reorder fields");
    }
  };

  if (!container) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(DIALOG_SIMPLE_SCROLL, "sm:max-w-[760px]")}>
        <DialogHeader>
          <DialogTitle>Manage Fields — {container.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`rounded-lg border p-4 space-y-3 ${
              editingFieldId ? "border-primary bg-primary/5" : ""
            }`}
          >
            <p className="text-sm font-medium">
              {editingFieldId ? "Edit Field" : "Add Field"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Label</Label>
                <Input
                  placeholder="e.g. Affected System Area"
                  value={draft.label}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      label: e.target.value,
                      field_key:
                        prev.field_key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Field Key</Label>
                <Input
                  placeholder="e.g. affected_system_area"
                  value={draft.field_key}
                  onChange={(e) => setDraft((prev) => ({ ...prev, field_key: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Field Type</Label>
                <Select
                  value={draftType}
                  onValueChange={(value) => {
                    setDraft((prev) => ({
                      ...prev,
                      field_type: value as FormConfigFieldType,
                      options: OPTION_FIELD_TYPES.has(value as FormConfigFieldType)
                        ? prev.options?.length
                          ? prev.options
                          : [{ label: "", value: "" }]
                        : [],
                    }));
                    if (
                      ATTACHMENT_FIELD_TYPES.has(value as FormConfigFieldType) &&
                      !ATTACHMENT_FIELD_TYPES.has(draftType)
                    ) {
                      setAllowedExtensionsText("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_CONFIG_FIELD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {FORM_CONFIG_FIELD_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Placeholder</Label>
                <Input
                  placeholder="e.g. Enter the affected system module"
                  value={draft.placeholder || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, placeholder: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Help Text</Label>
              <Textarea
                rows={2}
                placeholder="Optional guidance shown below the field"
                value={draft.help_text || ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, help_text: e.target.value }))}
              />
            </div>

            {showOptionsEditor ? (
              <OptionsEditor
                options={draft.options || []}
                onChange={(options) => setDraft((prev) => ({ ...prev, options }))}
              />
            ) : null}

            {showAttachmentRules ? (
              <div className="space-y-3 rounded-md border p-3">
                <Label>Attachment Rules</Label>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Allowed extensions</Label>
                  <Input
                    placeholder="pdf, docx, png (comma-separated)"
                    value={allowedExtensionsText}
                    onChange={(e) => setAllowedExtensionsText(e.target.value)}
                    onBlur={() => {
                      const parsed = parseAllowedExtensions(allowedExtensionsText);
                      if (parsed.length) {
                        setAllowedExtensionsText(parsed.join(", "));
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate file types with commas, e.g. pdf, docx, png
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max file size (bytes)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5242880"
                    value={draft.validation_rules?.max_file_size ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        validation_rules: {
                          ...prev.validation_rules,
                          max_file_size: e.target.value ? Number(e.target.value) : undefined,
                        },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={draft.validation_rules?.multiple_files !== false}
                    onCheckedChange={(checked) =>
                      setDraft((prev) => ({
                        ...prev,
                        validation_rules: {
                          ...prev.validation_rules,
                          multiple_files: checked,
                        },
                      }))
                    }
                  />
                  <Label>Allow multiple files</Label>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(draft.required)}
                onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, required: checked }))}
              />
              <Label>Required field</Label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleSaveField}
                disabled={creating || updating}
              >
                {editingFieldId ? (
                  "Save Changes"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </>
                )}
              </Button>
              {editingFieldId ? (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Configured Fields</p>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                No fields yet. Add fields above, then publish the container.
              </p>
            ) : (
              fields.map((field, index) => (
                <div
                  key={field.form_config_field_id}
                  className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
                    editingFieldId === field.form_config_field_id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{field.label}</p>
                      {!field.is_active ? <Badge variant="outline">Inactive</Badge> : null}
                      {field.required ? <Badge variant="secondary">Required</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {field.field_key} · {field.field_type}
                      {field.placeholder ? ` · "${field.placeholder}"` : ""}
                    </p>
                    {(field.options?.length ?? 0) > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {field.options?.length} option{field.options?.length === 1 ? "" : "s"}
                      </p>
                    ) : null}
                    {ATTACHMENT_FIELD_TYPES.has(field.field_type) &&
                    (field.validation_rules?.allowed_extensions?.length ?? 0) > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Allowed: {field.validation_rules?.allowed_extensions?.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Edit field"
                      onClick={() => handleStartEdit(field)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => handleMoveField(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Move down"
                      disabled={index === fields.length - 1}
                      onClick={() => handleMoveField(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={field.is_active}
                      onCheckedChange={() => handleToggleActive(field)}
                    />
                    <Switch
                      checked={field.required}
                      onCheckedChange={() => handleToggleRequired(field)}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteField(field)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
