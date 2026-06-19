"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, Settings2, Upload, UploadCloud } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionButton } from "@/types/tableLayout";
import {
  useGetFormConfigContainersQuery,
  usePublishFormConfigContainerMutation,
  useUnpublishFormConfigContainerMutation,
} from "@/redux/api/formConfigApi";
import { FormConfigContainer } from "@/redux/types/formConfig";
import { FORM_CONFIG_PERMISSIONS } from "@/utils/issuePermissionUtils";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { CreateFormConfigContainerModal } from "./modals/CreateFormConfigContainerModal";
import { ManageFormConfigFieldsModal } from "./modals/ManageFormConfigFieldsModal";

export default function FormConfigContainerTable() {
  const [selectedContainer, setSelectedContainer] = useState<FormConfigContainer | null>(null);
  const [fieldsContainer, setFieldsContainer] = useState<FormConfigContainer | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);

  const { data: containers = [], isLoading, refetch } = useGetFormConfigContainersQuery({});
  const [publishContainer] = usePublishFormConfigContainerMutation();
  const [unpublishContainer] = useUnpublishFormConfigContainerMutation();

  const handlePublishToggle = async (container: FormConfigContainer) => {
    try {
      if (container.is_published) {
        await unpublishContainer(container.form_config_container_id).unwrap();
        actionFeedback.success("Form container unpublished");
      } else {
        await publishContainer(container.form_config_container_id).unwrap();
        actionFeedback.success("Form container published");
      }
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to update publish status");
    }
  };

  const columns: ColumnDef<FormConfigContainer>[] = [
    {
      accessorKey: "display_order",
      header: "Order",
      cell: ({ row }) => row.original.display_order,
    },
    {
      accessorKey: "name",
      header: "Container",
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          <p className="text-xs text-muted-foreground font-mono">{row.original.code}</p>
        </div>
      ),
    },
    {
      id: "fields",
      header: "Fields",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.fields?.filter((f) => f.is_active).length ?? 0} active
        </span>
      ),
    },
    {
      id: "linked",
      header: "Linked Category",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.issueCategory?.name || "—"}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <ActiveStatusBadge isActive={row.original.is_active} />
          {row.original.is_published ? (
            <Badge variant="secondary">Published</Badge>
          ) : (
            <Badge variant="outline">Draft</Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <PermissionGuard requireAll={[FORM_CONFIG_PERMISSIONS.UPDATE]}>
            <Button
              variant="ghost"
              size="icon"
              title="Manage fields"
              onClick={() => setFieldsContainer(row.original)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Edit container"
              onClick={() => {
                setSelectedContainer(row.original);
                setCreateOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title={row.original.is_published ? "Unpublish" : "Publish"}
              onClick={() => handlePublishToggle(row.original)}
            >
              {row.original.is_published ? (
                <UploadCloud className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  const actions: ActionButton[] = [
    {
      label: "Add Form Container",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => {
        setSelectedContainer(null);
        setCreateOpen(true);
      },
      permissions: [FORM_CONFIG_PERMISSIONS.CREATE],
    },
  ];

  return (
    <>
      <TableLayout
        title="Issue Form Containers"
        description="Step 2: for each issue category, create form containers, configure fields, and publish them for issue submission."
        actions={actions}
      >
        <DataTable columns={columns} data={containers} isLoading={isLoading} />
      </TableLayout>

      <CreateFormConfigContainerModal
        isOpen={isCreateOpen}
        onClose={() => {
          setCreateOpen(false);
          setSelectedContainer(null);
          refetch();
        }}
        container={selectedContainer}
      />

      <ManageFormConfigFieldsModal
        isOpen={Boolean(fieldsContainer)}
        onClose={() => {
          setFieldsContainer(null);
          refetch();
        }}
        container={fieldsContainer}
      />
    </>
  );
}
