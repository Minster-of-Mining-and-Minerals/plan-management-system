"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Copy,
  Archive,
  Trash2,
  Eye,
  FileText,
} from "lucide-react";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ActionButton } from "@/types/tableLayout";
import {
  useListDiagnosisTemplatesQuery,
  useGetDiagnosisTemplateFormQuery,
  useCreateDiagnosisTemplateMutation,
  useUpdateDiagnosisTemplateMutation,
  useArchiveDiagnosisTemplateMutation,
  useDeleteDiagnosisTemplateMutation,
  useDuplicateDiagnosisTemplateMutation,
  useDeleteTemplateGroupMutation,
  useReorderTemplateGroupsMutation,
  useDeleteTemplateFieldMutation,
  useReorderTemplateFieldsMutation,
} from "@/redux/api/diagnosisTemplateApi";
import { DiagnosisFormStructureEditor } from "./DiagnosisFormStructureEditor";
import { toast } from "sonner";
import type { DiagnosisTemplate } from "@/redux/api/diagnosisTemplateApi";

export default function DiagnosisFormManagement() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: templates = [], refetch: refetchList } = useListDiagnosisTemplatesQuery(
    { include_archived: includeArchived }
  );

  const selected = templates.find((t) => t.template_id === selectedId);

  const { data: grouped, refetch: refetchForm } = useGetDiagnosisTemplateFormQuery(
    selectedId,
    { skip: !selectedId }
  );

  const [createTemplate, { isLoading: creating }] = useCreateDiagnosisTemplateMutation();
  const [updateTemplate] = useUpdateDiagnosisTemplateMutation();
  const [archiveTemplate] = useArchiveDiagnosisTemplateMutation();
  const [deleteTemplate] = useDeleteDiagnosisTemplateMutation();
  const [duplicateTemplate] = useDuplicateDiagnosisTemplateMutation();
  const [deleteGroup] = useDeleteTemplateGroupMutation();
  const [reorderGroups] = useReorderTemplateGroupsMutation();
  const [deleteField] = useDeleteTemplateFieldMutation();
  const [reorderFields] = useReorderTemplateFieldsMutation();

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.status === "active"),
    [templates]
  );

  const actions: ActionButton[] = useMemo(
    () => [
      {
        label: "New template",
        icon: <Plus className="h-4 w-4" />,
        permissions: ["DIAGNOSIS_FORMS:CREATE"],
        onClick: () => {
          setNewTitle("");
          setNewDescription("");
          setCreateOpen(true);
        },
      },
    ],
    []
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const created = await createTemplate({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        seed_defaults: true,
      }).unwrap();
      toast.success("Template created");
      setCreateOpen(false);
      setSelectedId(created.template_id);
      refetchList();
    } catch {
      toast.error("Failed to create template");
    }
  };

  const handleSaveMeta = async () => {
    if (!selectedId) return;
    try {
      await updateTemplate({
        templateId: selectedId,
        body: { title: editTitle, description: editDescription },
      }).unwrap();
      toast.success("Template updated");
      refetchList();
    } catch {
      toast.error("Failed to update template");
    }
  };

  const handleDuplicate = async (t: DiagnosisTemplate) => {
    try {
      const copy = await duplicateTemplate({
        templateId: t.template_id,
        title: `${t.title} (copy)`,
      }).unwrap();
      toast.success("Template duplicated");
      setSelectedId(copy.template_id);
      refetchList();
    } catch {
      toast.error("Failed to duplicate template");
    }
  };

  const handleArchive = async (t: DiagnosisTemplate) => {
    try {
      await archiveTemplate(t.template_id).unwrap();
      toast.success("Template archived");
      if (selectedId === t.template_id) setSelectedId("");
      refetchList();
    } catch {
      toast.error("Failed to archive template");
    }
  };

  const handleDelete = async (t: DiagnosisTemplate) => {
    if (!confirm(`Delete template "${t.title}"? This cannot be undone.`)) return;
    try {
      await deleteTemplate(t.template_id).unwrap();
      toast.success("Template deleted");
      if (selectedId === t.template_id) setSelectedId("");
      refetchList();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  return (
    <TableLayout
      title="Diagnosis Templates"
      description="Shared diagnosis form blueprints. Assign templates to staff from the Users list; staff copies can be customized without changing the template."
      actions={actions}
      showSearch={false}
    >
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="archived"
            checked={includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          <Label htmlFor="archived">Show archived</Label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          <p className="text-sm font-medium">Templates</p>
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No templates yet. Create one to get started.
            </p>
          )}
          {templates.map((t) => (
            <div
              key={t.template_id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedId(t.template_id);
                setEditTitle(t.title);
                setEditDescription(t.description || "");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(t.template_id);
                  setEditTitle(t.title);
                  setEditDescription(t.description || "");
                }
              }}
              className={`w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors ${
                selectedId === t.template_id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {t.description}
                    </p>
                  )}
                </div>
                <Badge variant={t.status === "active" ? "default" : "secondary"}>
                  {t.status}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => {
                    setSelectedId(t.template_id);
                    setPreviewOpen(true);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => handleDuplicate(t)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicate
                </Button>
                {t.status === "active" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => handleArchive(t)}
                  >
                    <Archive className="h-3 w-3 mr-1" />
                    Archive
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                  onClick={() => handleDelete(t)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0">
          {!selectedId && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Select a template to edit sections and fields</p>
              <p className="text-xs mt-1">
                {activeTemplates.length} active template
                {activeTemplates.length !== 1 ? "s" : ""} available for staff assignment
              </p>
            </div>
          )}

          {selectedId && selected && (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2 max-w-2xl">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editTitle || selected.title}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <Button variant="outline" onClick={handleSaveMeta}>
                  Save details
                </Button>
              </div>

              <DiagnosisFormStructureEditor
                scope={{ type: "template", templateId: selectedId }}
                showPreview
                handlers={{
                  grouped,
                  refetch: refetchForm,
                  onDeleteGroup: async (groupId) => {
                    await deleteGroup({ templateId: selectedId, groupId }).unwrap();
                    toast.success("Section removed");
                  },
                  onReorderGroups: async (ids) => {
                    await reorderGroups({ templateId: selectedId, ids }).unwrap();
                  },
                  onDeleteField: async (fieldId) => {
                    await deleteField({ templateId: selectedId, fieldId }).unwrap();
                    toast.success("Field removed");
                  },
                  onReorderFields: async (ids) => {
                    await reorderFields({ templateId: selectedId, ids }).unwrap();
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New diagnosis template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. General Doctor Diagnosis"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creating || !newTitle.trim()} onClick={handleCreate}>
              Create with default sections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template preview</DialogTitle>
          </DialogHeader>
          {selectedId && grouped && (
            <DiagnosisFormStructureEditor
              scope={{ type: "template", templateId: selectedId }}
              readOnly
              showPreview
              handlers={{
                grouped,
                refetch: () => {},
                onDeleteGroup: async () => {},
                onReorderGroups: async () => {},
                onDeleteField: async () => {},
                onReorderFields: async () => {},
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </TableLayout>
  );
}
