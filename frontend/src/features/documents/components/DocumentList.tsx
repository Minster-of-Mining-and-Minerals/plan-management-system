"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { actionFeedback } from "@/components/action-feedback";
import { CreateDocumentDialog } from "@/features/documents/components/CreateDocumentDialog";
import { DocumentCardGrid } from "@/features/documents/components/DocumentCardGrid";
import { DocumentEmptyState } from "@/features/documents/components/DocumentEmptyState";
import { DocumentTypeBadge } from "@/features/documents/components/DocumentTypeBadge";
import {
  DocumentViewMode,
  DocumentViewToggle,
  getStoredDocumentViewMode,
  setStoredDocumentViewMode,
} from "@/features/documents/components/DocumentViewToggle";
import {
  formatFileSize,
  formatRelativeUpdated,
} from "@/features/documents/utils/documentFormatUtils";
import { documentTypeLabel } from "@/features/documents/utils/documentTypeUtils";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useDeleteDocumentMutation,
  useGetDocumentsQuery,
} from "@/redux/api/collaborationApi";
import type { CollaborationDocument, DocumentOwnerType } from "@/redux/types/document";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { PLAN_PERMISSIONS } from "@/utils/planPermissionUtils";
import {
  matchesMultiValueFilter,
  matchesSearchQuery,
} from "@/utils/tableUtils";

interface DocumentListProps {
  ownerType?: DocumentOwnerType;
  ownerId?: string;
  editorBasePath?: string;
  title?: string;
  description?: string;
}

export default function DocumentList({
  ownerType = "standalone",
  ownerId,
  editorBasePath = "/documents",
  title = "Documents",
  description = "Create Word or Excel files and collaborate in real time.",
}: DocumentListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { canAny } = usePermissions();

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"docx" | "xlsx" | "upload">("docx");
  const [viewMode, setViewMode] = useState<DocumentViewMode>("table");

  const { data: documents, isLoading } = useGetDocumentsQuery({
    ownerApp: "plan-management",
    ownerType,
    ownerId,
  });
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();

  useEffect(() => {
    setViewMode(getStoredDocumentViewMode());
  }, []);

  const canCreate =
    ownerType === "plan_version"
      ? canAny([
          PLAN_PERMISSIONS.UPDATE,
          "PLANS:EDIT_FINALIZED",
          "DOCUMENTS:CREATE",
          "DOCUMENTS:MANAGE",
        ])
      : canAny(["DOCUMENTS:CREATE", "DOCUMENTS:MANAGE"]);

  const createPermissions =
    ownerType === "plan_version"
      ? [
          PLAN_PERMISSIONS.UPDATE,
          "PLANS:EDIT_FINALIZED",
          "DOCUMENTS:CREATE",
          "DOCUMENTS:MANAGE",
        ]
      : ["DOCUMENTS:CREATE", "DOCUMENTS:MANAGE"];

  const handleViewModeChange = (mode: DocumentViewMode) => {
    setViewMode(mode);
    setStoredDocumentViewMode(mode);
  };

  const openCreateDialog = (mode: "docx" | "xlsx" | "upload" = "docx") => {
    setCreateMode(mode);
    setCreateOpen(true);
  };

  const handleOpen = (documentId: string) => {
    router.push(`${editorBasePath}/${documentId}`);
  };

  const handleDelete = async (documentId: string, documentTitle: string) => {
    if (
      !(await actionFeedback.confirm(`Delete "${documentTitle}"? This cannot be undone.`, {
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await deleteDocument(documentId).unwrap();
      actionFeedback.success("Document deleted");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to delete document");
    }
  };

  const filteredDocuments = useMemo(() => {
    return (documents || []).filter((document) => {
      if (!matchesMultiValueFilter(typeFilter, document.file_type)) return false;
      if (!matchesMultiValueFilter(statusFilter, document.status)) return false;
      return matchesSearchQuery(searchQuery, [
        document.title,
        document.file_name,
        documentTypeLabel(document.file_type),
        document.status,
      ]);
    });
  }, [documents, searchQuery, statusFilter, typeFilter]);

  const columns: ColumnDef<CollaborationDocument>[] = [
    {
      id: "type",
      header: "Type",
      meta: { headerClassName: "w-[110px]", cellClassName: "whitespace-nowrap" },
      cell: ({ row }) => <DocumentTypeBadge fileType={row.original.file_type} />,
    },
    {
      accessorKey: "title",
      header: "Title",
      meta: {
        headerClassName: "w-[30%]",
        cellClassName: "max-w-0 overflow-hidden !whitespace-normal",
      },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => handleOpen(row.original.document_id)}
          className="truncate text-left font-medium text-primary hover:underline"
          title={row.original.title}
        >
          {row.original.title}
        </button>
      ),
    },
    {
      accessorKey: "version_number",
      header: "Ver.",
      meta: { headerClassName: "w-[70px]", cellClassName: "whitespace-nowrap" },
      cell: ({ row }) => <span>v{row.original.version_number}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { headerClassName: "w-[110px]", cellClassName: "whitespace-nowrap" },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.original.status === "finalized" ? "secondary" : "outline"}>
            {row.original.status}
          </Badge>
          {row.original.access?.mode === "view" ? (
            <Badge variant="outline">View only</Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      meta: { headerClassName: "w-[130px]", cellClassName: "whitespace-nowrap" },
      cell: ({ row }) => (
        <span className="text-muted-foreground" title={row.original.updated_at}>
          {formatRelativeUpdated(row.original.updated_at)}
        </span>
      ),
    },
    {
      accessorKey: "file_size",
      header: "Size",
      meta: { headerClassName: "w-[90px]", cellClassName: "whitespace-nowrap" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatFileSize(row.original.file_size)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      meta: { headerClassName: "w-[90px]", cellClassName: "whitespace-nowrap" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpen(row.original.document_id)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </DropdownMenuItem>
            {row.original.access?.canDelete ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
                onClick={() => handleDelete(row.original.document_id, row.original.title)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: FilterField[] = [
    {
      key: "type",
      label: "Type",
      type: "multiselect",
      placeholder: "All types",
      value: typeFilter,
      onChange: setTypeFilter,
      options: [
        { label: "Word", value: "docx" },
        { label: "Excel", value: "xlsx" },
        { label: "PowerPoint", value: "pptx" },
        { label: "PDF", value: "pdf" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "All statuses",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "Draft", value: "draft" },
        { label: "Finalized", value: "finalized" },
      ],
    },
  ];

  const actions: ActionButton[] = [
    {
      label: "New document",
      icon: <Plus className="h-4 w-4" />,
      permissions: createPermissions,
      onClick: () => openCreateDialog("docx"),
    },
  ];

  const hasDocuments = Boolean(documents?.length);
  const showEmptyState = !isLoading && !hasDocuments;

  return (
    <>
      <TableLayout
        title={title}
        description={description}
        actions={actions}
        filters={filters}
        filterColumnsPerRow={2}
      >
        {!showEmptyState ? (
          <div className="mb-4 flex justify-end">
            <DocumentViewToggle value={viewMode} onChange={handleViewModeChange} />
          </div>
        ) : null}

        {showEmptyState ? (
          <DocumentEmptyState
            canCreate={canCreate}
            onCreateWord={() => openCreateDialog("docx")}
            onCreateExcel={() => openCreateDialog("xlsx")}
            onUpload={() => openCreateDialog("upload")}
          />
        ) : viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={filteredDocuments}
            isLoading={isLoading}
            resetKey={`${searchQuery}-${typeFilter}-${statusFilter}`}
            tableClassName="table-fixed w-full"
          />
        ) : (
          <>
            {!isLoading && filteredDocuments.length === 0 ? (
              <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                No documents match your search or filters.
              </div>
            ) : (
              <DocumentCardGrid
                documents={filteredDocuments}
                isLoading={isLoading}
                onOpen={handleOpen}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            )}
          </>
        )}
      </TableLayout>

      <CreateDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        ownerType={ownerType}
        ownerId={ownerId}
        editorBasePath={editorBasePath}
        initialMode={createMode}
      />
    </>
  );
}
