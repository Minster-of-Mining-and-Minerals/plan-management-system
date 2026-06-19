"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, Settings2 } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionButton } from "@/types/tableLayout";
import {
  useGetIssueCategoriesQuery,
  useDeactivateIssueCategoryMutation,
} from "@/redux/api/issueApi";
import { IssueCategory } from "@/redux/types/issue";
import { CreateIssueCategoryModal } from "./modals/CreateIssueCategoryModal";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
  FORM_CONFIG_PERMISSIONS,
  ISSUE_CATEGORY_PERMISSIONS,
} from "@/utils/issuePermissionUtils";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";

function getContainerSummary(category: IssueCategory) {
  const containers = category.formConfigContainers ?? [];
  const published = containers.filter((c) => c.is_active && c.is_published).length;
  const draft = containers.filter((c) => c.is_active && !c.is_published).length;

  if (!containers.length) {
    return { label: "No form containers", badge: null as string | null };
  }

  return {
    label: `${containers.length} container${containers.length === 1 ? "" : "s"}`,
    badge: `${published} published${draft ? ` · ${draft} draft` : ""}`,
  };
}

export default function IssueCategoryTable() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const { can } = usePermissions();

  const { data: categories = [], isLoading, refetch } = useGetIssueCategoriesQuery({});
  const [deactivateCategory] = useDeactivateIssueCategoryMutation();

  const handleDeactivate = async (category: IssueCategory) => {
    if (!category.is_active) return;
    if (
      await actionFeedback.confirm(
        `Deactivate category "${category.name}"? Its form containers will no longer be available for issue submission.`,
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
      header: "Category",
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
      id: "containers",
      header: "Form Containers",
      cell: ({ row }) => {
        const summary = getContainerSummary(row.original);
        return (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{summary.label}</span>
            {summary.badge ? <Badge variant="secondary">{summary.badge}</Badge> : null}
          </div>
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

          {can(FORM_CONFIG_PERMISSIONS.READ) ? (
            <Button
              variant="ghost"
              size="icon"
              title="Manage form containers"
              onClick={() => router.push("/issues/form-config")}
            >
              <Settings2 className="h-4 w-4" />
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
        description="Create issue categories, then add one or more form containers for each category under Form Configuration."
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
    </>
  );
}
