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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { actionFeedback } from "@/components/action-feedback";
import { useUpdateIssueCategoryMutation } from "@/redux/api/issueApi";
import { IssueCategory, IssueCategoryFormConfig } from "@/redux/types/issue";
import { IssueCategoryFormBuilder } from "../components/IssueCategoryFormBuilder";
import { IssueCategoryFormConfigPreview } from "../components/IssueCategoryFormConfigPreview";
import {
  createEmptyFormConfig,
  validateFormConfigBuilder,
} from "../utils/issueFormConfig";
import { ISSUE_CATEGORY_PERMISSIONS } from "@/utils/issuePermissionUtils";
import { usePermissions } from "@/hooks/usePermissions";

interface ConfigureIssueCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: IssueCategory | null;
}

export function ConfigureIssueCategoryFormModal({
  isOpen,
  onClose,
  category,
}: ConfigureIssueCategoryFormModalProps) {
  const [formConfig, setFormConfig] = useState<IssueCategoryFormConfig>(createEmptyFormConfig());
  const [updateCategory, { isLoading }] = useUpdateIssueCategoryMutation();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canConfigureForm = can(ISSUE_CATEGORY_PERMISSIONS.CONFIGURE_FORM);

  useEffect(() => {
    if (category && isOpen) {
      setFormConfig(category.form_config ?? createEmptyFormConfig());
    }
  }, [category, isOpen]);

  const handleSave = async () => {
    if (!category) return;

    const validationError = validateFormConfigBuilder(formConfig);
    if (validationError) {
      actionFeedback.error(validationError);
      return;
    }

    try {
      await updateCategory({
        id: category.issue_category_id,
        data: { form_config: formConfig },
      }).unwrap();
      actionFeedback.success("Issue form configuration saved");
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to save form configuration");
    }
  };

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[860px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Issue Form</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {category.name}
            {category.parent?.name ? ` · ${category.parent.name}` : ""}
          </p>
        </DialogHeader>

        {permissionsLoading && !canConfigureForm ? (
          <p className="text-sm text-muted-foreground py-4">Loading permissions...</p>
        ) : canConfigureForm ? (
          <Tabs defaultValue="builder" className="w-full">
            <TabsList>
              <TabsTrigger value="builder">Form Builder</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="builder" className="mt-4">
              <IssueCategoryFormBuilder value={formConfig} onChange={setFormConfig} />
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <IssueCategoryFormConfigPreview formConfig={formConfig} />
            </TabsContent>
          </Tabs>
        ) : (
          <IssueCategoryFormConfigPreview formConfig={category.form_config} />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {canConfigureForm ? (
            <Button type="button" onClick={handleSave} disabled={isLoading}>
              Save Form Configuration
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
