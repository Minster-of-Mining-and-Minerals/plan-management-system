"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FileUploadField } from "@/features/template/component/FileUploadField";
import { getFileUrl } from "@/utils/fileUrl";
import {
  useListMedicalDiagramsQuery,
  useCreateMedicalDiagramMutation,
  useUpdateMedicalDiagramMutation,
  useDeleteMedicalDiagramMutation,
  useSeedMedicalDiagramDefaultsMutation,
  type MedicalDiagram,
} from "@/redux/api/medicalDiagramApi";
import { useListMedicalDiagramCategoriesQuery } from "@/redux/api/medicalDiagramCategoryApi";
import { MedicalDiagramCategoryPanel } from "./MedicalDiagramCategoryPanel";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { toast } from "sonner";
import type { ActionButton } from "@/types/tableLayout";

const UNCATEGORIZED = "__none__";

export default function MedicalDiagramManagement() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalDiagram | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [imageFile, setImageFile] = useState("");

  const { data: categories = [] } = useListMedicalDiagramCategoriesQuery();
  const activeCategories = categories.filter((c) => c.status === "active");

  const { data: diagrams = [], isLoading, refetch } = useListMedicalDiagramsQuery({
    include_inactive: includeInactive,
  });
  const [createDiagram, { isLoading: creating }] = useCreateMedicalDiagramMutation();
  const [updateDiagram, { isLoading: updating }] = useUpdateMedicalDiagramMutation();
  const [deleteDiagram] = useDeleteMedicalDiagramMutation();
  const [seedDefaults, { isLoading: seeding }] = useSeedMedicalDiagramDefaultsMutation();

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(diagrams, {
      searchKeys: ["name", "code", "category"],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCode("");
    setCategoryId(activeCategories[0]?.category_id || UNCATEGORIZED);
    setStatus("active");
    setImageFile("");
    setEditorOpen(true);
  };

  const openEdit = (row: MedicalDiagram) => {
    setEditing(row);
    setName(row.name);
    setCode(row.code);
    setCategoryId(row.category_id || UNCATEGORIZED);
    setStatus(row.status);
    setImageFile(row.image_file || "");
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    const resolvedCategoryId =
      categoryId && categoryId !== UNCATEGORIZED ? categoryId : null;

    try {
      if (editing) {
        await updateDiagram({
          diagramId: editing.diagram_id,
          body: {
            name: name.trim(),
            code: code.trim(),
            category_id: resolvedCategoryId,
            status,
            image_file: imageFile || null,
          },
        }).unwrap();
        toast.success("Diagram updated");
      } else {
        await createDiagram({
          name: name.trim(),
          code: code.trim(),
          category_id: resolvedCategoryId,
          status,
          image_file: imageFile || undefined,
        }).unwrap();
        toast.success("Diagram created");
      }
      setEditorOpen(false);
      refetch();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to save diagram";
      toast.error(message);
    }
  };

  const handleDelete = async (row: MedicalDiagram) => {
    if (!confirm(`Delete diagram "${row.name}"?`)) return;
    try {
      await deleteDiagram(row.diagram_id).unwrap();
      toast.success("Diagram deleted");
      refetch();
    } catch {
      toast.error("Failed to delete diagram");
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedDefaults().unwrap();
      toast.success(
        result.seeded > 0
          ? `Seeded ${result.seeded} default diagrams (no categories)`
          : "Library already has diagrams"
      );
      refetch();
    } catch {
      toast.error("Failed to seed diagrams");
    }
  };

  const actions: ActionButton[] = useMemo(
    () => [
      {
        label: "New diagram",
        icon: <Plus className="h-4 w-4" />,
        permissions: ["DIAGNOSIS_FORMS:CREATE"],
        onClick: openCreate,
      },
      {
        label: "Seed defaults",
        icon: <ImageIcon className="h-4 w-4" />,
        permissions: ["DIAGNOSIS_FORMS:CREATE"],
        onClick: handleSeed,
      },
    ],
    [activeCategories.length]
  );

  const columns: ColumnDef<MedicalDiagram>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <code className="text-xs">{row.original.code}</code>,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => row.original.category || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "preview",
        header: "Preview",
        cell: ({ row }) =>
          row.original.image_file ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getFileUrl(row.original.image_file)}
              alt={row.original.name}
              className="h-10 w-16 rounded border object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">No image</span>
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
    <div className="min-h-screen bg-background p-6 space-y-6">
      <TableLayout
        title="Medical Diagram Library"
        description="Configure categories and diagram templates for canvas annotation fields."
        actions={actions}
        showSearch={false}
      >
        <Tabs defaultValue="diagrams" className="w-full">
          <TabsList>
            <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            <MedicalDiagramCategoryPanel />
          </TabsContent>

          <TabsContent value="diagrams" className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
                id="inactive"
              />
              <Label htmlFor="inactive">Show inactive diagrams</Label>
            </div>
            {activeCategories.length === 0 && (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Add at least one category under the Categories tab before assigning
                diagrams.
              </p>
            )}
            <div className="overflow-hidden rounded-lg border">
              <DataTable
                columns={columns}
                data={paginated}
                isLoading={isLoading || seeding}
                totalPageCount={totalPageCount}
                handlePagination={handlePagination}
                tablePageSize={pageSize}
                currentIndex={pageIndex}
              />
            </div>
          </TabsContent>
        </Tabs>
      </TableLayout>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit diagram" : "New diagram"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={code}
                disabled={Boolean(editing)}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. heart"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
                  {activeCategories.map((c) => (
                    <SelectItem key={c.category_id} value={c.category_id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FileUploadField
              id="medical-diagram-image"
              label="Diagram image"
              value={imageFile}
              onChange={(v) => setImageFile(Array.isArray(v) ? v[0] || "" : String(v ?? ""))}
              accept="image/*"
              showPreview
              valueFormat="fileUrls"
            />
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
