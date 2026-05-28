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
import type { FormFieldGroup } from "@/redux/types/formFieldGroup";
import {
  useCreateDiagnosisGroupMutation,
  useUpdateDiagnosisGroupMutation,
} from "@/redux/api/diagnosisFormApi";
import {
  useCreateTemplateGroupMutation,
  useUpdateTemplateGroupMutation,
} from "@/redux/api/diagnosisTemplateApi";
import type { DiagnosisStructureScope } from "./DiagnosisFormStructureEditor";
import { toast } from "sonner";

type Props = {
  scope: DiagnosisStructureScope;
  open: boolean;
  group?: FormFieldGroup | null;
  onClose: () => void;
  onSaved: () => void;
};

export function DiagnosisGroupModal({
  scope,
  open,
  group,
  onClose,
  onSaved,
}: Props) {
  const isEdit = Boolean(group);
  const [createConfigGroup, { isLoading: creatingConfig }] =
    useCreateDiagnosisGroupMutation();
  const [updateConfigGroup, { isLoading: updatingConfig }] =
    useUpdateDiagnosisGroupMutation();
  const [createTemplateGroup, { isLoading: creatingTemplate }] =
    useCreateTemplateGroupMutation();
  const [updateTemplateGroup, { isLoading: updatingTemplate }] =
    useUpdateTemplateGroupMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    if (group) {
      setTitle(group.title);
      setDescription(group.description || "");
      setIsVisible(group.is_visible);
      setIsRequired(group.is_required);
    } else {
      setTitle("");
      setDescription("");
      setIsVisible(true);
      setIsRequired(false);
    }
  }, [group, open]);

  const saving =
    creatingConfig || updatingConfig || creatingTemplate || updatingTemplate;

  const handleSubmit = async () => {
    const body = {
      title,
      description,
      is_visible: isVisible,
      is_required: isRequired,
    };
    try {
      if (scope.type === "template") {
        if (isEdit && group) {
          await updateTemplateGroup({
            templateId: scope.templateId,
            groupId: group.group_id,
            body,
          }).unwrap();
        } else {
          await createTemplateGroup({
            templateId: scope.templateId,
            body,
          }).unwrap();
        }
      } else if (isEdit && group) {
        await updateConfigGroup({
          configId: scope.configId,
          groupId: group.group_id,
          body,
        }).unwrap();
      } else {
        await createConfigGroup({
          configId: scope.configId,
          body,
        }).unwrap();
      }
      toast.success(isEdit ? "Section updated" : "Section created");
      onSaved();
    } catch {
      toast.error("Failed to save section");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit section" : "Add section"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Section name</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Visible</Label>
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Required step</Label>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving || !title.trim()} onClick={handleSubmit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
