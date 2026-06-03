"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Stethoscope, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DetailHeader from "@/components/common/DetailHeader";
import { formatInternalUserDisplayName } from "@/utils/formatUserDisplayName";
import { useGetUserByIdQuery } from "@/redux/api/userApi";
import {
  useGetDiagnosisFormConfigsByStaffQuery,
  useAssignDiagnosisTemplateToStaffMutation,
  useUpdateDiagnosisFormConfigMutation,
  useGetDiagnosisGroupedFormQuery,
  useDeleteDiagnosisFormConfigMutation,
  useDeleteDiagnosisGroupMutation,
  useReorderDiagnosisGroupsMutation,
  useDeleteDiagnosisFieldMutation,
  useReorderDiagnosisFieldsMutation,
} from "@/redux/api/diagnosisFormApi";
import { useListDiagnosisTemplatesQuery } from "@/redux/api/diagnosisTemplateApi";
import { DiagnosisFormStructureEditor } from "./DiagnosisFormStructureEditor";
import { toast } from "sonner";

export default function StaffDiagnosisConfigPage() {
  const params = useParams();
  const staffId = params.userId as string;

  const { data: user, isLoading: loadingUser } = useGetUserByIdQuery(staffId, {
    skip: !staffId,
  });
  const { data: templates = [] } = useListDiagnosisTemplatesQuery();
  const activeTemplates = templates.filter((t) => t.status === "active");

  const {
    data: staffForms = [],
    isLoading,
    refetch: refetchStaff,
  } = useGetDiagnosisFormConfigsByStaffQuery(staffId, { skip: !staffId });

  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    if (!staffForms.length) {
      setSelectedConfigId("");
      return;
    }
    const valid = staffForms.some((b) => b.config.config_id === selectedConfigId);
    if (!valid) {
      setSelectedConfigId(staffForms[0].config.config_id);
    }
  }, [staffForms, selectedConfigId]);

  const selectedBundle =
    staffForms.find((b) => b.config.config_id === selectedConfigId) ?? staffForms[0];

  useEffect(() => {
    if (selectedBundle?.config) {
      setFormTitle(selectedBundle.config.title);
      setFormDescription(selectedBundle.config.description || "");
    } else {
      setFormTitle("");
      setFormDescription("");
    }
  }, [selectedBundle?.config?.config_id, selectedBundle?.config?.title, selectedBundle?.config?.description]);

  const configId = selectedBundle?.config?.config_id;
  const { data: grouped, refetch: refetchForm } = useGetDiagnosisGroupedFormQuery(
    configId!,
    { skip: !configId }
  );

  const [assignTemplate, { isLoading: assigning }] =
    useAssignDiagnosisTemplateToStaffMutation();
  const [updateConfig] = useUpdateDiagnosisFormConfigMutation();
  const [deleteConfig, { isLoading: deleting }] = useDeleteDiagnosisFormConfigMutation();
  const [deleteGroup] = useDeleteDiagnosisGroupMutation();
  const [reorderGroups] = useReorderDiagnosisGroupsMutation();
  const [deleteField] = useDeleteDiagnosisFieldMutation();
  const [reorderFields] = useReorderDiagnosisFieldsMutation();

  const handleAddForm = async () => {
    if (!staffId || !templateId) {
      toast.error("Select a template first");
      return;
    }
    const tpl = activeTemplates.find((t) => t.template_id === templateId);
    try {
      const result = await assignTemplate({
        staffId,
        template_id: templateId,
        replace_existing: false,
        title: newFormTitle || tpl?.title,
        description: newFormDescription || tpl?.description || undefined,
      }).unwrap();
      toast.success("Diagnosis form added for this staff member");
      setTemplateId("");
      setNewFormTitle("");
      setNewFormDescription("");
      await refetchStaff();
      const newId = result?.config?.config_id;
      if (newId) setSelectedConfigId(newId);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to assign template";
      toast.error(message);
    }
  };

  const handleReplaceSelected = async () => {
    if (!staffId || !templateId || !configId) {
      toast.error("Select a template and a form to replace");
      return;
    }
    if (
      !confirm(
        "Replace this form with a fresh copy from the selected template? Existing customizations will be lost."
      )
    ) {
      return;
    }
    const tpl = activeTemplates.find((t) => t.template_id === templateId);
    try {
      await assignTemplate({
        staffId,
        template_id: templateId,
        replace_existing: true,
        config_id: configId,
        title: formTitle || tpl?.title,
        description: formDescription || tpl?.description || undefined,
      }).unwrap();
      toast.success("Form replaced from template");
      refetchStaff();
      refetchForm();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to replace form";
      toast.error(message);
    }
  };

  const handleSaveMeta = async () => {
    if (!configId) return;
    try {
      await updateConfig({
        configId,
        body: { title: formTitle, description: formDescription },
      }).unwrap();
      toast.success("Form details saved");
      refetchStaff();
    } catch {
      toast.error("Failed to save details");
    }
  };

  const handleDeleteSelected = async () => {
    if (!configId) return;
    if (
      !confirm(
        "Remove this diagnosis form from the staff member? Reports already saved keep their history."
      )
    ) {
      return;
    }
    try {
      await deleteConfig(configId).unwrap();
      toast.success("Diagnosis form removed");
      refetchStaff();
    } catch {
      toast.error("Failed to remove form");
    }
  };

  return (
    <div className="min-h-screen w-full bg-background p-6 space-y-6">
      <DetailHeader
        breadcrumbs={[
          { title: "Users", link: "/users/list" },
          {
            title:
              loadingUser || !user
                ? "Diagnosis Form Configuration"
                : formatInternalUserDisplayName(user),
            link: user ? `/users/list/${user.user_id}` : "",
          },
          { title: "Configure Diagnosis Forms", link: "" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Configure Diagnosis Forms
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {user ? `${formatInternalUserDisplayName(user)} — ` : ""}
            assign one or more templates. Each becomes a separate form this staff
            member can choose when diagnosing a patient. Customizations are isolated
            per form and do not affect other users.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 rounded-lg border p-4">
            <Label className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add form from template
            </Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a diagnosis template…" />
              </SelectTrigger>
              <SelectContent>
                {activeTemplates.map((t) => (
                  <SelectItem key={t.template_id} value={t.template_id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No active templates available. Create diagnosis templates first.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Title (optional)</Label>
                <Input
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  placeholder="Defaults to template title"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Description (optional)</Label>
                <Input
                  value={newFormDescription}
                  onChange={(e) => setNewFormDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <Button
              size="sm"
              disabled={assigning || !templateId}
              onClick={handleAddForm}
            >
              Add diagnosis form
            </Button>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading staff configuration…</p>
          )}

          {!isLoading && staffForms.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No diagnosis forms assigned yet. Add at least one template above.
            </p>
          )}

          {staffForms.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Assigned forms ({staffForms.length})</Label>
                <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form to edit…" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffForms.map((b) => (
                      <SelectItem key={b.config.config_id} value={b.config.config_id}>
                        {b.config.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBundle?.config && configId && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Staff copy</Badge>
                      {selectedBundle.config.sourceTemplate && (
                        <span className="text-xs text-muted-foreground">
                          From template: {selectedBundle.config.sourceTemplate.title}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={deleting}
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Remove form
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label>Form title</Label>
                      <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSaveMeta}>
                      Save form details
                    </Button>
                  </div>

                  <div className="space-y-2 rounded-md border border-dashed p-3">
                    <Label className="text-xs">Replace this form from template</Label>
                    <p className="text-xs text-muted-foreground">
                      Select a template above, then replace only the currently selected
                      form.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assigning || !templateId}
                      onClick={handleReplaceSelected}
                    >
                      Replace selected form from template
                    </Button>
                  </div>

                  <div>
                    <Label className="mb-2 block">Customize fields (optional)</Label>
                    <DiagnosisFormStructureEditor
                      scope={{ type: "config", configId }}
                      showPreview
                      handlers={{
                        grouped: grouped ?? selectedBundle.form ?? undefined,
                        refetch: () => {
                          refetchForm();
                          refetchStaff();
                        },
                        onDeleteGroup: async (groupId) => {
                          await deleteGroup({ configId, groupId }).unwrap();
                          toast.success("Section removed");
                        },
                        onReorderGroups: async (ids) => {
                          await reorderGroups({ configId, ids }).unwrap();
                        },
                        onDeleteField: async (fieldId) => {
                          await deleteField({ configId, fieldId }).unwrap();
                          toast.success("Field removed");
                        },
                        onReorderFields: async (ids) => {
                          await reorderFields({ configId, ids }).unwrap();
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
