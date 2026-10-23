"use strict";
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Users,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
} from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGetPurchasingCentersQuery,
  useCreatePurchasingCenterMutation,
  useUpdatePurchasingCenterMutation,
  useTogglePurchasingCenterStatusMutation,
  useDeletePurchasingCenterMutation,
} from "@/redux/api/purchasingCenterApi";
import { actionFeedback } from "@/components/action-feedback";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/utils/fileUrl";
import type { PurchasingCenter } from "@/redux/types/purchasingCenter";
import type { FilterField, ActionButton } from "@/types/tableLayout";

export function PurchasingCenterList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<PurchasingCenter | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [logoPath, setLogoPath] = useState("");

  const { can } = usePermissions();
  const { roles } = useAuth();
  const isSuperAdmin = roles?.some((r) => String(r).toLowerCase() === "super admin");
  const canCreate = can("PURCHASING_CENTERS:CREATE") || can("PURCHASING_CENTERS:MANAGE") || isSuperAdmin;
  const canUpdate = can("PURCHASING_CENTERS:UPDATE") || can("PURCHASING_CENTERS:MANAGE") || isSuperAdmin;
  const canDelete = can("PURCHASING_CENTERS:DEACTIVATE") || can("PURCHASING_CENTERS:MANAGE") || isSuperAdmin;

  const { data: centers = [], isLoading, refetch } = useGetPurchasingCentersQuery({
    search: searchQuery || undefined,
  });

  const [createCenter, { isLoading: isCreating }] = useCreatePurchasingCenterMutation();
  const [updateCenter, { isLoading: isUpdating }] = useUpdatePurchasingCenterMutation();
  const [toggleStatus] = useTogglePurchasingCenterStatusMutation();
  const [deleteCenter] = useDeletePurchasingCenterMutation();

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setLogoPath("");
    setEditingCenter(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (center: PurchasingCenter) => {
    setEditingCenter(center);
    setName(center.name);
    setCode(center.code);
    setDescription(center.description || "");
    setLogoPath(center.logo_path || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      actionFeedback.error("Purchasing center name and code are required.");
      return;
    }

    try {
      if (editingCenter) {
        await updateCenter({
          id: editingCenter.purchasing_center_id,
          data: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || undefined,
            logo_path: logoPath.trim() || undefined,
          },
        }).unwrap();
        actionFeedback.success(`Purchasing center '${name}' updated successfully.`);
      } else {
        await createCenter({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          logo_path: logoPath.trim() || undefined,
        }).unwrap();
        actionFeedback.success(`Purchasing center '${name}' registered successfully.`);
      }
      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string }; message?: string })?.data?.message || (err as Error)?.message || "Failed to save purchasing center.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleToggleActive = async (center: PurchasingCenter) => {
    try {
      await toggleStatus({
        id: center.purchasing_center_id,
        is_active: !center.is_active,
      }).unwrap();
      actionFeedback.success(`Purchasing center '${center.name}' status updated.`);
      refetch();
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to update purchasing center status.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleDelete = async (center: PurchasingCenter) => {
    if (
      !confirm(
        `Are you sure you want to deactivate purchasing center '${center.name}'? This action preserves account history and settings.`
      )
    ) {
      return;
    }
    try {
      await deleteCenter(center.purchasing_center_id).unwrap();
      actionFeedback.success(`Purchasing center '${center.name}' deactivated.`);
      refetch();
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to deactivate purchasing center.";
      actionFeedback.error(errorMsg);
    }
  };

  const columns: ColumnDef<PurchasingCenter>[] = [
    {
      id: "logo",
      header: "",
      cell: ({ row }) => {
        const logoUrl = row.original.logo_path ? getFileUrl(row.original.logo_path) : null;
        return logoUrl ? (
          <div className="relative h-8 w-8 rounded-full border border-primary/20 bg-muted/40 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
            <Image
              src={logoUrl}
              alt={row.original.name}
              width={28}
              height={28}
              className="max-h-7 w-auto object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Center Name",
      cell: ({ row }) => (
        <span
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => router.push(`/admin/purchasing-centers/${row.original.purchasing_center_id}`)}
        >
          {row.getValue("name")}
        </span>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
          {row.getValue("code")}
        </span>
      ),
    },
    {
      accessorKey: "active_users_count",
      header: "Active Accounts",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="font-medium text-foreground">{row.original.active_users_count || 0}</span>
          <span>Accounts</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
          {row.original.description || <span className="italic opacity-60">N/A</span>}
        </div>
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
      cell: ({ row }) => {
        const center = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              onClick={() => router.push(`/admin/purchasing-centers/${center.purchasing_center_id}`)}
              variant="ghost"
              size="icon"
              title="Manage Center & Accounts"
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canUpdate && (
              <>
                <Button
                  onClick={() => openEditModal(center)}
                  variant="ghost"
                  size="icon"
                  title="Edit Center"
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleToggleActive(center)}
                  variant="ghost"
                  size="icon"
                  title={center.is_active ? "Deactivate Center" : "Activate Center"}
                  className="h-8 w-8"
                >
                  {center.is_active ? (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                onClick={() => handleDelete(center)}
                variant="ghost"
                size="icon"
                title="Deactivate Center"
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const handleExport = () => {
    const headers = [
      "Center Name",
      "Code",
      "Status",
      "Active Accounts",
      "Description",
    ];
    const rows = filteredData.map((c) => [
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.code || "").replace(/"/g, '""')}"`,
      c.is_active ? "Active" : "Inactive",
      c.active_users_count || 0,
      `"${(c.description || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchasing-centers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    actionFeedback.success("Purchasing centers list exported successfully.");
  };

  const filteredData = centers.filter((center) => matchesActiveInactiveFilter(statusFilter, center.is_active));

  const sideActions: ActionButton[] = [
    ...(canCreate
      ? [
          {
            label: "Register Purchasing Center",
            icon: <Plus className="h-4 w-4" />,
            onClick: openCreateModal,
          },
        ]
      : []),
    {
      label: "Export CSV",
      icon: <Download className="h-4 w-4" />,
      variant: "outline" as const,
      onClick: handleExport,
    },
  ];

  return (
    <>
      <TableLayout
        title="Purchasing Centers"
        description="Federal registry and administrative management for mineral purchasing centers."
        filters={filters}
        actions={sideActions}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
        />
      </TableLayout>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCenter ? "Edit Purchasing Center" : "Register Purchasing Center"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Purchasing Center Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shakiso Gold Purchasing Center"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Code <span className="text-destructive">*</span>
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. PC-SHAKISO"
                required
                disabled={Boolean(editingCenter)}
              />
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Unique identifier used across transactions and administrative records.
              </span>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this purchasing center"
              />
            </div>

            <div>
              <LogoUploadField
                label="Purchasing Center Emblem / Logo"
                value={logoPath}
                onChange={(val) => setLogoPath(val || "")}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating
                  ? "Saving..."
                  : editingCenter
                  ? "Update Center"
                  : "Register Center"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
