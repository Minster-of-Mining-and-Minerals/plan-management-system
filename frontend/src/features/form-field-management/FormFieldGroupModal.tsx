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
import type {
  FormFieldGroup,
  CreateFormFieldGroupPayload,
  UpdateFormFieldGroupPayload,
} from "@/redux/types/formFieldGroup";
import {
  useCreateFormFieldGroupMutation,
  useUpdateFormFieldGroupMutation,
} from "@/redux/api/formFieldGroupApi";
import { toast } from "sonner";
import { groupHasRequiredVisibleField } from "@/lib/formFieldRules";

interface FormFieldGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: FormFieldGroup | null;
}

export function FormFieldGroupModal({
  isOpen,
  onClose,
  group,
}: FormFieldGroupModalProps) {
  const isEdit = Boolean(group);
  const [createGroup, { isLoading: creating }] =
    useCreateFormFieldGroupMutation();
  const [updateGroup, { isLoading: updating }] =
    useUpdateFormFieldGroupMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isRequired, setIsRequired] = useState(false);

  const canMarkRequired = group
    ? groupHasRequiredVisibleField(group as import("@/redux/types/formField").FormFieldStepGroup)
    : false;

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
  }, [group, isOpen]);

  const handleSave = async () => {
    try {
      if (isEdit && group) {
        const updatePayload: UpdateFormFieldGroupPayload = {
          title,
          description: description || null,
          is_visible: isVisible,
          is_required: canMarkRequired ? isRequired : false,
        };
        await updateGroup({ id: group.group_id, data: updatePayload }).unwrap();
        toast.success("Group updated");
      } else {
        const createPayload: CreateFormFieldGroupPayload = {
          model_name: "Patient",
          title,
          description: description || null,
          is_visible: isVisible,
          is_required: canMarkRequired ? isRequired : false,
        };
        await createGroup(createPayload).unwrap();
        toast.success("Group created");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save group");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit group" : "Create form step"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Steps control wizard order. A step becomes required when it contains
            at least one required field — see Guidelines tab for details.
          </p>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Demographics"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <textarea
              className="w-full min-h-[72px] border rounded-md p-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Visible</Label>
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Required step</Label>
              {!canMarkRequired && isEdit && (
                <p className="text-xs text-muted-foreground">
                  Add at least one required field to enable
                </p>
              )}
            </div>
            <Switch
              checked={isRequired}
              onCheckedChange={setIsRequired}
              disabled={isEdit && !canMarkRequired}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={creating || updating || !title.trim()}
          >
            {creating || updating ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
