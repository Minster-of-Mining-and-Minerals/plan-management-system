"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Plus,
  Trash2,
  Edit,
  Layers,
  Users,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetCompanyStructuresQuery,
  useCreateCompanyStructureMutation,
  useUpdateCompanyStructureMutation,
  useDeleteCompanyStructureMutation,
} from "@/redux/api/companyApi";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { sortStructuresByTreeDepth } from "@/utils/structureTreeOrderUtils";
import CompanyStructureHierarchy from "./CompanyStructureHierarchy";
import type { CompanyStructure } from "@/redux/types/company";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function CompanyDepartmentManagement({
  companyId: propCompanyId,
  companyName: propCompanyName,
  sideActions,
}: {
  companyId?: string;
  companyName?: string;
  sideActions?: ActionButton[];
}) {
  const { data: session } = useSession();
  const companyId = propCompanyId || session?.user?.company_id;

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canCreate =
    can("COMPANY_STRUCTURES:CREATE") ||
    can("COMPANY_STRUCTURES:MANAGE") ||
    can("COMPANIES:MANAGE") ||
    isSuperAdmin;
  const canUpdate =
    can("COMPANY_STRUCTURES:UPDATE") ||
    can("COMPANY_STRUCTURES:MANAGE") ||
    can("COMPANIES:MANAGE") ||
    isSuperAdmin;
  const canDelete =
    can("COMPANY_STRUCTURES:DELETE") ||
    can("COMPANY_STRUCTURES:MANAGE") ||
    can("COMPANIES:MANAGE") ||
    isSuperAdmin;

  const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
  const [deptStatusFilter, setDeptStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: structures = [],
    isLoading,
    refetch,
  } = useGetCompanyStructuresQuery(
    { company_id: companyId || "" },
    { skip: !companyId }
  );

  const [createStructure, { isLoading: isCreating }] = useCreateCompanyStructureMutation();
  const [updateStructure, { isLoading: isUpdating }] = useUpdateCompanyStructureMutation();
  const [deleteStructure] = useDeleteCompanyStructureMutation();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<CompanyStructure | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [deptParentId, setDeptParentId] = useState<string>("");
  const [isParentLocked, setIsParentLocked] = useState(false);

  const handleOpenAddModal = (parentId?: string) => {
    setEditingDept(null);
    setDeptName("");
    setDeptCode("");
    setDeptDescription("");
    setDeptParentId(parentId || "");
    setIsParentLocked(Boolean(parentId));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept: CompanyStructure) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code || "");
    setDeptDescription(dept.description || "");
    setDeptParentId(dept.parent_id || "");
    setIsParentLocked(false);
    setIsModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !companyId) return;

    try {
      if (editingDept) {
        await updateStructure({
          company_id: companyId,
          id: editingDept.company_structure_id,
          data: {
            name: deptName.trim(),
            code: deptCode.trim().toUpperCase() || undefined,
            description: deptDescription.trim() || undefined,
            parent_id: deptParentId ? deptParentId : null,
          },
        }).unwrap();
        actionFeedback.success(`Department '${deptName}' updated successfully.`);
      } else {
        await createStructure({
          company_id: companyId,
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase() || undefined,
          description: deptDescription.trim() || undefined,
          parent_id: deptParentId ? deptParentId : null,
        }).unwrap();
        actionFeedback.success(`Department '${deptName}' created successfully.`);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to save department.");
    }
  };

  const handleDeleteDepartment = async (dept: CompanyStructure) => {
    if (
      !confirm(
        `Are you sure you want to deactivate department "${dept.name}"? Subordinate structures and users must be reassigned first.`
      )
    ) {
      return;
    }

    try {
      await deleteStructure({
        company_id: companyId as string,
        id: dept.company_structure_id,
      }).unwrap();
      actionFeedback.success(`Department '${dept.name}' deleted successfully.`);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to delete department.");
    }
  };

  const sortedStructures = useMemo(() => {
    return sortStructuresByTreeDepth(structures);
  }, [structures]);

  const filteredStructures = useMemo(() => {
    return sortedStructures.filter((dept) => {
      if (deptStatusFilter === "active" && !dept.is_active) return false;
      if (deptStatusFilter === "inactive" && dept.is_active) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = dept.name.toLowerCase().includes(query);
        const codeMatch = dept.code?.toLowerCase().includes(query);
        if (!nameMatch && !codeMatch) return false;
      }
      return true;
    });
  }, [sortedStructures, deptStatusFilter, searchQuery]);

  const columns = useMemo<ColumnDef<CompanyStructure>[]>(() => {
    return [
      {
        accessorKey: "name",
        header: "Department / Organizational Unit",
        cell: ({ row }) => {
          const dept = row.original;
          const indent = (dept.level - 1) * 20;
          return (
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <div>
                <div className="font-medium text-foreground flex items-center gap-2">
                  <span>{dept.name}</span>
                  {dept.code && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-mono text-muted-foreground">
                      {dept.code}
                    </span>
                  )}
                </div>
                {dept.parent && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>Under:</span>
                    <span className="font-medium">{dept.parent.name}</span>
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "level",
        header: "Hierarchy Level",
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            Level {row.original.level}
          </span>
        ),
      },
      {
        accessorKey: "users_count",
        header: "Assigned Users",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{row.original.users_count || 0}</span>
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
          const dept = row.original;
          return (
            <div className="flex items-center gap-1">
              {canCreate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenAddModal(dept.company_structure_id)}
                  className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                  title="Add Subordinate Unit"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">Add Sub-Unit</span>
                </Button>
              )}

              {canUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditModal(dept)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Edit Department"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteDepartment(dept)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  title="Deactivate Department"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [canCreate, canUpdate, canDelete]);

  const filterFields = useMemo<FilterField[]>(() => {
    return [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ],
        value: deptStatusFilter,
        onChange: (val) => setDeptStatusFilter(String(val || "")),
      },
    ];
  }, [deptStatusFilter]);

  const actionButtons = useMemo<ActionButton[]>(() => {
    const btns: ActionButton[] = [
      {
        label: toggleHierarchyView ? "Table View" : "Hierarchy Tree",
        icon: <Layers className="h-4 w-4" />,
        variant: "outline",
        onClick: () => setToggleHierarchyView(!toggleHierarchyView),
      },
    ];

    if (canCreate) {
      btns.push({
        label: "Add Department",
        icon: <Plus className="h-4 w-4" />,
        variant: "default",
        onClick: () => handleOpenAddModal(),
      });
    }

    return btns;
  }, [toggleHierarchyView, canCreate]);

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      <TableLayout
        title="Company Organizational Structure"
        description="Manage company departments, operational divisions, mine sites, and organizational hierarchies."
        filters={filterFields}
        actions={actionButtons}
        sideActions={sideActions}
      >
        {toggleHierarchyView ? (
          <CompanyStructureHierarchy
            data={structures}
            isLoading={isLoading}
            companyName={propCompanyName}
            onAddChild={handleOpenAddModal}
            onEdit={handleOpenEditModal}
            canAddChild={canCreate}
            canUpdate={canUpdate}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredStructures}
            isLoading={isLoading}
          />
        )}
      </TableLayout>

      {/* Add / Edit Department Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveDepartment}>
            <DialogHeader>
              <DialogTitle>
                {editingDept ? "Edit Department" : "Add Department / Division"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Department Name *</label>
                <Input
                  required
                  placeholder="e.g. Geotechnical Exploration & Survey"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Department Code</label>
                <Input
                  placeholder="e.g. GEO_SURV"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Department</label>
                <Select
                  value={deptParentId || "root"}
                  onValueChange={(val) => setDeptParentId(val === "root" ? "" : val)}
                  disabled={isParentLocked}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Root Organizational Unit (No Parent)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Root Organizational Unit (No Parent)</SelectItem>
                    {structures
                      .filter((s) => s.company_structure_id !== editingDept?.company_structure_id)
                      .map((s) => (
                        <SelectItem key={s.company_structure_id} value={s.company_structure_id}>
                          {"— ".repeat(s.level - 1)} {s.name} (Level {s.level})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Parent-child relationships must remain strictly within this company.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Operational responsibilities, branch details, or mandate..."
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                  rows={2}
                />
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
                {isCreating || isUpdating ? "Saving..." : "Save Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
