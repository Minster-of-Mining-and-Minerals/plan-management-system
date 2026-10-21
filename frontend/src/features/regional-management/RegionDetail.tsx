"use strict";
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Globe,
  Building2,
  Users,
  Palette,
  Plus,
  Trash2,
  Edit,
  Save,
  Layers,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  Download,
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
  useGetRegionByIdQuery,
  useGetRegionalStructuresQuery,
  useCreateRegionalStructureMutation,
  useUpdateRegionalStructureMutation,
  useDeleteRegionalStructureMutation,
  useGetRegionalBrandingQuery,
  useUpdateRegionalBrandingMutation,
} from "@/redux/api/regionApi";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useToggleUserStatusMutation,
  useResetUserPasswordMutation,
} from "@/redux/api/userApi";
import { useGetRolesQuery } from "@/redux/api/roleApi";
import { actionFeedback } from "@/components/action-feedback";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/utils/fileUrl";
import { cn } from "@/lib/utils";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";
import { sortStructuresByTreeDepth } from "@/utils/structureTreeOrderUtils";
import RegionalStructureHierarchy from "./RegionalStructureHierarchy";
import type { RegionalStructure } from "@/redux/types/region";
import type { FilterField, ActionButton } from "@/types/tableLayout";

type TabType = "departments" | "users" | "branding";

export function RegionDetail({ regionId }: { regionId: string }) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
  const [deptStatusFilter, setDeptStatusFilter] = useState("");

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  // Permission gates
  const canAddDept = can("REGIONAL_STRUCTURES:CREATE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin;
  const canUpdateDept = can("REGIONAL_STRUCTURES:UPDATE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin;
  const canDeleteDept = can("REGIONAL_STRUCTURES:DELETE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin;

  const canViewBranding = can("REGIONAL_BRANDING:READ") || can("REGIONAL_BRANDING:UPDATE") || isSuperAdmin;
  const canUpdateBranding = can("REGIONAL_BRANDING:UPDATE") || can("REGIONAL_BRANDING:MANAGE") || isSuperAdmin;

  const canAddUser = can("USERS:CREATE") || isSuperAdmin;
  const canUpdateUser = can("USERS:UPDATE") || isSuperAdmin;

  // Active Tab state
  const [activeTab, setActiveTab] = useState<TabType>("departments");

  // Queries
  const { data: region, isLoading: isRegionLoading, refetch: refetchRegion } = useGetRegionByIdQuery(regionId);
  const { data: structures = [], isLoading: isStructuresLoading, refetch: refetchStructures } =
    useGetRegionalStructuresQuery({ region_id: regionId });
  const { data: brandingData, isLoading: isBrandingLoading, refetch: refetchBranding } =
    useGetRegionalBrandingQuery(regionId, { skip: !canViewBranding });
  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useGetUsersQuery({
    region_id: regionId,
  });
  const { data: roles = [] } = useGetRolesQuery();

  // Mutations
  const [createStructure, { isLoading: isCreatingStructure }] = useCreateRegionalStructureMutation();
  const [updateStructure, { isLoading: isUpdatingStructure }] = useUpdateRegionalStructureMutation();
  const [deleteStructure] = useDeleteRegionalStructureMutation();
  const [updateBranding, { isLoading: isUpdatingBranding }] = useUpdateRegionalBrandingMutation();
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [toggleUserStatus] = useToggleUserStatusMutation();
  const [resetPassword] = useResetUserPasswordMutation();

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<RegionalStructure | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptParentId, setDeptParentId] = useState<string>("");
  const [isParentLocked, setIsParentLocked] = useState(false);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userDeptId, setUserDeptId] = useState("");
  const [userRoleId, setUserRoleId] = useState("");

  // Branding Form State
  const [systemFullName, setSystemFullName] = useState("");
  const [systemShortName, setSystemShortName] = useState("");
  const [systemTagline, setSystemTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0C4A6E");
  const [secondaryColor, setSecondaryColor] = useState("#64748B");
  const [accentColor, setAccentColor] = useState("#CA8A04");
  const [logoPrimaryPath, setLogoPrimaryPath] = useState<string | null>(null);
  const [brandingInitialized, setBrandingInitialized] = useState(false);

  // Sync branding form when loaded
  if (brandingData && !brandingInitialized) {
    setSystemFullName(brandingData.system_name_full || "");
    setSystemShortName(brandingData.system_name_short || "");
    setSystemTagline(brandingData.system_tagline || "");
    setPrimaryColor(brandingData.primary_color || "#0C4A6E");
    setSecondaryColor(brandingData.secondary_color || "#64748B");
    setAccentColor(brandingData.accent_color || "#CA8A04");
    setLogoPrimaryPath(brandingData.logo_primary_path || region?.logo_path || null);
    setBrandingInitialized(true);
  }

  // Department handlers
  const handleOpenDeptModal = (dept?: RegionalStructure, parentId?: string, lockParent?: boolean) => {
    if (dept) {
      setEditingDept(dept);
      setDeptName(dept.name);
      setDeptParentId(dept.parent_id || "");
      setIsParentLocked(false);
    } else {
      setEditingDept(null);
      setDeptName("");
      setDeptParentId(parentId || "");
      setIsParentLocked(Boolean(parentId) || Boolean(lockParent));
    }
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      actionFeedback.error("Department name is required.");
      return;
    }

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
        actionFeedback.success(`Department '${deptName}' updated.`);
      } else {
        await createStructure({
          region_id: regionId,
          name: deptName.trim(),
          parent_id: deptParentId || null,
        }).unwrap();
        actionFeedback.success(`Department '${deptName}' created.`);
      }
      setIsDeptModalOpen(false);
      refetchStructures();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to save department.");
    }
  };

  const handleDeleteDepartment = async (dept: RegionalStructure) => {
    if (!confirm(`Delete regional department '${dept.name}'?`)) return;
    try {
      await deleteStructure({
        id: dept.regional_structure_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success(`Department '${dept.name}' deleted.`);
      refetchStructures();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to delete department.");
    }
  };

  // User handlers
  const handleCreateRegionalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      actionFeedback.error("Name and email are required.");
      return;
    }

    try {
      await createUser({
        full_name: userName.trim(),
        email: userEmail.trim(),
        phone_number: userPhone.trim() || undefined,
        region_id: regionId,
        regional_structure_id: userDeptId || undefined,
        role_ids: userRoleId ? [userRoleId] : undefined,
      } as any).unwrap();

      actionFeedback.success(`Regional account created for ${userName}.`);
      setIsUserModalOpen(false);
      setUserName("");
      setUserEmail("");
      setUserPhone("");
      setUserDeptId("");
      setUserRoleId("");
      refetchUsers();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to create regional account.");
    }
  };

  const handleToggleUser = async (user: any) => {
    try {
      await toggleUserStatus({
        id: user.user_id,
        data: { is_active: !user.is_active },
      }).unwrap();
      actionFeedback.success(`User '${user.full_name}' status updated.`);
      refetchUsers();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update user status.");
    }
  };

  const handleResetUserPassword = async (user: any) => {
    if (!confirm(`Reset password for ${user.full_name}?`)) return;
    try {
      await resetPassword(user.user_id).unwrap();
      actionFeedback.success(`Password reset link/temporary password sent to ${user.email}.`);
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to reset password.");
    }
  };

  // Branding handler
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBranding({
        region_id: regionId,
        data: {
          system_name_full: systemFullName.trim(),
          system_name_short: systemShortName.trim(),
          system_tagline: systemTagline.trim() || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          logo_primary_path: logoPrimaryPath || null,
        },
      }).unwrap();
      actionFeedback.success("Regional branding and logo configuration saved.");
      refetchBranding();
      refetchRegion();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update regional branding.");
    }
  };

  if (isRegionLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Loading regional details...</span>
      </div>
    );
  }

  if (!region) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-destructive">Region Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested regional authority could not be found or has been removed.</p>
        <Button asChild variant="outline">
          <Link href="/admin/regions">Back to Regions</Link>
        </Button>
      </div>
    );
  }

  const effectiveLogoUrl = (logoPrimaryPath || region.logo_path)
    ? getFileUrl(logoPrimaryPath || region.logo_path || "")
    : null;

  const sideActionTabs = [
    {
      id: "departments" as const,
      label: "Departments",
      count: structures.length,
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "users" as const,
      label: "Users",
      count: users.length,
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "branding" as const,
      label: "UI & Configuration",
      icon: <Palette className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ===================== HEADER ===================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-4">
          {effectiveLogoUrl ? (
            <div className="relative h-16 w-16 rounded-full border-2 border-primary/20 bg-muted/40 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <Image
                src={effectiveLogoUrl}
                alt={region.name}
                width={60}
                height={60}
                className="max-h-14 w-auto object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <Globe className="h-8 w-8 text-primary" />
            </div>
          )}

          <div className="space-y-1">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Link
                href="/admin/regions"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Regions
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-foreground font-medium">{region.name}</span>
            </nav>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{region.name}</h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                {region.code}
              </span>
              <ActiveStatusBadge isActive={region.is_active} />
            </div>

            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Regional Bureau Authority • Independent Organizational Domain
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href="/admin/regions" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              All Regions
            </Link>
          </Button>
        </div>
      </div>

      {/* ===================== TAB ACTIONS (STRUCTURE-STYLE) ===================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {sideActionTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 transition-all"
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "ml-1 px-1.5 py-0.2 rounded-full text-xs font-semibold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* ===================== TAB 1: DEPARTMENTS ===================== */}
      {activeTab === "departments" && (() => {
        const handleExportDepartments = () => {
          const headers = ["Department Name", "Level", "Parent Department", "Staff Count", "Status"];
          const rows = filteredDeptData.map((d) => [
            `"${(d.name || "").replace(/"/g, '""')}"`,
            d.level || 1,
            `"${(d.parent?.name || "Root Level").replace(/"/g, '""')}"`,
            d.users_count || 0,
            d.is_active ? "Active" : "Inactive",
          ]);
          const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${region.code}-departments-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          actionFeedback.success("Departments list exported successfully.");
        };

        const deptColumns: ColumnDef<RegionalStructure>[] = [
          {
            accessorKey: "name",
            header: "Department Name",
            cell: ({ row }) => (
              <span className="font-medium text-primary flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary shrink-0" />
                {row.getValue("name")}
              </span>
            ),
          },
          {
            accessorKey: "level",
            header: "Level",
            cell: ({ row }) => <div>Level {row.getValue("level")}</div>,
          },
          {
            accessorKey: "parent",
            header: "Parent Department",
            cell: ({ row }) => (
              <div className="text-gray-500 italic">
                {row.original.parent?.name || "Root Level"}
              </div>
            ),
          },
          {
            accessorKey: "users_count",
            header: "Assigned Staff",
            cell: ({ row }) => (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-medium text-foreground">{row.original.users_count || 0}</span>
                <span>Staff</span>
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
                  {canUpdateDept && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDeptModal(dept)}
                      className="h-8 w-8"
                      title="Edit Department"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {dept.is_active && canAddDept && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDeptModal(undefined, dept.regional_structure_id, true)}
                      className="h-8 w-8 text-primary"
                      title="Add Child Department"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {canDeleteDept && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDepartment(dept)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Delete Department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            },
          },
        ];

        const deptFilters: FilterField[] = [
          {
            key: "status",
            label: "Status",
            type: "multiselect",
            placeholder: "Select status",
            value: deptStatusFilter,
            onChange: setDeptStatusFilter,
            options: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
          },
        ];

        const deptActions: ActionButton[] = [
          {
            label: "Export",
            icon: <Download className="h-4 w-4" />,
            variant: "outline",
            onClick: handleExportDepartments,
          },
          ...(canAddDept
            ? [
                {
                  label: "Add Department",
                  icon: <Plus className="h-4 w-4" />,
                  variant: "default" as const,
                  onClick: () => handleOpenDeptModal(),
                },
              ]
            : []),
        ];

        const filteredDeptData = sortStructuresByTreeDepth(
          structures.filter((item) => {
            const matchesStatus = matchesActiveInactiveFilter(deptStatusFilter, item.is_active);
            const matchesSearch =
              !searchQuery ||
              item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.parent?.name && item.parent.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesStatus && matchesSearch;
          })
        );

        return (
          <div className="space-y-4">
            <TableLayout
              title="Regional Departments"
              description={`Organizational departments and hierarchy confined strictly within ${region.name}`}
              actions={deptActions}
              filters={deptFilters}
              filterColumnsPerRow={1}
              showSearch={true}
              showToggleHierarchyNode={true}
              toggleHierarchyNode={toggleHierarchyView}
              setToggleHierarchyNode={setToggleHierarchyView}
            >
              {!toggleHierarchyView ? (
                <DataTable
                  columns={deptColumns}
                  data={filteredDeptData}
                  isLoading={isStructuresLoading}
                  resetKey={`${searchQuery}-${deptStatusFilter}-${toggleHierarchyView}`}
                />
              ) : (
                <RegionalStructureHierarchy
                  data={filteredDeptData}
                  isLoading={isStructuresLoading}
                  regionName={region.name}
                  onAddChild={(parentId) => handleOpenDeptModal(undefined, parentId, true)}
                  onEdit={(dept) => handleOpenDeptModal(dept)}
                  canAddChild={canAddDept}
                  canUpdate={canUpdateDept}
                />
              )}
            </TableLayout>
          </div>
        );
      })()}

      {/* ===================== TAB 2: USERS ===================== */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Regional User Accounts ({users.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Staff accounts strictly isolated to {region.name}.
              </p>
            </div>
            {canAddUser && (
              <Button onClick={() => setIsUserModalOpen(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create Regional Account
              </Button>
            )}
          </div>

          {users.length === 0 ? (
            <Card className="border border-dashed p-8 text-center bg-card">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground mb-3">No regional accounts created for this region yet.</p>
              {canAddUser && (
                <Button onClick={() => setIsUserModalOpen(true)} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Create First Account
                </Button>
              )}
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Full Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Department</th>
                    <th className="px-4 py-3 text-left font-semibold">Roles</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {users.map((u: any) => (
                    <tr key={u.user_id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground">{u.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.regionalStructure?.name || <span className="italic text-muted-foreground/60">Bureau Wide</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {u.roles?.map((r: any) => r.name).join(", ") || "User"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActiveStatusBadge isActive={u.is_active} />
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {canUpdateUser && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUser(u)}
                              className="h-8 text-xs"
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetUserPassword(u)}
                              className="h-8 text-xs"
                            >
                              Reset Pwd
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: UI CONFIGURATION & BRANDING ===================== */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          {!canViewBranding ? (
            <Card className="border border-destructive/20 p-8 text-center bg-destructive/5">
              <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Permission Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You do not have permission to view or configure regional branding settings.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Branding Settings Form */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      System Identity & UI Configuration
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure custom branding, official regional authority logo, and theme colors for {region.name}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveBranding} className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Full System Name</label>
                          <Input
                            value={systemFullName}
                            onChange={(e) => setSystemFullName(e.target.value)}
                            placeholder="e.g. Oromia Mining Bureau PMS"
                            disabled={!canUpdateBranding}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Short Name / Initials</label>
                          <Input
                            value={systemShortName}
                            onChange={(e) => setSystemShortName(e.target.value)}
                            placeholder="e.g. OR PMS"
                            disabled={!canUpdateBranding}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">System Tagline</label>
                        <Input
                          value={systemTagline}
                          onChange={(e) => setSystemTagline(e.target.value)}
                          placeholder="e.g. Regional Strategic Planning and Execution"
                          disabled={!canUpdateBranding}
                        />
                      </div>

                      {/* File Upload for Regional Logo */}
                      <div className="space-y-1.5">
                        <LogoUploadField
                          label="Official Regional Authority Logo"
                          value={logoPrimaryPath}
                          onChange={(val) => setLogoPrimaryPath(val)}
                          disabled={!canUpdateBranding}
                          successMessage="Regional logo uploaded successfully"
                          errorMessage="Failed to upload regional logo"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Upload PNG, JPG, WEBP, or SVG logo for {region.name}. This logo represents the regional bureau across headers and reports.
                        </p>
                      </div>

                      {/* Color Palette Controls */}
                      <div className="grid gap-4 sm:grid-cols-3 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Primary Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              disabled={!canUpdateBranding}
                              className="h-9 w-12 rounded cursor-pointer border"
                            />
                            <Input
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              disabled={!canUpdateBranding}
                              className="font-mono text-xs uppercase"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Secondary Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              disabled={!canUpdateBranding}
                              className="h-9 w-12 rounded cursor-pointer border"
                            />
                            <Input
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              disabled={!canUpdateBranding}
                              className="font-mono text-xs uppercase"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Accent Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              disabled={!canUpdateBranding}
                              className="h-9 w-12 rounded cursor-pointer border"
                            />
                            <Input
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              disabled={!canUpdateBranding}
                              className="font-mono text-xs uppercase"
                            />
                          </div>
                        </div>
                      </div>

                      {canUpdateBranding && (
                        <div className="pt-4 flex justify-end">
                          <Button type="submit" disabled={isUpdatingBranding} className="gap-2">
                            {isUpdatingBranding ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {isUpdatingBranding ? "Saving Settings..." : "Save UI Configuration"}
                          </Button>
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Live Theme Preview */}
              <div className="space-y-4">
                <Card className="overflow-hidden border shadow-sm">
                  <CardHeader className="bg-muted/40 pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Live Brand Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Simulated Header Banner */}
                    <div
                      style={{ backgroundColor: primaryColor }}
                      className="p-3 rounded-md text-white flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {logoPrimaryPath ? (
                          <div className="h-7 w-7 rounded bg-white/20 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                            <Image
                              src={getFileUrl(logoPrimaryPath)}
                              alt="Logo preview"
                              width={24}
                              height={24}
                              className="max-h-6 w-auto object-contain"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <Globe className="h-5 w-5 shrink-0 opacity-80" />
                        )}
                        <span className="font-bold text-xs truncate">
                          {systemShortName || `${region.code} PMS`}
                        </span>
                      </div>
                      <span
                        style={{ backgroundColor: accentColor }}
                        className="text-[10px] px-2 py-0.5 rounded text-white font-medium shrink-0"
                      >
                        {region.code} Region
                      </span>
                    </div>

                    {/* Simulated Bureau Card */}
                    <div className="p-3 border rounded-md space-y-2 bg-background">
                      <div className="font-semibold text-xs text-foreground">
                        {systemFullName || `${region.name} Mining Bureau`}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {systemTagline || "Regional Strategic Planning and Execution"}
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          style={{ backgroundColor: primaryColor }}
                          className="px-2.5 py-1 text-[11px] text-white rounded font-medium shadow-xs"
                        >
                          Primary Action
                        </button>
                        <button
                          type="button"
                          style={{ borderColor: secondaryColor, color: secondaryColor }}
                          className="px-2.5 py-1 text-[11px] border rounded font-medium"
                        >
                          Secondary
                        </button>
                      </div>
                    </div>

                    {/* Color Swatches */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-muted-foreground">Active Palette</div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="p-2 rounded border" style={{ backgroundColor: primaryColor, color: "#fff" }}>
                          <span className="font-mono">{primaryColor}</span>
                          <div className="text-[9px] opacity-80">Primary</div>
                        </div>
                        <div className="p-2 rounded border" style={{ backgroundColor: secondaryColor, color: "#fff" }}>
                          <span className="font-mono">{secondaryColor}</span>
                          <div className="text-[9px] opacity-80">Secondary</div>
                        </div>
                        <div className="p-2 rounded border" style={{ backgroundColor: accentColor, color: "#fff" }}>
                          <span className="font-mono">{accentColor}</span>
                          <div className="text-[9px] opacity-80">Accent</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== DEPARTMENT MODAL ===================== */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          {(() => {
            const lockedParentDept = structures.find((s) => s.regional_structure_id === deptParentId);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {editingDept
                      ? `Edit Department: ${editingDept.name}`
                      : isParentLocked && lockedParentDept
                      ? `Add Child Department under "${lockedParentDept.name}"`
                      : `Add Department to ${region.name}`}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveDepartment} className="space-y-4 py-2">
                  {isParentLocked && lockedParentDept && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Parent Department</label>
                      <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate">{lockedParentDept.name}</span>
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                          Level {lockedParentDept.level}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Department Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Mineral Licensing & Inspection Directorate"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      required
                    />
                  </div>

                  {!isParentLocked && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Parent Department (Optional)</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={deptParentId}
                        onChange={(e) => setDeptParentId(e.target.value)}
                      >
                        <option value="">Root Level (No Parent Department)</option>
                        {structures
                          .filter((s) => !editingDept || s.regional_structure_id !== editingDept.regional_structure_id)
                          .map((s) => (
                            <option key={s.regional_structure_id} value={s.regional_structure_id}>
                              {"— ".repeat((s.level || 1) - 1)} {s.name} (Level {s.level})
                            </option>
                          ))}
                      </select>
                      <p className="text-[11px] text-muted-foreground">
                        Select a parent department inside {region.name} to establish a multi-level hierarchy.
                      </p>
                    </div>
                  )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeptModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingStructure || isUpdatingStructure}>
                {isCreatingStructure || isUpdatingStructure
                  ? "Saving..."
                  : editingDept
                  ? "Update Department"
                  : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </>
      );
    })()}
  </DialogContent>
</Dialog>

      {/* ===================== USER MODAL ===================== */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Regional Account for {region.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRegionalUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Almaz Tadesse"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="e.g. almaz@oromia-mining.gov.et"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone Number</label>
              <Input
                placeholder="e.g. +251 91 123 4567"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assigned Department</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={userDeptId}
                onChange={(e) => setUserDeptId(e.target.value)}
              >
                <option value="">Bureau Wide (Unassigned to specific department)</option>
                {structures.map((s) => (
                  <option key={s.regional_structure_id} value={s.regional_structure_id}>
                    {s.name} (Level {s.level})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={userRoleId}
                onChange={(e) => setUserRoleId(e.target.value)}
              >
                <option value="">Select a Role</option>
                {roles.map((r: any) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingUser}>
                {isCreatingUser ? "Creating Account..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
