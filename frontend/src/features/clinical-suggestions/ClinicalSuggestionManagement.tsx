"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Pin, Plus, Trash2 } from "lucide-react";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { SuggestionTextarea } from "@/components/clinical-suggestions/SuggestionTextarea";
import {
  useListClinicalSuggestionsQuery,
  useCreateClinicalSuggestionMutation,
  useUpdateClinicalSuggestionMutation,
  useDeleteClinicalSuggestionMutation,
  useImportClinicalSuggestionDefaultsMutation,
  type ClinicalSuggestion,
  type ClinicalSuggestionCategory,
} from "@/redux/api/clinicalSuggestionApi";
import { useGetDepartmentsQuery } from "@/redux/api/departmentApi";
import { toast } from "sonner";
import type { ActionButton } from "@/types/tableLayout";

const CATEGORIES: ClinicalSuggestionCategory[] = [
  "diagnosis",
  "assessment",
  "plan",
  "prescription",
  "referral",
  "procedure",
  "certificate",
  "general",
];

const ALL_CATEGORIES = "__all__";
const ALL_DEPARTMENTS = "__all__";
const NO_DEPARTMENT = "__none__";

export default function ClinicalSuggestionManagement() {
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">(
    "active"
  );
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicalSuggestion | null>(null);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ClinicalSuggestionCategory>("general");
  const [departmentId, setDepartmentId] = useState(NO_DEPARTMENT);
  const [isPinned, setIsPinned] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: suggestions = [], isLoading, refetch } =
    useListClinicalSuggestionsQuery({
      category: categoryFilter === ALL_CATEGORIES ? undefined : categoryFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.trim() || undefined,
    });

  const [createSuggestion, { isLoading: creating }] =
    useCreateClinicalSuggestionMutation();
  const [updateSuggestion, { isLoading: updating }] =
    useUpdateClinicalSuggestionMutation();
  const [deleteSuggestion] = useDeleteClinicalSuggestionMutation();
  const [importDefaults, { isLoading: importing }] =
    useImportClinicalSuggestionDefaultsMutation();

  const filteredSuggestions = useMemo(() => {
    if (departmentFilter === ALL_DEPARTMENTS) return suggestions;
    if (departmentFilter === NO_DEPARTMENT) {
      return suggestions.filter((s) => !s.department_id);
    }
    return suggestions.filter((s) => s.department_id === departmentFilter);
  }, [suggestions, departmentFilter]);

  const openCreate = () => {
    setEditing(null);
    setText("");
    setCategory("general");
    setDepartmentId(NO_DEPARTMENT);
    setIsPinned(false);
    setIsActive(true);
    setEditorOpen(true);
  };

  const openEdit = (row: ClinicalSuggestion) => {
    setEditing(row);
    setText(row.text);
    setCategory(row.category);
    setDepartmentId(row.department_id || NO_DEPARTMENT);
    setIsPinned(row.is_pinned);
    setIsActive(row.is_active);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error("Suggestion text is required");
      return;
    }
    const resolvedDepartmentId =
      departmentId && departmentId !== NO_DEPARTMENT ? departmentId : null;

    try {
      if (editing) {
        await updateSuggestion({
          suggestionId: editing.suggestion_id,
          body: {
            text: text.trim(),
            category,
            department_id: resolvedDepartmentId,
            is_pinned: isPinned,
            is_active: isActive,
          },
        }).unwrap();
        toast.success("Suggestion updated");
      } else {
        await createSuggestion({
          text: text.trim(),
          category,
          department_id: resolvedDepartmentId,
          is_pinned: isPinned,
          is_active: isActive,
        }).unwrap();
        toast.success("Suggestion created");
      }
      setEditorOpen(false);
      refetch();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to save suggestion";
      toast.error(message);
    }
  };

  const handleDelete = async (row: ClinicalSuggestion) => {
    if (!confirm(`Delete suggestion "${row.text.slice(0, 60)}…"?`)) return;
    try {
      await deleteSuggestion(row.suggestion_id).unwrap();
      toast.success("Suggestion deleted");
      refetch();
    } catch {
      toast.error("Failed to delete suggestion");
    }
  };

  const handleImport = async () => {
    try {
      const result = await importDefaults().unwrap();
      toast.success(
        result.imported > 0
          ? `Imported ${result.imported} default clinical phrases`
          : "Default phrases already imported"
      );
      refetch();
    } catch {
      toast.error("Failed to import default phrases");
    }
  };

  const actions: ActionButton[] = useMemo(
    () => [
      {
        label: "New suggestion",
        icon: <Plus className="h-4 w-4" />,
        permissions: ["CLINICAL_SUGGESTION:CREATE"],
        onClick: openCreate,
      },
      {
        label: "Import defaults",
        icon: <Download className="h-4 w-4" />,
        permissions: ["CLINICAL_SUGGESTION:MANAGE"],
        onClick: handleImport,
      },
    ],
    []
  );

  const columns: ColumnDef<ClinicalSuggestion>[] = useMemo(
    () => [
      {
        accessorKey: "text",
        header: "Text",
        cell: ({ row }) => (
          <span className="line-clamp-2 text-sm">{row.original.text}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.category}
          </Badge>
        ),
      },
      {
        id: "department",
        header: "Department",
        cell: ({ row }) => row.original.department?.name || "Organization-wide",
      },
      {
        accessorKey: "organization_frequency",
        header: "Org usage",
        cell: ({ row }) => row.original.organization_frequency ?? 0,
      },
      {
        accessorKey: "is_pinned",
        header: "Pinned",
        cell: ({ row }) =>
          row.original.is_pinned ? (
            <Pin className="h-4 w-4 text-primary" />
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active ? "Active" : "Disabled"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen space-y-6 bg-background p-6">
      <TableLayout
        title="Clinical Suggestions"
        description="Manage learned and manual clinical text suggestions used across diagnosis forms, certificates, and workflow fields."
        actions={actions}
        showSearch={false}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter suggestions…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                <SelectItem value={NO_DEPARTMENT}>Organization-wide only</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.department_id} value={d.department_id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as "active" | "inactive" | "all")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Disabled only</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <DataTable
            columns={columns}
            data={filteredSuggestions}
            isLoading={isLoading || importing}
          />
        </div>
      </TableLayout>

      <Dialog open={editorOpen} onOpenChange={(v) => !v && setEditorOpen(false)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit suggestion" : "Add suggestion"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Text</Label>
              <SuggestionTextarea
                value={text}
                onChange={setText}
                category={category}
                rows={4}
                placeholder="e.g. Patient presents with…"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as ClinicalSuggestionCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department scope</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT}>
                    Organization-wide
                  </SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.department_id} value={d.department_id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Pin suggestion</Label>
                <p className="text-xs text-muted-foreground">
                  Pinned suggestions rank higher in autocomplete.
                </p>
              </div>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creating || updating} onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
