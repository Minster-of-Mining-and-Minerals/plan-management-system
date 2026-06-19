"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, FormInput } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import type { ActionButton } from "@/types/tableLayout";
import {
  useGetIssueCategoriesQuery,
  useDeactivateIssueCategoryMutation,
} from "@/redux/api/issueApi";
import { IssueCategory } from "@/redux/types/issue";
import { CreateIssueCategoryModal } from "./modals/CreateIssueCategoryModal";
import { ConfigureIssueCategoryFormModal } from "./modals/ConfigureIssueCategoryFormModal";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { ISSUE_CATEGORY_PERMISSIONS } from "@/utils/issuePermissionUtils";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";

export default function IssueCategoryTable() {
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
  const [formConfigCategory, setFormConfigCategory] = useState<IssueCategory | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const { can } = usePermissions();

  const { data: categories = [], isLoading, refetch } = useGetIssueCategoriesQuery({});
  const [deactivateCategory] = useDeactivateIssueCategoryMutation();

  const handleDeactivate = async (category: IssueCategory) => {
    if (!category.is_active) return;
    if (
      await actionFeedback.confirm(
        `Deactivate category "${category.name}"? It will no longer appear in issue forms.`,
        { destructive: true }
      )
    ) {
      try {
        await deactivateCategory(category.issue_category_id).unwrap();
        actionFeedback.success("Category deactivated");
        refetch();
      } catch (err: unknown) {
        const error = err as { data?: { message?: string } };
        actionFeedback.error(error.data?.message || "Failed to deactivate category");
      }
    }
  };

  const columns: ColumnDef<IssueCategory>[] = [
    {
      accessorKey: "display_order",
      header: "Order",
      cell: ({ row }) => <span>{row.original.display_order}</span>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          {row.original.code ? (
            <p className="text-xs text-muted-foreground font-mono">{row.original.code}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "parent",
      header: "Issue Area",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.parent?.name || (row.original.is_selectable === false ? "Top-level" : "—")}
        </span>
      ),
    },
    {
      id: "form_fields",
      header: "Form Fields",
      cell: ({ row }) => {
        const customCount = row.original.form_config?.fields?.length ?? 0;
        if (row.original.is_selectable === false) {
          return <span className="text-xs text-muted-foreground">Grouping only</span>;
        }
        return (
          <span className="text-xs text-muted-foreground">
            {customCount} custom field{customCount === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 line-clamp-2">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <PermissionGuard requireAll={[ISSUE_CATEGORY_PERMISSIONS.UPDATE]}>
            <Button
              variant="ghost"
              size="icon"
              title="Edit category"
              onClick={() => {
                setSelectedCategory(row.original);
                setModalOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </PermissionGuard>

          {row.original.is_selectable !== false &&
          can(ISSUE_CATEGORY_PERMISSIONS.CONFIGURE_FORM) ? (
            <Button
              variant="ghost"
              size="icon"
              title="Configure form"
              onClick={() => {
                setFormConfigCategory(row.original);
                setFormModalOpen(true);
              }}
            >
              <FormInput className="h-4 w-4" />
            </Button>
          ) : null}

          <PermissionGuard requireAll={[ISSUE_CATEGORY_PERMISSIONS.UPDATE]}>
            {row.original.is_active && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => handleDeactivate(row.original)}
              >
                Deactivate
              </Button>
            )}
          </PermissionGuard>
        </div>
      ),
    },
  ];

  const actions: ActionButton[] = [
    {
      label: "Add Category",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => {
        setSelectedCategory(null);
        setModalOpen(true);
      },
      permissions: [ISSUE_CATEGORY_PERMISSIONS.CREATE],
    },
  ];

  return (
    <>
      <TableLayout
        title="Issue Categories"
        description={
          can(ISSUE_CATEGORY_PERMISSIONS.CONFIGURE_FORM)
            ? "Manage issue areas and configure raise-issue forms with the visual form builder."
            : "View issue areas and types. Form configuration requires the Configure Form permission."
        }
        actions={actions}
      >
        <DataTable columns={columns} data={categories} isLoading={isLoading} />
      </TableLayout>

      <CreateIssueCategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCategory(null);
          refetch();
        }}
        category={selectedCategory}
      />

      <ConfigureIssueCategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setFormConfigCategory(null);
          refetch();
        }}
        category={formConfigCategory}
      />
    </>
  );
}
