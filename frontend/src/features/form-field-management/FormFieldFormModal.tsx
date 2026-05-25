"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FormField,
  FormFieldType,
  FormFieldConfig,
  CreateFormFieldPayload,
} from "@/redux/types/formField";
import { DEFAULT_FIELD_CATEGORIES } from "@/redux/types/formField";
import {
  useCreateFormFieldMutation,
  useUpdateFormFieldMutation,
} from "@/redux/api/formFieldApi";
import { toast } from "sonner";

const FIELD_TYPES: FormFieldType[] = [
  "input",
  "textarea",
  "select",
  "checkbox",
  "file",
  "date",
  "number",
];

interface FormFieldFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  field?: FormField | null;
}

export function FormFieldFormModal({
  isOpen,
  onClose,
  field,
}: FormFieldFormModalProps) {
  const isEdit = Boolean(field);
  const isCore = field?.storage_type === "core";
  const [createField, { isLoading: creating }] = useCreateFormFieldMutation();
  const [updateField, { isLoading: updating }] = useUpdateFormFieldMutation();

  const [fieldKey, setFieldKey] = useState("");
  const [category, setCategory] = useState("General");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<FormFieldType>("input");
  const [isRequired, setIsRequired] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [optionsText, setOptionsText] = useState("");
  const [configJson, setConfigJson] = useState("{}");

  useEffect(() => {
    if (field) {
      setFieldKey(field.field_key);
      setCategory(field.category || "General");
      setLabel(field.label);
      setFieldType(field.field_type);
      setIsRequired(field.is_required);
      setIsVisible(field.is_visible);
      const cfg = field.config || {};
      setOptionsText((cfg.options || []).join("\n"));
      setConfigJson(JSON.stringify(cfg, null, 2));
    } else {
      setFieldKey("");
      setCategory("General");
      setLabel("");
      setFieldType("input");
      setIsRequired(false);
      setIsVisible(true);
      setOptionsText("");
      setConfigJson("{}");
    }
  }, [field, isOpen]);

  const buildConfig = (): FormFieldConfig => {
    let config: FormFieldConfig = {};
    try {
      config = JSON.parse(configJson || "{}");
    } catch {
      config = {};
    }
    if (fieldType === "select" || fieldType === "checkbox") {
      config.options = optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return config;
  };

  const handleSave = async () => {
    try {
      const config = buildConfig();
      const payload: CreateFormFieldPayload = {
        model_name: "User",
        field_key: fieldKey,
        label,
        field_type: fieldType,
        storage_type: "custom",
        category,
        is_required: isRequired,
        is_visible: isVisible,
        config,
      };

      if (isEdit && field) {
        const updatePayload = isCore
          ? { label, field_type: fieldType, config }
          : payload;
        await updateField({ id: field.field_id, data: updatePayload }).unwrap();
        toast.success("Field updated");
      } else {
        await createField(payload).unwrap();
        toast.success("Custom field created");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save field");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? isCore
                ? "Edit core field (label & validation)"
                : "Edit custom field"
              : "Add custom field"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEdit && (
            <p className="text-sm text-muted-foreground">
              Core fields (full name, email, phone) are always required and
              managed by the system.
            </p>
          )}

          {isCore && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              This is a required core column. You can adjust the label and
              validation rules only.
            </p>
          )}

          <div className="space-y-2">
            <Label>Field key</Label>
            <Input
              value={fieldKey}
              onChange={(e) =>
                setFieldKey(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                )
              }
              disabled={isEdit}
              placeholder="e.g. blood_type, nationality"
            />
          </div>

          {!isCore && (
            <div className="space-y-2">
              <Label>Category / group</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_FIELD_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Field type</Label>
            <Select
              value={fieldType}
              onValueChange={(v) => setFieldType(v as FormFieldType)}
              disabled={isCore}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(fieldType === "select" || fieldType === "checkbox") && (
            <div className="space-y-2">
              <Label>Options (one per line)</Label>
              <textarea
                className="w-full min-h-[80px] border rounded-md p-2 text-sm"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Validation config (JSON)</Label>
            <textarea
              className="w-full min-h-[120px] border rounded-md p-2 font-mono text-xs"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              placeholder='{"pattern":"phone","min_length":2}'
            />
          </div>

          {!isCore && (
            <>
              <div className="flex items-center justify-between">
                <Label>Required</Label>
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Visible</Label>
                <Switch checked={isVisible} onCheckedChange={setIsVisible} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={creating || updating || !fieldKey || !label}
          >
            {creating || updating ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
