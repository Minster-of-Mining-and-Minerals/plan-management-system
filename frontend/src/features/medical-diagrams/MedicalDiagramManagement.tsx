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
  useGetMedicalDiagramMetaQuery,
  useCreateMedicalDiagramMutation,
  useUpdateMedicalDiagramMutation,
  useDeleteMedicalDiagramMutation,
  useSeedMedicalDiagramDefaultsMutation,
  type MedicalDiagram,
} from "@/redux/api/medicalDiagramApi";
import { toast } from "sonner";
import type { ActionButton } from "@/types/tableLayout";

export default function MedicalDiagramManagement() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalDiagram | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [imageFile, setImageFile] = useState("");

  const { data: meta } = useGetMedicalDiagramMetaQuery();
  const { data: diagrams = [], isLoading, refetch } = useListMedicalDiagramsQuery({
    include_inactive: includeInactive,
  });
  const [createDiagram, { isLoading: creating }] = useCreateMedicalDiagramMutation();
  const [updateDiagram, { isLoading: updating }] = useUpdateMedicalDiagramMutation();
  const [deleteDiagram] = useDeleteMedicalDiagramMutation();
  const [seedDefaults, { isLoading: seeding }] = useSeedMedicalDiagramDefaultsMutation();

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCode("");
    setCategory(meta?.categories?.[0] || "");
    setStatus("active");
    setImageFile("");
    setEditorOpen(true);
  };

  const openEdit = (row: MedicalDiagram) => {
    setEditing(row);
    setName(row.name);
    setCode(row.code);
    setCategory(row.category || "");
    setStatus(row.status);
    setImageFile(row.image_file || "");
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    try {
      if (editing) {
        await updateDiagram({
          diagramId: editing.diagram_id,
          body: {
            name: name.trim(),
            code: code.trim(),
            category: category || null,
            status,
            image_file: imageFile || null,
          },
        }).unwrap();
        toast.success("Diagram updated");
      } else {
        await createDiagram({
          name: name.trim(),
          code: code.trim(),
          category: category || undefined,
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
          ? `Seeded ${result.seeded} default diagrams`
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
    []
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
        description="Manage diagram templates for canvas annotation fields in diagnosis forms."
        actions={actions}
        showSearch={false}
      >
        <div className="mb-4 flex items-center gap-2 px-1">
          <Switch
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
            id="inactive"
          />
          <Label htmlFor="inactive">Show inactive diagrams</Label>
        </div>
        <DataTable columns={columns} data={diagrams} isLoading={isLoading || seeding} />
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
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {(meta?.categories || []).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
