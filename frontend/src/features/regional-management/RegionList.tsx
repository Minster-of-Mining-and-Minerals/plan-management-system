"use strict";
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Globe,
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
  useGetRegionsQuery,
  useCreateRegionMutation,
  useUpdateRegionMutation,
  useToggleRegionStatusMutation,
  useDeleteRegionMutation,
} from "@/redux/api/regionApi";
import { actionFeedback } from "@/components/action-feedback";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/utils/fileUrl";
import type { Region } from "@/redux/types/region";
import type { FilterField, ActionButton } from "@/types/tableLayout";

export function RegionList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [logoPath, setLogoPath] = useState("");

  const { can } = usePermissions();
  const { roles } = useAuth();
  const isSuperAdmin = roles?.some((r) => String(r).toLowerCase() === "super admin");
  const canCreate = can("REGIONS:CREATE") || can("REGIONS:MANAGE") || isSuperAdmin;
  const canUpdate = can("REGIONS:UPDATE") || can("REGIONS:MANAGE") || isSuperAdmin;
  const canDelete = can("REGIONS:DELETE") || can("REGIONS:MANAGE") || isSuperAdmin;

  const { data: regions = [], isLoading, refetch } = useGetRegionsQuery({
    search: searchQuery || undefined,
  });

  const [createRegion, { isLoading: isCreating }] = useCreateRegionMutation();
  const [updateRegion, { isLoading: isUpdating }] = useUpdateRegionMutation();
  const [toggleStatus] = useToggleRegionStatusMutation();
  const [deleteRegion] = useDeleteRegionMutation();

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setLogoPath("");
    setEditingRegion(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (region: Region) => {
    setEditingRegion(region);
    setName(region.name);
    setCode(region.code);
    setDescription(region.description || "");
    setLogoPath(region.logo_path || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      actionFeedback.error("Region name and code are required.");
      return;
    }

    try {
      if (editingRegion) {
        await updateRegion({
          id: editingRegion.region_id,
          data: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || undefined,
            logo_path: logoPath.trim() || undefined,
          },
        }).unwrap();
        actionFeedback.success(`Region '${name}' updated successfully.`);
      } else {
        await createRegion({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          logo_path: logoPath.trim() || undefined,
        }).unwrap();
        actionFeedback.success(`Region '${name}' registered successfully.`);
      }
      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to save region.");
    }
  };

  const handleToggleActive = async (region: Region) => {
    try {
      await toggleStatus({
        id: region.region_id,
        is_active: !region.is_active,
      }).unwrap();
      actionFeedback.success(`Region '${region.name}' status updated.`);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update region status.");
    }
  };

  const handleDelete = async (region: Region) => {
    if (
      !confirm(
        `Are you sure you want to delete region '${region.name}'? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteRegion(region.region_id).unwrap();
      actionFeedback.success(`Region '${region.name}' deleted.`);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to delete region.");
    }
  };

  const columns: ColumnDef<Region>[] = [
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
            <Globe className="h-4 w-4 text-primary" />
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Region Name",
      cell: ({ row }) => (
        <span
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => router.push(`/admin/regions/${row.original.region_id}`)}
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
      accessorKey: "structures_count",
      header: "Departments",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium text-foreground">{row.original.structures_count || 0}</span>
          <span>Depts</span>
        </div>
      ),
    },
    {
      accessorKey: "active_users_count",
      header: "Active Accounts",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="font-medium text-foreground">{row.original.active_users_count || 0}</span>
          <span>Staff</span>
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
        const region = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              onClick={() => router.push(`/admin/regions/${region.region_id}`)}
              variant="ghost"
              size="icon"
              title="Manage Region & Departments"
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canUpdate && (
              <>
                <Button
                  onClick={() => openEditModal(region)}
                  variant="ghost"
                  size="icon"
                  title="Edit Region"
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleToggleActive(region)}
                  variant="ghost"
                  size="icon"
                  title={region.is_active ? "Deactivate Region" : "Activate Region"}
                  className="h-8 w-8"
                >
                  {region.is_active ? (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                onClick={() => handleDelete(region)}
                variant="ghost"
                size="icon"
                title="Delete Region"
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
      "Region Name",
      "Code",
      "Status",
      "Departments Count",
      "Active Accounts",
      "Description",
    ];
    const rows = filteredData.map((r) => [
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${(r.code || "").replace(/"/g, '""')}"`,
      r.is_active ? "Active" : "Inactive",
      r.structures_count || 0,
      r.active_users_count || 0,
      `"${(r.description || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    actionFeedback.success("Regions list exported successfully.");
  };

  const actions: ActionButton[] = [
    {
      label: "Export",
      icon: <Download className="h-4 w-4" />,
      variant: "outline",
      onClick: handleExport,
    },
    ...(canCreate
      ? [
          {
            label: "Add Region",
            icon: <Plus className="h-4 w-4" />,
            variant: "default" as const,
            onClick: openCreateModal,
          },
        ]
      : []),
  ];

  const filteredData = useMemo(() => {
    return regions.filter((item) => {
      const matchesStatus = matchesActiveInactiveFilter(statusFilter, item.is_active);
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [regions, statusFilter, searchQuery]);

  return (
    <>
      <TableLayout
        title="Regions"
        description="Manage autonomous regional authorities, departments, and system branding"
        actions={actions}
        filters={filters}
        filterColumnsPerRow={1}
        showSearch={true}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          resetKey={`${searchQuery}-${statusFilter}`}
        />
      </TableLayout>

      {/* Registration & Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? `Edit Region: ${editingRegion.name}` : "Register New Region"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Region Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Oromia Mining Bureau"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Region Code <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. OR, AM, SN"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="uppercase font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Unique, stable code used for regional identification and account scoping.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <Input
                placeholder="Brief administrative description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <LogoUploadField
              label="Regional Logo"
              value={logoPath || null}
              onChange={(val) => setLogoPath(val || "")}
              successMessage="Regional logo uploaded"
              errorMessage="Failed to upload regional logo"
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating
                  ? "Saving..."
                  : editingRegion
                  ? "Update Region"
                  : "Register Region"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
