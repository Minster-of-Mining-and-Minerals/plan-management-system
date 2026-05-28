"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Stethoscope } from "lucide-react";
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
  useGetDiagnosisFormConfigByStaffQuery,
  useAssignDiagnosisTemplateToStaffMutation,
  useUpdateDiagnosisFormConfigMutation,
  useGetDiagnosisGroupedFormQuery,
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
    data: staffBundle,
    isLoading,
    refetch: refetchStaff,
  } = useGetDiagnosisFormConfigByStaffQuery(staffId, { skip: !staffId });

  const configId = staffBundle?.config?.config_id;
  const { data: grouped, refetch: refetchForm } = useGetDiagnosisGroupedFormQuery(
    configId!,
    { skip: !configId }
  );

  const [assignTemplate, { isLoading: assigning }] =
    useAssignDiagnosisTemplateToStaffMutation();
  const [updateConfig] = useUpdateDiagnosisFormConfigMutation();
  const [deleteGroup] = useDeleteDiagnosisGroupMutation();
  const [reorderGroups] = useReorderDiagnosisGroupsMutation();
  const [deleteField] = useDeleteDiagnosisFieldMutation();
  const [reorderFields] = useReorderDiagnosisFieldsMutation();

  const [templateId, setTemplateId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    if (staffBundle?.config) {
      setFormTitle(staffBundle.config.title);
      setFormDescription(staffBundle.config.description || "");
      if (staffBundle.config.source_template_id) {
        setTemplateId(staffBundle.config.source_template_id);
      }
    } else {
      setFormTitle("");
      setFormDescription("");
      setTemplateId("");
    }
  }, [staffBundle?.config]);

  const handleAssign = async (replace = false) => {
    if (!staffId || !templateId) {
      toast.error("Select a template first");
      return;
    }
    const tpl = activeTemplates.find((t) => t.template_id === templateId);
    try {
      await assignTemplate({
        staffId,
        template_id: templateId,
        replace_existing: replace,
        title: formTitle || tpl?.title,
        description: formDescription || tpl?.description || undefined,
      }).unwrap();
      toast.success(
        replace
          ? "Staff form replaced from template"
          : "Template assigned — staff copy created"
      );
      refetchStaff();
      refetchForm();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to assign template";
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
      toast.success("Staff form details saved");
      refetchStaff();
    } catch {
      toast.error("Failed to save details");
    }
  };

  return (
    <div className="min-h-screen w-full bg-background p-6 space-y-6">
      <DetailHeader
        breadcrumbs={[
          { title: "Users", link: "/users/list" },
          {
            title:
              loadingUser || !user ? "Diagnosis Form Configuration" : formatInternalUserDisplayName(user),
            link: user ? `/users/list/${user.user_id}` : "",
          },
          { title: "Configure Diagnosis Form", link: "" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Configure Diagnosis Form
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {user ? `${formatInternalUserDisplayName(user)} — ` : ""}
            assign a shared template, then customize this staff member&apos;s copy.
            Customizations are isolated per user and do not affect other users.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 rounded-lg border p-4">
            <Label>1. Select template</Label>
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
                No active templates available yet. Create diagnosis templates first from the
                Diagnosis page.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={assigning || !templateId}
                onClick={() => handleAssign(false)}
              >
                {configId ? "Assign template (new copy)" : "Assign template"}
              </Button>
              {configId && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={assigning || !templateId}
                  onClick={() => {
                    if (
                      confirm(
                        "Replace this staff member's form with a fresh copy from the selected template? Existing customizations will be lost."
                      )
                    ) {
                      handleAssign(true);
                    }
                  }}
                >
                  Replace from template
                </Button>
              )}
            </div>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading staff configuration…</p>
          )}

          {!isLoading && !configId && (
            <p className="text-sm text-muted-foreground">
              {activeTemplates.length > 0
                ? "No staff-specific diagnosis form yet. Select a template and assign it to create a customizable copy."
                : "No staff-specific diagnosis form yet. Create templates first, then assign one to this staff member."}
            </p>
          )}

          {configId && staffBundle?.config && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Staff copy</Badge>
                {staffBundle.config.sourceTemplate && (
                  <span className="text-xs text-muted-foreground">
                    From template: {staffBundle.config.sourceTemplate.title}
                  </span>
                )}
              </div>

              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label>Form title</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
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

              <div>
                <Label className="mb-2 block">2. Customize staff copy (optional)</Label>
                <DiagnosisFormStructureEditor
                  scope={{ type: "config", configId }}
                  showPreview
                  handlers={{
                    grouped: grouped ?? staffBundle.form ?? undefined,
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
        </CardContent>
      </Card>
    </div>
  );
}
