"use client";

import { useMemo, useState } from "react";
import { Plus, Layers, ListTree } from "lucide-react";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActionButton } from "@/types/tableLayout";
import { useGetEligibleStaffQuery } from "@/redux/api/scheduleApi";
import {
  useGetDiagnosisFormConfigByStaffQuery,
  useCreateDiagnosisFormConfigMutation,
  useUpdateDiagnosisFormConfigMutation,
  useGetDiagnosisGroupedFormQuery,
  useDeleteDiagnosisGroupMutation,
  useReorderDiagnosisGroupsMutation,
  useDeleteDiagnosisFieldMutation,
  useReorderDiagnosisFieldsMutation,
} from "@/redux/api/diagnosisFormApi";
import { ConfigTabPanel } from "@/features/form-field-management/ConfigTabPanel";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DiagnosisFieldModal } from "./DiagnosisFieldModal";
import type { FormFieldGroup } from "@/redux/types/formFieldGroup";
import type { FormField } from "@/redux/types/formField";
import { flattenFormFields } from "@/redux/types/formField";
import { DiagnosisGroupModal } from "./DiagnosisGroupModal";

export default function DiagnosisFormManagement() {
  const [staffId, setStaffId] = useState("");
  const [tab, setTab] = useState<"groups" | "fields">("groups");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FormFieldGroup | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const { data: eligibleStaff = [] } = useGetEligibleStaffQuery();
  const {
    data: staffBundle,
    isLoading: loadingConfig,
    refetch: refetchStaffConfig,
  } = useGetDiagnosisFormConfigByStaffQuery(staffId, { skip: !staffId });

  const configId = staffBundle?.config?.config_id;
  const { data: grouped, refetch: refetchForm } = useGetDiagnosisGroupedFormQuery(
    configId!,
    { skip: !configId }
  );

  // Group/field create & update live in DiagnosisGroupModal / DiagnosisFieldModal
  const [createConfig] = useCreateDiagnosisFormConfigMutation();
  const [updateConfig] = useUpdateDiagnosisFormConfigMutation();
  const [deleteGroup] = useDeleteDiagnosisGroupMutation();
  const [reorderGroups] = useReorderDiagnosisGroupsMutation();
  const [deleteField] = useDeleteDiagnosisFieldMutation();
  const [reorderFields] = useReorderDiagnosisFieldsMutation();

  const [configTitle, setConfigTitle] = useState("");
  const [configDescription, setConfigDescription] = useState("");

  const groups = grouped?.groups ?? [];
  const fields = useMemo(() => flattenFormFields(grouped), [grouped]);

  const actions: ActionButton[] = useMemo(() => {
    if (!configId) return [];
    if (tab === "groups") {
      return [
        {
          label: "Add section",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            setEditingGroup(null);
            setGroupModalOpen(true);
          },
        },
      ];
    }
    return [
      {
        label: "Add field",
        icon: <Plus className="h-4 w-4" />,
        onClick: () => {
          setEditingField(null);
          setFieldModalOpen(true);
        },
      },
    ];
  }, [tab, configId]);

  const handleProvisionConfig = async () => {
    if (!staffId) return;
    try {
      await createConfig({
        assigned_staff_id: staffId,
        title: configTitle || "Diagnosis Form",
        description: configDescription || undefined,
        seed_defaults: true,
      }).unwrap();
      toast.success("Diagnosis form created with default sections");
      refetchStaffConfig();
    } catch (e: unknown) {
      toast.error("Failed to create configuration");
    }
  };

  const handleSaveMeta = async () => {
    if (!configId) return;
    try {
      await updateConfig({
        configId,
        body: { title: configTitle, description: configDescription },
      }).unwrap();
      toast.success("Configuration updated");
    } catch {
      toast.error("Failed to update configuration");
    }
  };

  return (
    <TableLayout
      title="Configure Diagnosis Forms"
      description="Each staff member with receive-patient permission can have a dedicated diagnosis form. Sections and fields are fully customizable per staff."
      actions={actions}
      showSearch={false}
    >
      <div className="mb-6 grid gap-4 md:grid-cols-2 max-w-3xl">
        <div className="space-y-2">
          <Label>Staff member</Label>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger>
              <SelectValue placeholder="Select staff…" />
            </SelectTrigger>
            <SelectContent>
              {eligibleStaff.map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!staffId && (
        <p className="text-sm text-muted-foreground">
          Select a staff member to configure their diagnosis form.
        </p>
      )}

      {staffId && loadingConfig && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {staffId && !loadingConfig && !configId && (
        <div className="max-w-lg space-y-4 rounded-lg border p-4">
          <p className="text-sm">No diagnosis form exists for this staff member yet.</p>
          <Input
            placeholder="Form title"
            value={configTitle}
            onChange={(e) => setConfigTitle(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={configDescription}
            onChange={(e) => setConfigDescription(e.target.value)}
          />
          <Button onClick={handleProvisionConfig}>Create with default sections</Button>
        </div>
      )}

      {configId && staffBundle && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 max-w-2xl">
            <Input
              value={configTitle || staffBundle.config.title}
              onChange={(e) => setConfigTitle(e.target.value)}
              placeholder="Form title"
            />
            <Input
              value={configDescription ?? staffBundle.config.description ?? ""}
              onChange={(e) => setConfigDescription(e.target.value)}
              placeholder="Description"
            />
            <Button variant="outline" onClick={handleSaveMeta}>
              Save form details
            </Button>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "groups" | "fields")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="groups" className="gap-2">
                <Layers className="h-4 w-4" />
                Sections
              </TabsTrigger>
              <TabsTrigger value="fields" className="gap-2">
                <ListTree className="h-4 w-4" />
                Fields
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groups">
              <ConfigTabPanel>
                <div className="space-y-2">
                  {groups.map((g, idx) => (
                    <div
                      key={g.group_id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{g.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Order {g.sort_order} · {g.fields?.length ?? 0} fields
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingGroup(g);
                            setGroupModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === 0}
                          onClick={async () => {
                            const ids = groups.map((x) => x.group_id);
                            [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                            await reorderGroups({ configId, ids });
                            refetchForm();
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === groups.length - 1}
                          onClick={async () => {
                            const ids = groups.map((x) => x.group_id);
                            [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                            await reorderGroups({ configId, ids });
                            refetchForm();
                          }}
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            await deleteGroup({ configId, groupId: g.group_id });
                            toast.success("Section deleted");
                            refetchForm();
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ConfigTabPanel>
            </TabsContent>

            <TabsContent value="fields">
              <ConfigTabPanel>
                <div className="space-y-2">
                  {fields.map((f, idx) => (
                    <div
                      key={f.field_id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{f.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {f.field_key} · {f.field_type} · {f.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.is_required && <Badge>Required</Badge>}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingField(f);
                            setFieldModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === 0}
                          onClick={async () => {
                            const ids = fields.map((x) => x.field_id);
                            [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                            await reorderFields({ configId, ids });
                            refetchForm();
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === fields.length - 1}
                          onClick={async () => {
                            const ids = fields.map((x) => x.field_id);
                            [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                            await reorderFields({ configId, ids });
                            refetchForm();
                          }}
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            await deleteField({ configId, fieldId: f.field_id });
                            toast.success("Field deleted");
                            refetchForm();
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ConfigTabPanel>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {configId && (
        <>
          <DiagnosisGroupModal
            configId={configId}
            open={groupModalOpen}
            group={editingGroup}
            onClose={() => setGroupModalOpen(false)}
            onSaved={() => {
              refetchForm();
              setGroupModalOpen(false);
            }}
          />
          <DiagnosisFieldModal
            configId={configId}
            groups={groups}
            open={fieldModalOpen}
            field={editingField}
            onClose={() => setFieldModalOpen(false)}
            onSaved={() => {
              refetchForm();
              setFieldModalOpen(false);
            }}
          />
        </>
      )}
    </TableLayout>
  );
}
