"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import type { FilterField } from "@/types/tableLayout";
import { useGetNotesQuery, useDeleteNoteMutation } from "@/redux/api/noteApi";
import type { Note } from "@/redux/types/note";
import { NOTES_CREATE, NOTES_DELETE, NOTES_UPDATE } from "@/redux/types/note";

export default function NotesTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [pinnedFilter, setPinnedFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const resetKey = `${searchQuery}-${pinnedFilter}`;
  useEffect(() => setPageIndex(0), [resetKey]);

  const { data: response, isLoading } = useGetNotesQuery({
    page: pageIndex + 1,
    limit: pageSize,
    search: searchQuery || undefined,
    is_pinned: pinnedFilter === "true" ? true : pinnedFilter === "false" ? false : undefined,
  });

  const [deleteNote] = useDeleteNoteMutation();
  const notes = response?.data ?? [];
  const totalRows = response?.meta?.total ?? 0;

  const handleDelete = async (note: Note) => {
    if (!window.confirm(`Delete note "${note.title}"?`)) return;
    try {
      await deleteNote(note.note_id).unwrap();
      actionFeedback.success("Note deleted");
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to delete note");
    }
  };

  const columns: ColumnDef<Note>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_pinned && (
            <Pin className="h-4 w-4 shrink-0 text-primary" aria-label="Pinned" />
          )}
          <span className="font-medium text-primary">{row.original.title}</span>
        </div>
      ),
    },
    {
      id: "attachments",
      header: "Attachments",
      cell: ({ row }) => row.original.attachments_count ?? row.original.attachments?.length ?? 0,
    },
    {
      accessorKey: "is_pinned",
      header: "Pinned",
      cell: ({ row }) => (
        <Badge variant={row.original.is_pinned ? "default" : "outline"}>
          {row.original.is_pinned ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created Date",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: "updated_at",
      header: "Updated Date",
      cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/settings/notes/${row.original.note_id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <PermissionGuard requireAny={[...NOTES_UPDATE]}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/settings/notes/${row.original.note_id}?edit=1`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard requireAny={[...NOTES_DELETE]}>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  const filters: FilterField[] = [
    {
      key: "pinned",
      label: "Pinned",
      type: "select",
      placeholder: "All",
      value: pinnedFilter || "all",
      onChange: (v: string) => setPinnedFilter(v === "all" ? "" : v),
      options: [
        { label: "All", value: "all" },
        { label: "Pinned", value: "true" },
        { label: "Not pinned", value: "false" },
      ],
    },
  ];

  return (
    <TableLayout
      title="Notes"
      description="Your personal notes with rich content and attachments. Pinned notes appear at the top."
      actions={[
        {
          label: "Create Note",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => router.push("/settings/notes/new"),
          permissions: [...NOTES_CREATE],
        },
      ]}
      filters={filters}
    >
      <DataTable
        columns={columns}
        data={notes}
        isLoading={isLoading}
        paginationMode="server"
        totalRowCount={totalRows}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPaginationChange={(index, size) => {
          setPageIndex(index);
          setPageSize(size);
        }}
        resetKey={resetKey}
      />
    </TableLayout>
  );
}
