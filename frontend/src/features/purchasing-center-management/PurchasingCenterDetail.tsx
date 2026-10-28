"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Users,
  Palette,
  Plus,
  Edit,
  Save,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  KeyRound,
  Shield,
  Eye,
  Power,
  RotateCcw,
  Mail,
  Search,
  Download,
  ShieldCheck,
  Info,
} from "lucide-react";
import { PermissionStats as StatsComponent } from "@/features/template/component/permissionList/Stats";
import { ResourceGroup as ResourceGroupComponent } from "@/features/template/component/permissionList/ResourceGroup";
import { EmptyState } from "@/features/template/component/permissionList/EmptyState";
import { PermissionSkeleton } from "@/features/template/component/permissionList/Skeleton";
import type { Permission } from "@/features/template/types/permission";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useGetPurchasingCenterByIdQuery,
  useGetPurchasingCenterBrandingQuery,
  useUpdatePurchasingCenterBrandingMutation,
  useGetPurchasingCenterRolesQuery,
} from "@/redux/api/purchasingCenterApi";
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
import PurchasingCenterRoleList from "@/features/template/component/roleList/PurchasingCenterRoleList";
import { actionFeedback } from "@/components/action-feedback";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { UserAvatar } from "@/components/common/UserAvatar";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/utils/fileUrl";
import { cn } from "@/lib/utils";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";
import type { User, Role } from "@/redux/types/user";
import type { FilterField, ActionButton } from "@/types/tableLayout";

type TabType = "users" | "roles" | "permissions" | "branding";

export function PurchasingCenterDetail({ centerId }: { centerId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const tabParam = searchParams.get("tab") as TabType | null;

  const [activeTab, setActiveTabState] = useState<TabType>(
    tabParam && ["users", "roles", "permissions", "branding"].includes(tabParam)
      ? tabParam
      : "users"
  );

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [userStatusFilter, setUserStatusFilter] = useState<string>("");
  const [permSearchQuery, setPermSearchQuery] = useState<string>("");

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canManageCenter = can("PURCHASING_CENTERS:MANAGE") || isSuperAdmin;
  const canAddUser = can("PURCHASING_CENTER_USERS:CREATE") || can("PURCHASING_CENTER_USERS:MANAGE") || canManageCenter;
  const canUpdateUser = can("PURCHASING_CENTER_USERS:UPDATE") || can("PURCHASING_CENTER_USERS:MANAGE") || canManageCenter;
  const canViewBranding = can("PURCHASING_CENTER_BRANDING:READ") || can("PURCHASING_CENTER_BRANDING:UPDATE") || canManageCenter;
  const canUpdateBranding = can("PURCHASING_CENTER_BRANDING:UPDATE") || can("PURCHASING_CENTER_BRANDING:MANAGE") || canManageCenter;

  // 1. Fetch Purchasing Center Data
  const {
    data: center,
    isLoading: isCenterLoading,
    isError: isCenterError,
    refetch: refetchCenter,
  } = useGetPurchasingCenterByIdQuery(centerId);

  // 2. Fetch Center Users
  const {
    data: users = [],
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useGetUsersQuery({ purchasing_center_id: centerId });

  // 3. Fetch Center Branding
  const {
    data: brandingData,
    refetch: refetchBranding,
  } = useGetPurchasingCenterBrandingQuery(centerId);

  // 4. Fetch Center Scoped Permissions
  const {
    data: allPermissionsData = [],
    isLoading: isPermissionsLoading,
    refetch: refetchPermissions,
  } = useGetPermissionsQuery({ scope: "purchasing_center" });

  // 5. Fetch Center Roles
  const { data: roles = [] } = useGetPurchasingCenterRolesQuery();

  // Mutations
  const [updateBranding, { isLoading: isUpdatingBranding }] = useUpdatePurchasingCenterBrandingMutation();
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [toggleUserStatus] = useToggleUserStatusMutation();
  const [resetPassword] = useResetUserPasswordMutation();
  const [togglePermissionMutation, { isLoading: isTogglingPermission }] = useTogglePermissionMutation();

  // User Modal State (Create & Edit) - Strictly NO department fields!
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
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

  if (brandingData && !brandingInitialized) {
    setSystemFullName(brandingData.system_name_full || "");
    setSystemShortName(brandingData.system_name_short || "");
    setSystemTagline(brandingData.system_tagline || "");
    setPrimaryColor(brandingData.primary_color || "#0C4A6E");
    setSecondaryColor(brandingData.secondary_color || "#64748B");
    setAccentColor(brandingData.accent_color || "#CA8A04");
    setLogoPrimaryPath(brandingData.logo_primary_path || center?.logo_path || null);
    setBrandingInitialized(true);
  }

  // Filter ONLY purchasing center permissions
  const isPurchasingCenterResource = (resource: string) => {
    const r = (resource || "").toLowerCase();
    return r.startsWith("purchasing_center") || r === "purchasing_centers";
  };

  const centerPermissions = useMemo(() => {
    const rawList = Array.isArray(allPermissionsData) ? allPermissionsData : [];
    return rawList.filter((p: Permission) => isPurchasingCenterResource(p.resource));
  }, [allPermissionsData]);

  // Permissions UI Helpers
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
      } catch (err: unknown) {
        const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to toggle permission.";
        actionFeedback.error(errorMsg);
      }
    },
    [togglePermissionMutation, refetchPermissions]
  );

  const permissionStats = useMemo(
    () => ({
      total: centerPermissions.length,
      active: centerPermissions.filter((p: Permission) => p.is_active).length,
      inactive: centerPermissions.filter((p: Permission) => !p.is_active).length,
    }),
    [centerPermissions]
  );

  // Group permissions by resource
  const resourceGroups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of centerPermissions) {
      const list = map.get(p.resource) || [];
      list.push(p);
      map.set(p.resource, list);
    }
    return Array.from(map.entries()).map(([resource, perms]) => ({
      resource,
      permissions: perms,
      activeCount: perms.filter((p) => p.is_active).length,
    }));
  }, [centerPermissions]);

  const filteredResourceGroups = useMemo(() => {
    if (!permSearchQuery.trim()) return resourceGroups;
    const q = permSearchQuery.toLowerCase();
    return resourceGroups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p: Permission) =>
            p.action.toLowerCase().includes(q) ||
            p.resource.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [resourceGroups, permSearchQuery]);

  // User handlers (Create & Edit) - Direct purchasing center membership, NO departments!
  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserName(user.full_name || "");
      setUserEmail(user.email || "");
      setUserPhone(user.phone_number || "");
      const validRoleIds = new Set(roles.map((r: Role) => r.role_id));
      const rawRoleIds = user.roles?.map((r: Role) => r.role_id) || [];
      const roleIds = validRoleIds.size > 0
        ? rawRoleIds.filter((id: string) => validRoleIds.has(id))
        : rawRoleIds;
      setSelectedRoleIds(roleIds);
    } else {
      setEditingUser(null);
      setUserName("");
      setUserEmail("");
      setUserPhone("");
      // Preselect Purchasing Center Administrator role by default
      const defaultAdmin = roles.find(
        (r: Role) =>
          r.role_id === "40000000-0000-4000-8000-000000000001" ||
          r.name.toLowerCase().includes("admin")
      );
      setSelectedRoleIds(defaultAdmin ? [defaultAdmin.role_id] : []);
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
            purchasing_center_id: centerId,
            role_ids: selectedRoleIds,
          },
        }).unwrap();
        actionFeedback.success(`Purchasing center account '${userName}' updated successfully.`);
      } else {
        await createUser({
          full_name: userName.trim(),
          email: userEmail.trim().toLowerCase(),
          phone_number: userPhone.trim() || undefined,
          purchasing_center_id: centerId,
          role_ids: selectedRoleIds,
        }).unwrap();
        actionFeedback.success(`Purchasing center account created for ${userName}.`);
      }
      setIsUserModalOpen(false);
      refetchUsers();
    } catch (err: unknown) {
      const errorMsg =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as Error)?.message ||
        "Failed to save user account.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleToggleUser = async (user: User) => {
    try {
      await toggleUserStatus({
        id: user.user_id,
        data: { is_active: !user.is_active },
      }).unwrap();
      actionFeedback.success(`User '${user.full_name}' status updated.`);
      refetchUsers();
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to update user status.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleResetUserPassword = async (user: User) => {
    if (!confirm(`Reset password for ${user.full_name}?`)) return;
    try {
      await resetPassword(user.user_id).unwrap();
      actionFeedback.success(`Password reset temporary password sent to ${user.email}.`);
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to reset password.";
      actionFeedback.error(errorMsg);
    }
  };

  // Branding handler
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBranding({
        purchasing_center_id: centerId,
        data: {
          system_name_full: systemFullName.trim() || center?.name,
          system_name_short: systemShortName.trim() || center?.code,
          system_tagline: systemTagline.trim() || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          logo_primary_path: logoPrimaryPath || null,
        },
      }).unwrap();
      actionFeedback.success("Purchasing center branding updated successfully.");
      refetchBranding();
      refetchCenter();
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to update branding.";
      actionFeedback.error(errorMsg);
    }
  };

  if (isCenterLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isCenterError || !center) {
    return (
      <div className="p-8 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-destructive">Purchasing Center Not Found</h2>
        <p className="text-muted-foreground text-sm">
          The requested mineral purchasing center could not be loaded or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/admin/purchasing-centers">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchasing Centers
          </Link>
        </Button>
      </div>
    );
  }

  const effectiveLogoUrl = (logoPrimaryPath || center.logo_path)
    ? getFileUrl(logoPrimaryPath || center.logo_path || "")
    : null;

  // Tabular Tab Actions matching Regional Management pattern exactly
  const sideActionTabs: ActionButton[] = [
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
      {/* ===================== HEADER (MATCHING REGIONAL DETAIL EXACTLY) ===================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-4">
          {effectiveLogoUrl ? (
            <div className="relative h-16 w-16 rounded-full border-2 border-primary/20 bg-muted/40 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <Image
                src={effectiveLogoUrl}
                alt={center.name}
                width={60}
                height={60}
                className="max-h-14 w-auto object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}

          <div className="space-y-1">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Link
                href="/admin/purchasing-centers"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Purchasing Centers
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-foreground font-medium">{center.name}</span>
            </nav>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{center.name}</h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                {center.code}
              </span>
              <ActiveStatusBadge isActive={center.is_active} />
            </div>

            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Mineral Purchasing Center Registry • Independent Administrative Domain
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href="/admin/purchasing-centers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              All Purchasing Centers
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/purchasing-centers/${center.purchasing_center_id}`)}
            className="flex items-center gap-2 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Eye className="h-4 w-4" />
            View Center Workspace
          </Button>
        </div>
      </div>

      {/* ===================== TAB 1: USERS (MATCHING REGIONAL USERS EXACTLY, STRICTLY NO DEPT) ===================== */}
      {activeTab === "users" && (() => {
        const handleExportUsers = () => {
          const headers = ["Full Name", "Email", "Phone", "Assigned Roles", "Status"];
          const rows = filteredUsers.map((u: User) => [
            `"${(u.full_name || "").replace(/"/g, '""')}"`,
            `"${(u.email || "").replace(/"/g, '""')}"`,
            `"${(u.phone_number || "").replace(/"/g, '""')}"`,
            `"${(u.roles?.map((r: Role) => r.name).join(", ") || "No role").replace(/"/g, '""')}"`,
            u.is_active ? "Active" : "Inactive",
          ]);
          const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${center.code}-users-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          actionFeedback.success("Purchasing center accounts list exported successfully.");
        };

        const userColumns: ColumnDef<User>[] = [
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
            accessorKey: "roles",
            header: "Assigned Roles",
            cell: ({ row }) => {
              const userRolesList = row.original.roles || [];
              if (userRolesList.length === 0) {
                return <span className="text-xs text-muted-foreground italic">No role</span>;
              }
              return (
                <div className="flex flex-wrap gap-1">
                  {userRolesList.map((r: Role) => (
                    <span
                      key={r.role_id}
                      className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
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
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit Purchasing Center User"
                        onClick={() => handleOpenUserModal(u)}
                        className="h-8 w-8 text-primary hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reset Password"
                        onClick={() => handleResetUserPassword(u)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </>
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
                  label: "Create Center Account",
                  icon: <Plus className="h-4 w-4" />,
                  variant: "default" as const,
                  onClick: () => handleOpenUserModal(),
                },
              ]
            : []),
        ];

        const filteredUsers = users.filter((u: User) => {
          const matchesStatus = matchesActiveInactiveFilter(userStatusFilter, u.is_active);
          const matchesSearch =
            !searchQuery ||
            (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.phone_number && u.phone_number.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesStatus && matchesSearch;
        });

        return (
          <div className="space-y-4">
            <TableLayout
              title="Purchasing Center Staff Accounts"
              description={`Authorized staff user accounts assigned directly to ${center.name} without department hierarchy.`}
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
                resetKey={`${searchQuery}-${userStatusFilter}`}
              />
            </TableLayout>
          </div>
        );
      })()}

      {/* ===================== TAB 2: ROLES ===================== */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <PurchasingCenterRoleList
            sideActions={sideActionTabs}
            purchasingCenterId={centerId}
            basePath={`/admin/purchasing-centers/${centerId}`}
          />
        </div>
      )}

      {/* ===================== TAB 3: PERMISSIONS (MATCHING REGIONAL PERMISSIONS EXACTLY) ===================== */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          {/* Informational Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-900/50 p-4 text-xs text-indigo-900 dark:text-indigo-200">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <p className="font-semibold text-indigo-950 dark:text-indigo-100">
                Purchasing Center Operational Permissions
              </p>
              <p className="mt-0.5 text-indigo-800/90 dark:text-indigo-300/80">
                These permissions control authority strictly inside mineral purchasing centers, including
                purchasing center dashboards, staff account administration, center roles, and
                custom branding. Decoupled and strictly isolated from regional and federal departments.
              </p>
            </div>
          </div>

          {/* Statistics matching common permissions list page */}
          <StatsComponent stats={permissionStats} />

          {/* Permissions Accordion / Grid matching regional permissions list */}
          <div className="w-full bg-white dark:bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    Purchasing Center Permissions Catalog
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {centerPermissions.length} total permissions • {permissionStats.active} active •{" "}
                    {permissionStats.inactive} inactive
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
                    placeholder="Search center permissions..."
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
              ) : filteredResourceGroups.length === 0 ? (
                <EmptyState
                  title="No permissions found"
                  description={
                    permSearchQuery
                      ? "Try adjusting your search criteria."
                      : "No purchasing center permissions configured."
                  }
                  action={
                    permSearchQuery ? (
                      <Button variant="outline" onClick={() => setPermSearchQuery("")}>
                        Clear search
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {filteredResourceGroups.map((group) => (
                    <ResourceGroupComponent
                      key={group.resource}
                      group={{
                        resource: group.resource,
                        icon: <Shield className="h-4 w-4" />,
                        permissions: group.permissions,
                        isExpanded: expandedResource === group.resource,
                        activeCount: group.activeCount,
                        totalCount: group.permissions.length,
                      }}
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

      {/* ===================== TAB 4: UI CONFIGURATION & BRANDING (MATCHING REGIONAL UI EXACTLY) ===================== */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-6 rounded-lg border shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Purchasing Center UI & System Branding
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure custom branding, official center logo, and theme colors for {center.name}.
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
                You do not have permission to view or configure purchasing center branding settings.
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
                      Configure custom branding, official center emblem/logo, and theme colors for {center.name}.
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
                            placeholder="e.g. Shakiso Gold Purchasing Center PMS"
                            disabled={!canUpdateBranding}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Short Name / Initials</label>
                          <Input
                            value={systemShortName}
                            onChange={(e) => setSystemShortName(e.target.value)}
                            placeholder="e.g. PC-SHAKISO"
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
                          placeholder="e.g. Mineral Procurement & Inventory Management"
                          disabled={!canUpdateBranding}
                        />
                      </div>

                      {/* File Upload for Purchasing Center Logo */}
                      <div className="space-y-1.5">
                        <LogoUploadField
                          label="Official Purchasing Center Logo"
                          value={logoPrimaryPath || ""}
                          onChange={(val) => setLogoPrimaryPath(val || null)}
                          disabled={!canUpdateBranding}
                          successMessage="Center logo uploaded successfully"
                          errorMessage="Failed to upload center logo"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Upload PNG, JPG, WEBP, or SVG emblem for {center.name}. This logo represents the purchasing center across headers and procurement documents.
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
                          <Building2 className="h-5 w-5 shrink-0 opacity-80" />
                        )}
                        <span className="font-bold text-sm truncate">{systemShortName || center.code}</span>
                      </div>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono shrink-0">
                        Active
                      </span>
                    </div>

                    {/* Simulated Card Preview */}
                    <div className="border rounded-md p-3 space-y-2 bg-card">
                      <div className="h-2 w-16 rounded" style={{ backgroundColor: secondaryColor }} />
                      <div className="h-3 w-3/4 rounded bg-muted" />
                      <div className="h-2 w-1/2 rounded bg-muted/60" />
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          style={{ backgroundColor: accentColor }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white rounded shadow-xs"
                        >
                          Accent Button
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= USER MODAL (DIRECT PURCHASING CENTER MEMBERSHIP, NO DEPARTMENTS!) ================= */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit Purchasing Center Account" : "Add Purchasing Center Account"}
            </DialogTitle>
            <DialogDescription>
              {center.name} • Directly assigned staff account without departments.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Almaz Bekele"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="e.g. almaz@purchasing.mom.et"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number</label>
              <Input
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="+251 91 123 4567"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Assigned Center Roles</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
                {roles.length > 0 ? (
                  roles.map((role: Role) => {
                    const isChecked = selectedRoleIds.includes(role.role_id);
                    return (
                      <label
                        key={role.role_id}
                        className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoleIds([...selectedRoleIds, role.role_id]);
                            } else {
                              setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.role_id));
                            }
                          }}
                          className="rounded border-gray-300 h-4 w-4"
                        />
                        <span className="font-medium text-foreground">{role.name}</span>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground p-1">No roles available for this center.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-emerald-50/60 border border-emerald-200/80 p-3 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Department-Free Invariant Verified
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Purchasing centers operate on a flat organizational structure. Accounts belong directly to this center without department hierarchy.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
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
