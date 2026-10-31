"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Plus,
  Trash2,
  Edit,
  Eye,
  Layers,
  Users,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGetRegionalStructuresQuery,
  useCreateRegionalStructureMutation,
  useUpdateRegionalStructureMutation,
  useDeleteRegionalStructureMutation,
} from "@/redux/api/regionApi";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { sortStructuresByTreeDepth } from "@/utils/structureTreeOrderUtils";
import RegionalStructureHierarchy from "./RegionalStructureHierarchy";
import type { RegionalStructure } from "@/redux/types/region";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import Loading01 from "@/features/template/component/Loading/Loading01";

export interface RegionalDepartmentManagementProps {
  forced_parent_id?: string;
  sideActions?: ActionButton[];
  readOnly?: boolean;
  hideHeaderCard?: boolean;
}

export function RegionalDepartmentManagement({
  forced_parent_id,
  sideActions,
  readOnly = false,
  hideHeaderCard = false,
}: RegionalDepartmentManagementProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const regionId = session?.user?.region_id;

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canRead = can("REGIONAL_STRUCTURES:READ") || can("REGIONS:READ") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin;
  const canCreate = !readOnly && (can("REGIONAL_STRUCTURES:CREATE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin);
  const canUpdate = !readOnly && (can("REGIONAL_STRUCTURES:UPDATE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin);
  const canDelete = !readOnly && (can("REGIONAL_STRUCTURES:DELETE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin);

  const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
  const [deptStatusFilter, setDeptStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: structures = [],
    isLoading,
    refetch,
  } = useGetRegionalStructuresQuery(
    { region_id: regionId || "" },
    { skip: !regionId }
  );

  const [createStructure, { isLoading: isCreating }] = useCreateRegionalStructureMutation();
  const [updateStructure, { isLoading: isUpdating }] = useUpdateRegionalStructureMutation();
  const [deleteStructure] = useDeleteRegionalStructureMutation();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<RegionalStructure | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptParentId, setDeptParentId] = useState<string>("");
  const [isParentLocked, setIsParentLocked] = useState(false);

  const handleOpenAddModal = (parentId?: string) => {
    const effectiveParentId = parentId || forced_parent_id || "";
    setEditingDept(null);
    setDeptName("");
    setDeptParentId(effectiveParentId);
    setIsParentLocked(Boolean(effectiveParentId));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept: RegionalStructure) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptParentId(dept.parent_id || "");
    setIsParentLocked(false);
    setIsModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !regionId) return;

    try {
      if (editingDept) {
        await updateStructure({
          id: editingDept.regional_structure_id,
          region_id: regionId,
          data: {
            name: deptName.trim(),
            parent_id: deptParentId || null,
          },
        }).unwrap();
        actionFeedback.success("Department updated successfully.");
      } else {
        await createStructure({
          region_id: regionId,
          name: deptName.trim(),
          parent_id: deptParentId || null,
        }).unwrap();
        actionFeedback.success("Department created successfully.");
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to save department.");
    }
  };

  const handleDeleteDepartment = async (dept: RegionalStructure) => {
    if (!regionId) return;
    if (!confirm(`Are you sure you want to delete "${dept.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteStructure({
        id: dept.regional_structure_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Department deleted successfully.");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to delete department.");
    }
  };

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    return structures.filter((s) => {
      if (forced_parent_id && s.parent_id !== forced_parent_id) {
        return false;
      }
      const matchesSearch = searchQuery
        ? s.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesStatus =
        deptStatusFilter === "active"
          ? s.is_active
          : deptStatusFilter === "inactive"
          ? !s.is_active
          : true;
      return matchesSearch && matchesStatus;
    });
  }, [structures, searchQuery, deptStatusFilter, forced_parent_id]);

  const sortedTreeData = useMemo(() => {
    return sortStructuresByTreeDepth(filteredData);
  }, [filteredData]);

  // Valid parent options (exclude self and descendants when editing)
  const parentOptions = useMemo(() => {
    if (!editingDept) return structures;
    return structures.filter(
      (s) => s.regional_structure_id !== editingDept.regional_structure_id
    );
  }, [structures, editingDept]);

  const columns: ColumnDef<RegionalStructure>[] = [
    {
      accessorKey: "name",
      header: "Department Name",
      cell: ({ row }) => {
        const item = row.original;
        const indent = Math.max(0, (item.level - 1) * 20);
        return (
          <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
              L{item.level}
            </span>
            <span className="font-medium text-foreground">{item.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "parent",
      header: "Parent Department",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.parent?.name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "users_count",
      header: "Staff Members",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {row.original.users_count || 0}
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
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {canRead && (
              <Button
                variant="ghost"
                size="sm"
                title="View Department Details"
                onClick={() =>
                  router.push(`/${regionId}/departments/${item.regional_structure_id}`)
                }
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {canCreate && (
              <Button
                variant="ghost"
                size="sm"
                title="Add Sub-Department"
                onClick={() => handleOpenAddModal(item.regional_structure_id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {canUpdate && (
              <Button
                variant="ghost"
                size="sm"
                title="Edit"
                onClick={() => handleOpenEditModal(item)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                title="Delete"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteDepartment(item)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const filterFields: FilterField[] = [
    {
      label: "Status",
      type: "select",
      key: "status",
      placeholder: "All Statuses",
      value: deptStatusFilter,
      onChange: (val) => setDeptStatusFilter(val),
      options: [
        { label: "All Statuses", value: "" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const actionButtons: ActionButton[] = [];

  if (!forced_parent_id) {
    actionButtons.push({
      label: toggleHierarchyView ? "Table View" : "Tree Hierarchy View",
      icon: <Layers className="h-4 w-4" />,
      onClick: () => setToggleHierarchyView(!toggleHierarchyView),
      variant: "outline",
    });
  }

  if (canCreate) {
    actionButtons.push({
      label: forced_parent_id ? "Create Child Department" : "New Department",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => handleOpenAddModal(forced_parent_id),
      variant: "default",
    });
  }

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      {!hideHeaderCard && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Departments
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your region's organizational structure, directorates, and sections.
            </p>
          </div>
        </div>
      )}

      <TableLayout
        title={hideHeaderCard ? undefined : "Organizational Structure"}
        description={hideHeaderCard ? undefined : "Hierarchical representation of regional departments and branches"}
        filters={filterFields}
        actions={actionButtons}
        sideActions={sideActions}
      >
        {toggleHierarchyView ? (
          <div className="p-4 bg-card rounded-xl border border-border/80">
            <RegionalStructureHierarchy
              data={filteredData}
              regionName={session?.user?.region?.name}
              onAddChild={(parentId) => handleOpenAddModal(parentId)}
              onEdit={(dept) => handleOpenEditModal(dept)}
              canAddChild={canCreate}
              canUpdate={canUpdate}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={sortedTreeData}
            isLoading={isLoading}
          />
        )}
      </TableLayout>

      {/* Add / Edit Department Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveDepartment}>
            <DialogHeader>
              <DialogTitle>
                {editingDept ? "Edit Department" : "Add Regional Department"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Department Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Directorate of Mineral Resources"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Parent Department (Optional)
                </label>
                <select
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value)}
                  disabled={isParentLocked}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— None (Top-Level / Root Directorate) —</option>
                  {parentOptions.map((opt) => (
                    <option key={opt.regional_structure_id} value={opt.regional_structure_id}>
                      {"—".repeat(Math.max(0, opt.level - 1))} {opt.name} (Level {opt.level})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Sub-departments are strictly bound to this region's hierarchy.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {editingDept ? "Update Department" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
