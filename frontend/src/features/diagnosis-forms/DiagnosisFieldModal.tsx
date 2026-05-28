"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormField, FormFieldType, FormFieldStepGroup } from "@/redux/types/formField";
import {
  useCreateDiagnosisFieldMutation,
  useUpdateDiagnosisFieldMutation,
} from "@/redux/api/diagnosisFormApi";
import { toast } from "sonner";

const FIELD_TYPES: FormFieldType[] = [
  "input",
  "textarea",
  "number",
  "select",
  "checkbox",
  "radio",
  "date",
  "time",
  "file",
  "richtext",
  "switch",
];

type Props = {
  configId: string;
  groups: FormFieldStepGroup[];
  open: boolean;
  field?: FormField | null;
  onClose: () => void;
  onSaved: () => void;
};

export function DiagnosisFieldModal({
  configId,
  groups,
  open,
  field,
  onClose,
  onSaved,
}: Props) {
  const isEdit = Boolean(field);
  const [createField, { isLoading: creating }] = useCreateDiagnosisFieldMutation();
  const [updateField, { isLoading: updating }] = useUpdateDiagnosisFieldMutation();

  const [groupId, setGroupId] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<FormFieldType>("input");
  const [isRequired, setIsRequired] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [optionsText, setOptionsText] = useState("");
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    if (field) {
      setGroupId(field.group_id || "");
      setFieldKey(field.field_key);
      setLabel(field.label);
      setFieldType(field.field_type);
      setIsRequired(field.is_required);
      setIsVisible(field.is_visible);
      setOptionsText((field.config?.options || []).join("\n"));
      setPlaceholder(field.config?.placeholder || "");
    } else {
      setGroupId(groups[0]?.group_id || "");
      setFieldKey("");
      setLabel("");
      setFieldType("input");
      setIsRequired(false);
      setIsVisible(true);
      setOptionsText("");
      setPlaceholder("");
    }
  }, [field, open, groups]);

  const needsOptions = ["select", "checkbox", "radio"].includes(fieldType);

  const handleSubmit = async () => {
    const config: Record<string, unknown> = {};
    if (placeholder) config.placeholder = placeholder;
    if (needsOptions) {
      config.options = optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (fieldType === "select") {
      config.multiple = false;
    }

    const body = {
      group_id: groupId,
      field_key: fieldKey,
      label,
      field_type: fieldType,
      is_required: isRequired,
      is_visible: isVisible,
      config,
    };

    try {
      if (isEdit && field) {
        await updateField({
          configId,
          fieldId: field.field_id,
          body,
        }).unwrap();
        toast.success("Field updated");
      } else {
        await createField({ configId, body }).unwrap();
        toast.success("Field created");
      }
      onSaved();
    } catch {
      toast.error("Failed to save field");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit field" : "Add field"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.group_id} value={g.group_id}>
                    {g.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Field key</Label>
            <Input
              value={fieldKey}
              disabled={isEdit}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="e.g. blood_pressure"
            />
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={fieldType}
              onValueChange={(v) => setFieldType(v as FormFieldType)}
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
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
          </div>
          {needsOptions && (
            <div className="space-y-2">
              <Label>Options (one per line)</Label>
              <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>Required</Label>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Visible</Label>
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={creating || updating || !groupId || !fieldKey || !label}
            onClick={handleSubmit}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
