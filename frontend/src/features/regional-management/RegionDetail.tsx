"use strict";
"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
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
  KeyRound,
  Shield,
  Eye,
  Power,
  RotateCcw,
  Mail,
  Search,
  LayoutDashboard,
  Users2,
  Paintbrush,
  MapPin,
  Info,
} from "lucide-react";
import { PermissionStats as StatsComponent } from "@/features/template/component/permissionList/Stats";
import { ResourceGroup as ResourceGroupComponent } from "@/features/template/component/permissionList/ResourceGroup";
import { EmptyState } from "@/features/template/component/permissionList/EmptyState";
import { PermissionSkeleton } from "@/features/template/component/permissionList/Skeleton";
import type { Permission, ResourceGroup as ResourceGroupType, ResourceIcons } from "@/features/template/types/permission";
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
  useGetRegionalRolesQuery,
} from "@/redux/api/regionApi";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useResetUserPasswordMutation,
} from "@/redux/api/userApi";
import {
  useGetPermissionsQuery,
  useTogglePermissionMutation,
} from "@/redux/api/permissionApi";
import RegionalRoleList from "@/features/template/component/roleList/RegionalRoleList";
import { actionFeedback } from "@/components/action-feedback";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { UserAvatar } from "@/components/common/UserAvatar";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/utils/fileUrl";
import { cn } from "@/lib/utils";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";
import { sortStructuresByTreeDepth } from "@/utils/structureTreeOrderUtils";
import RegionalStructureHierarchy from "./RegionalStructureHierarchy";
import type { RegionalStructure } from "@/redux/types/region";
import type { FilterField, ActionButton } from "@/types/tableLayout";

type TabType = "departments" | "users" | "roles" | "permissions" | "branding";

export function RegionDetail({ regionId }: { regionId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const tabParam = searchParams.get("tab") as TabType | null;

  const [activeTab, setActiveTabState] = useState<TabType>(
    tabParam && ["departments", "users", "roles", "permissions", "branding"].includes(tabParam)
      ? tabParam
      : "departments"
  );

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
  const [deptStatusFilter, setDeptStatusFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [userDeptFilter, setUserDeptFilter] = useState("");
  const [permSearchQuery, setPermSearchQuery] = useState("");

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  // Permission gates
  const canAddDept = can("REGIONAL_STRUCTURES:CREATE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin;
  const canUpdateDept = can("REGIONAL_STRUCTURES:UPDATE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin;
  const canDeleteDept = can("REGIONAL_STRUCTURES:DELETE") || can("REGIONAL_STRUCTURES:MANAGE") || isSuperAdmin;

  const canViewBranding = can("REGIONAL_BRANDING:READ") || can("REGIONAL_BRANDING:UPDATE") || isSuperAdmin;
  const canUpdateBranding = can("REGIONAL_BRANDING:UPDATE") || can("REGIONAL_BRANDING:MANAGE") || isSuperAdmin;

  const canAddUser = can("REGIONAL_USERS:CREATE") || can("REGIONAL_USERS:MANAGE") || isSuperAdmin;
  const canUpdateUser = can("REGIONAL_USERS:UPDATE") || can("REGIONAL_USERS:MANAGE") || isSuperAdmin;

  // Queries
  const { data: region, isLoading: isRegionLoading, refetch: refetchRegion } = useGetRegionByIdQuery(regionId);
  const { data: structures = [], isLoading: isStructuresLoading, refetch: refetchStructures } =
    useGetRegionalStructuresQuery({ region_id: regionId });
  const { data: brandingData, isLoading: isBrandingLoading, refetch: refetchBranding } =
    useGetRegionalBrandingQuery(regionId, { skip: !canViewBranding });
  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useGetUsersQuery({
    region_id: regionId,
  });
  const { data: roles = [] } = useGetRegionalRolesQuery();
  const { data: allPermissionsData, isLoading: isPermissionsLoading, refetch: refetchPermissions } =
    useGetPermissionsQuery();

  // Mutations
  const [createStructure, { isLoading: isCreatingStructure }] = useCreateRegionalStructureMutation();
  const [updateStructure, { isLoading: isUpdatingStructure }] = useUpdateRegionalStructureMutation();
  const [deleteStructure] = useDeleteRegionalStructureMutation();
  const [updateBranding, { isLoading: isUpdatingBranding }] = useUpdateRegionalBrandingMutation();
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [toggleUserStatus] = useToggleUserStatusMutation();
  const [resetPassword] = useResetUserPasswordMutation();
  const [togglePermissionMutation, { isLoading: isTogglingPermission }] = useTogglePermissionMutation();

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<RegionalStructure | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptParentId, setDeptParentId] = useState<string>("");
  const [isParentLocked, setIsParentLocked] = useState(false);

  // User Modal State (Create & Edit)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userDeptId, setUserDeptId] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

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

  // Filter ONLY regional permissions (never merged with federal permissions)
  const isRegionalResource = (resource: string) => {
    const r = (resource || "").toLowerCase();
    return r.startsWith("regional_") || r === "regions";
  };

  const regionalPermissions = useMemo(() => {
    const rawList = Array.isArray(allPermissionsData) ? allPermissionsData : [];
    return rawList.filter((p: any) => isRegionalResource(p.resource));
  }, [allPermissionsData]);

  // Dynamically compute attached regional permissions based on selected roles
  const attachedPermissions = useMemo(() => {
    const permMap = new Map<string, { resource: string; action: string }>();
    for (const r of roles as any[]) {
      if (selectedRoleIds.includes(r.role_id)) {
        const perms = r.permissions || r.rolePermissions?.map((rp: any) => rp.permission) || [];
        for (const p of perms) {
          if (p && p.resource && p.action) {
            const key = `${p.resource}:${p.action}`;
            if (!permMap.has(key)) {
              permMap.set(key, { resource: p.resource, action: p.action });
            }
          }
        }
      }
    }
    return Array.from(permMap.values());
  }, [roles, selectedRoleIds]);

  // Regional permissions UI helpers matching common permissions page
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  const toggleResourceExpand = useCallback((resource: string) => {
    setExpandedResource((prev) => (prev === resource ? null : resource));
  }, []);

  const handleTogglePermission = useCallback(
    async (id: string) => {
      try {
        await togglePermissionMutation(id).unwrap();
        actionFeedback.success("Permission updated successfully.");
        refetchPermissions();
      } catch (err: any) {
        actionFeedback.error(err?.data?.message || "Failed to toggle permission.");
      }
    },
    [togglePermissionMutation, refetchPermissions]
  );

  const regionalStats = useMemo(
    () => ({
      total: regionalPermissions.length,
      active: regionalPermissions.filter((p: any) => p.is_active).length,
      inactive: regionalPermissions.filter((p: any) => !p.is_active).length,
    }),
    [regionalPermissions]
  );

  const regionalResourceIcons: ResourceIcons = useMemo(
    () => ({
      regions: <MapPin className="h-4 w-4 text-indigo-500" />,
      regional_dashboard: <LayoutDashboard className="h-4 w-4 text-indigo-500" />,
      regional_structures: <Building2 className="h-4 w-4 text-indigo-500" />,
      regional_users: <Users2 className="h-4 w-4 text-indigo-500" />,
      regional_branding: <Paintbrush className="h-4 w-4 text-indigo-500" />,
    }),
    []
  );

  const regionalResourceGroups = useMemo((): ResourceGroupType[] => {
    const grouped = regionalPermissions.reduce((acc: any, permission: any) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return Object.entries(grouped).map(([resource, perms]: [string, any]) => {
      const activeCount = perms.filter((p: any) => p.is_active).length;
      return {
        resource,
        icon: regionalResourceIcons[resource] || <Shield className="h-4 w-4 text-indigo-500" />,
        permissions: perms,
        isExpanded: expandedResource === resource,
        activeCount,
        totalCount: perms.length,
      };
    });
  }, [regionalPermissions, expandedResource, regionalResourceIcons]);

  const filteredRegionalResourceGroups = useMemo(() => {
    if (!permSearchQuery) return regionalResourceGroups;
    const query = permSearchQuery.toLowerCase();
    return regionalResourceGroups.filter(
      (group) =>
        group.resource.toLowerCase().includes(query) ||
        group.permissions.some((p: any) => p.action.toLowerCase().includes(query))
    );
  }, [regionalResourceGroups, permSearchQuery]);

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

  // User handlers (Create & Edit)
  const handleOpenUserModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setUserName(user.full_name || "");
      setUserEmail(user.email || "");
      setUserPhone(user.phone_number || "");
      setUserDeptId(user.regional_structure_id || "");
      const validRegionalRoleIds = new Set(roles.map((r: any) => r.role_id));
      const rawRoleIds = user.roles?.map((r: any) => r.role_id) || [];
      const roleIds = validRegionalRoleIds.size > 0
        ? rawRoleIds.filter((id: string) => validRegionalRoleIds.has(id))
        : rawRoleIds;
      setSelectedRoleIds(roleIds);
    } else {
      setEditingUser(null);
      setUserName("");
      setUserEmail("");
      setUserPhone("");
      setUserDeptId("");
      setSelectedRoleIds([]);
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      actionFeedback.error("Name and email are required.");
      return;
    }

    try {
      if (editingUser) {
        await updateUser({
          id: editingUser.user_id,
          data: {
            full_name: userName.trim(),
            email: userEmail.trim().toLowerCase(),
            phone_number: userPhone.trim() || undefined,
            regional_structure_id: userDeptId || null,
            role_ids: selectedRoleIds,
          },
        }).unwrap();
        actionFeedback.success(`Regional account '${userName}' updated successfully.`);
      } else {
        await createUser({
          full_name: userName.trim(),
          email: userEmail.trim().toLowerCase(),
          phone_number: userPhone.trim() || undefined,
          region_id: regionId,
          regional_structure_id: userDeptId || undefined,
          role_ids: selectedRoleIds,
        } as any).unwrap();
        actionFeedback.success(`Regional account created for ${userName}.`);
      }
      setIsUserModalOpen(false);
      refetchUsers();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to save user account.");
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

  // Tabular Tab Actions matching GovernmentStructureDetail.tsx pattern
  const sideActionTabs: ActionButton[] = [
    {
      label: "Departments",
      icon: <Layers className="h-4 w-4" />,
      variant: activeTab === "departments" ? "default" : "outline",
      onClick: () => setActiveTab("departments"),
    },
    {
      label: "Users",
      icon: <Users className="h-4 w-4" />,
      variant: activeTab === "users" ? "default" : "outline",
      onClick: () => setActiveTab("users"),
    },
    {
      label: "Roles",
      icon: <KeyRound className="h-4 w-4" />,
      variant: activeTab === "roles" ? "default" : "outline",
      onClick: () => setActiveTab("roles"),
    },
    {
      label: "Permissions",
      icon: <Shield className="h-4 w-4" />,
      variant: activeTab === "permissions" ? "default" : "outline",
      onClick: () => setActiveTab("permissions"),
    },
    {
      label: "UI & Configuration",
      icon: <Palette className="h-4 w-4" />,
      variant: activeTab === "branding" ? "default" : "outline",
      onClick: () => setActiveTab("branding"),
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
              sideActions={sideActionTabs}
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

      {/* ===================== TAB 2: USERS (WITH EDIT & FULL ACTIONS) ===================== */}
      {activeTab === "users" && (() => {
        const handleExportUsers = () => {
          const headers = ["Full Name", "Email", "Phone", "Department", "Roles", "Status"];
          const rows = filteredUsers.map((u: any) => [
            `"${(u.full_name || "").replace(/"/g, '""')}"`,
            `"${(u.email || "").replace(/"/g, '""')}"`,
            `"${(u.phone_number || "").replace(/"/g, '""')}"`,
            `"${(u.regionalStructure?.name || "Bureau Wide").replace(/"/g, '""')}"`,
            `"${(u.roles?.map((r: any) => r.name).join(", ") || "No role").replace(/"/g, '""')}"`,
            u.is_active ? "Active" : "Inactive",
          ]);
          const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${region.code}-users-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          actionFeedback.success("Regional users list exported successfully.");
        };

        const userColumns: ColumnDef<any>[] = [
          {
            accessorKey: "full_name",
            header: "User",
            cell: ({ row }) => {
              const u = row.original;
              return (
                <div className="flex items-center gap-3">
                  <UserAvatar name={u.full_name} className="h-9 w-9 shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {u.email}
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            accessorKey: "regional_structure",
            header: "Regional Department",
            cell: ({ row }) => {
              const deptId = row.original.regional_structure_id;
              const dept =
                row.original.regionalStructure ||
                structures.find((s) => s.regional_structure_id === deptId);
              return dept ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  {dept.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">Bureau Wide (Unassigned)</span>
              );
            },
          },
          {
            accessorKey: "roles",
            header: "Assigned Roles",
            cell: ({ row }) => {
              const userRolesList = row.original.roles || [];
              if (userRolesList.length === 0) {
                return <span className="text-xs text-muted-foreground italic">No role</span>;
              }
              return (
                <div className="flex flex-wrap gap-1">
                  {userRolesList.map((r: any) => (
                    <span
                      key={r.role_id}
                      className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            accessorKey: "phone_number",
            header: "Phone",
            cell: ({ row }) => (
              <span className="text-xs text-muted-foreground">
                {row.original.phone_number || "—"}
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
              const u = row.original;
              return (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View User Details"
                    onClick={() => router.push(`/users/list/${u.user_id}`)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canUpdateUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit Regional User"
                      onClick={() => handleOpenUserModal(u)}
                      className="h-8 w-8 text-primary hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canUpdateUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={u.is_active ? "Deactivate User" : "Activate User"}
                      onClick={() => handleToggleUser(u)}
                      className="h-8 w-8"
                    >
                      <Power
                        className={`h-4 w-4 ${
                          u.is_active ? "text-emerald-600" : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                  )}
                  {canUpdateUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reset Password"
                      onClick={() => handleResetUserPassword(u)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            },
          },
        ];

        const userFilters: FilterField[] = [
          {
            key: "status",
            label: "Status",
            type: "multiselect",
            placeholder: "Select status",
            value: userStatusFilter,
            onChange: setUserStatusFilter,
            options: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
          },
          {
            key: "department",
            label: "Department",
            type: "select",
            placeholder: "All Departments",
            value: userDeptFilter,
            onChange: setUserDeptFilter,
            options: [
              { label: "All Departments", value: "" },
              { label: "Bureau Wide (Unassigned)", value: "__unassigned__" },
              ...structures.map((s) => ({
                label: s.name,
                value: s.regional_structure_id,
              })),
            ],
          },
        ];

        const userActions: ActionButton[] = [
          {
            label: "Export",
            icon: <Download className="h-4 w-4" />,
            variant: "outline",
            onClick: handleExportUsers,
          },
          ...(canAddUser
            ? [
                {
                  label: "Create Regional Account",
                  icon: <Plus className="h-4 w-4" />,
                  variant: "default" as const,
                  onClick: () => handleOpenUserModal(),
                },
              ]
            : []),
        ];

        const filteredUsers = users.filter((u: any) => {
          const matchesStatus = matchesActiveInactiveFilter(userStatusFilter, u.is_active);
          const matchesDept =
            !userDeptFilter ||
            (userDeptFilter === "__unassigned__" ? !u.regional_structure_id : u.regional_structure_id === userDeptFilter);
          const matchesSearch =
            !searchQuery ||
            (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.phone_number && u.phone_number.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesStatus && matchesDept && matchesSearch;
        });

        return (
          <div className="space-y-4">
            <TableLayout
              title="Regional User Accounts"
              description={`Staff user accounts strictly isolated to ${region.name}.`}
              actions={userActions}
              sideActions={sideActionTabs}
              filters={userFilters}
              filterColumnsPerRow={2}
              showSearch={true}
            >
              <DataTable
                columns={userColumns}
                data={filteredUsers}
                isLoading={isUsersLoading}
                resetKey={`${searchQuery}-${userStatusFilter}-${userDeptFilter}`}
              />
            </TableLayout>
          </div>
        );
      })()}

      {/* ===================== TAB 3: REGIONAL ROLES ===================== */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <RegionalRoleList sideActions={sideActionTabs} />
        </div>
      )}

      {/* ===================== TAB 4: REGIONAL PERMISSIONS (UI MATCHING COMMON PERMISSIONS PAGE) ===================== */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          {/* Informational Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-900/50 p-4 text-xs text-indigo-900 dark:text-indigo-200">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <p className="font-semibold text-indigo-950 dark:text-indigo-100">
                Regional Operational Permissions
              </p>
              <p className="mt-0.5 text-indigo-800/90 dark:text-indigo-300/80">
                These permissions control authority strictly inside regional domains, including
                regional dashboards, regional departments, staff account administration, and
                custom regional branding. Decoupled and strictly isolated from federal permissions.
              </p>
            </div>
          </div>

          {/* Statistics matching common permissions list page */}
          <StatsComponent stats={regionalStats} />

          {/* Permissions Accordion / Grid matching common permissions list page */}
          <div className="w-full bg-white dark:bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                    Regional Permissions Catalog
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {regionalPermissions.length} total permissions • {regionalStats.active} active •{" "}
                    {regionalStats.inactive} inactive
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {sideActionTabs.map((action, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={action.variant || "default"}
                      size={action.size || "default"}
                      onClick={action.onClick}
                      disabled={action.disabled || action.loading}
                      className="flex items-center space-x-2"
                    >
                      {action.icon && <span className="h-4 w-4">{action.icon}</span>}
                      <span>{action.label}</span>
                    </Button>
                  ))}
                </div>
                <div className="relative w-full lg:w-auto">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search regional permissions..."
                    value={permSearchQuery}
                    onChange={(e) => setPermSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-lg border border-input py-2 pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary lg:w-72"
                  />
                </div>
              </div>
            </div>
            <div className="p-6">
              {isPermissionsLoading ? (
                <PermissionSkeleton />
              ) : filteredRegionalResourceGroups.length === 0 ? (
                <EmptyState
                  title="No permissions found"
                  description={
                    permSearchQuery
                      ? "Try adjusting your search criteria."
                      : "No regional permissions have been configured yet."
                  }
                  action={
                    permSearchQuery && (
                      <Button
                        variant="outline"
                        onClick={() => setPermSearchQuery("")}
                      >
                        Clear search
                      </Button>
                    )
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {filteredRegionalResourceGroups.map((group) => (
                    <ResourceGroupComponent
                      key={group.resource}
                      group={group}
                      onToggle={handleTogglePermission}
                      isToggling={isTogglingPermission}
                      onToggleExpand={toggleResourceExpand}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 5: UI CONFIGURATION & BRANDING ===================== */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-6 rounded-lg border shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Regional UI & System Branding
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure custom branding, official regional authority logo, and theme colors for {region.name}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {sideActionTabs.map((action, index) => (
                <Button
                  key={index}
                  type="button"
                  variant={action.variant || "default"}
                  size={action.size || "default"}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className="flex items-center space-x-2"
                >
                  {action.icon && <span className="h-4 w-4">{action.icon}</span>}
                  <span>{action.label}</span>
                </Button>
              ))}
            </div>
          </div>

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

      {/* ===================== USER CREATE / EDIT MODAL ===================== */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser
                ? `Edit Regional Account: ${editingUser.full_name}`
                : `Create Regional Account for ${region.name}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUser} className="space-y-4 py-2">
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
                    {"— ".repeat((s.level || 1) - 1)} {s.name} (Level {s.level})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Confined strictly to departments within {region.name}.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  Assignable Regional Roles
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {selectedRoleIds.length} role(s) selected
                </span>
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-md border p-2.5 bg-muted/20">
                {roles.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No regional roles configured</div>
                ) : (
                  roles.map((r: any) => (
                    <label
                      key={r.role_id}
                      className="flex items-center gap-2.5 text-xs cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(r.role_id)}
                        onChange={() => {
                          setSelectedRoleIds((prev) =>
                            prev.includes(r.role_id)
                              ? prev.filter((id) => id !== r.role_id)
                              : [...prev, r.role_id]
                          );
                        }}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      <span className="font-semibold text-foreground">{r.name}</span>
                      {r.description && (
                        <span className="text-muted-foreground text-[11px] truncate">
                          — {r.description}
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Attached Regional Permissions Preview */}
            {selectedRoleIds.length > 0 && (
              <div className="space-y-2 rounded-lg border border-indigo-200/80 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Attached Regional Permissions ({attachedPermissions.length})
                  </span>
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">
                    Granted via selected regional role(s)
                  </span>
                </div>
                {attachedPermissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No permissions attached to selected role(s).</p>
                ) : (
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-1">
                    {attachedPermissions.map((p) => (
                      <span
                        key={`${p.resource}:${p.action}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                      >
                        <span className="font-semibold">{p.resource}</span>:
                        <span>{p.action}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingUser || isUpdatingUser}>
                {isCreatingUser || isUpdatingUser
                  ? "Saving..."
                  : editingUser
                  ? "Update Account"
                  : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
