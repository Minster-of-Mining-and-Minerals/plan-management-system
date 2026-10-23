import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
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
  RotateCcw,
  Paintbrush,
  Store,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PermissionStats as StatsComponent } from "@/features/template/component/permissionList/Stats";
import { ResourceGroup as ResourceGroupComponent } from "@/features/template/component/permissionList/ResourceGroup";
import type { Permission } from "@/features/template/types/permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

type TabType = "overview" | "users" | "roles" | "permissions" | "branding";

export function PurchasingCenterDetail({ centerId }: { centerId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabType | null;

  const [activeTab, setActiveTabState] = useState<TabType>(
    tabParam && ["overview", "users", "roles", "permissions", "branding"].includes(tabParam)
      ? tabParam
      : "overview"
  );

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/admin/purchasing-centers/${centerId}?${params.toString()}`);
  };

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canManageCenter = can("PURCHASING_CENTERS:MANAGE") || isSuperAdmin;
  const canManageUsers = can("PURCHASING_CENTER_USERS:MANAGE") || canManageCenter;
  const canManageBranding = can("PURCHASING_CENTER_BRANDING:MANAGE") || canManageCenter;

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
  const [userStatusFilter] = useState<string>("");

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
      const errorMsg = (err as { data?: { message?: string }; message?: string })?.data?.message || (err as Error)?.message || "Failed to save user account.";
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

  // User columns - Direct membership, zero departments!
  const userColumns: ColumnDef<User>[] = [
    {
      id: "avatar",
      header: "",
      cell: ({ row }) => (
        <UserAvatar
          name={row.original.full_name}
          profileImage={row.original.profile_image}
        />
      ),
    },
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-foreground">{row.original.full_name}</span>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "roles",
      header: "Assigned Roles",
      cell: ({ row }) => {
        const uRoles = row.original.roles || [];
        return (
          <div className="flex flex-wrap gap-1">
            {uRoles.length > 0 ? (
              uRoles.map((r: Role) => (
                <span
                  key={r.role_id}
                  className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium"
                >
                  {r.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No roles</span>
            )}
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
      header: "Actions",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-1">
            {canManageUsers && (
              <>
                <Button
                  onClick={() => handleOpenUserModal(u)}
                  variant="ghost"
                  size="icon"
                  title="Edit Account"
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleToggleUser(u)}
                  variant="ghost"
                  size="icon"
                  title={u.is_active ? "Deactivate User" : "Activate User"}
                  className="h-8 w-8"
                >
                  {u.is_active ? (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </Button>
                <Button
                  onClick={() => handleResetUserPassword(u)}
                  variant="ghost"
                  size="icon"
                  title="Reset Password"
                  className="h-8 w-8 text-blue-600"
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

  const filteredUsers = useMemo(() => {
    return users.filter((u) => matchesActiveInactiveFilter(userStatusFilter, u.is_active));
  }, [users, userStatusFilter]);

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
        <h2 className="text-xl font-bold">Purchasing Center Not Found</h2>
        <p className="text-muted-foreground text-sm">
          The requested purchasing center could not be loaded or verified.
        </p>
        <Button onClick={() => router.push("/admin/purchasing-centers")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchasing Centers
        </Button>
      </div>
    );
  }

  const logoUrl = center.logo_path ? getFileUrl(center.logo_path) : null;
  const activeUsersCount = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/admin/purchasing-centers")}
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="relative h-12 w-12 rounded-xl border border-primary/20 bg-muted/40 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={center.name}
                width={40}
                height={40}
                className="max-h-10 w-auto object-contain"
                unoptimized
              />
            ) : (
              <Store className="h-6 w-6 text-primary" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{center.name}</h1>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                {center.code}
              </span>
              <ActiveStatusBadge isActive={center.is_active} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Purchasing Center ID: <span className="font-mono">{center.purchasing_center_id}</span> • Registered on{" "}
              {new Date(center.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action to preview independent workspace */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/purchasing-centers/${center.purchasing_center_id}`)}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Eye className="h-4 w-4" />
            View Center Workspace
          </Button>
        </div>
      </div>

      {/* Domain Navigation Tabs - Strictly NO departments tab! */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Info className="h-4 w-4" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4" />
            Accounts ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("roles")}
            className={cn(
              "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === "roles"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Shield className="h-4 w-4" />
            Roles
          </button>

          <button
            onClick={() => setActiveTab("permissions")}
            className={cn(
              "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === "permissions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <KeyRound className="h-4 w-4" />
            Permissions ({centerPermissions.length})
          </button>

          <button
            onClick={() => setActiveTab("branding")}
            className={cn(
              "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === "branding"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Paintbrush className="h-4 w-4" />
            Branding & Settings
          </button>
        </nav>
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Total Accounts
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">{users.length}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Active Accounts
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-emerald-600">{activeUsersCount}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Center Status
                    </p>
                    <h3 className="text-lg font-bold mt-1 text-foreground">
                      {center.is_active ? "Operational" : "Deactivated"}
                    </h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Store className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Custom Branding
                    </p>
                    <h3 className="text-lg font-bold mt-1 text-foreground">
                      {brandingData ? "Configured" : "Default"}
                    </h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 flex items-center justify-center">
                    <Palette className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details & Architecture Invariant Notice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Center Profile & Identification</CardTitle>
                <CardDescription>
                  Identity specifications used across procurement and reporting domains.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Official Name</span>
                  <span className="font-medium text-foreground">{center.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Center Code</span>
                  <span className="font-mono font-bold text-primary">{center.code}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Operational Status</span>
                  <ActiveStatusBadge isActive={center.is_active} />
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium text-foreground max-w-xs text-right">
                    {center.description || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Registration Timestamp</span>
                  <span className="text-foreground">{new Date(center.created_at).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardHeader>
                <CardTitle className="text-base text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                  Direct Membership Model (No Departments)
                </CardTitle>
                <CardDescription>
                  Purchasing Center Domain Architecture Rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  • Purchasing centers operate on a flat organizational structure:{" "}
                  <strong className="text-foreground">Purchasing Center → Users</strong>.
                </p>
                <p>
                  • Accounts belong directly to this center without intermediate departments or hierarchies.
                </p>
                <p>
                  • Strict database and authorization constraints ensure purchasing center accounts never cross domain boundaries or receive external assignments.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => setActiveTab("users")}
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50"
                  >
                    Manage Center Accounts ({users.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. USERS (DIRECT MEMBERSHIP, ZERO DEPARTMENTS) */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold">Purchasing Center User Accounts</h2>
              <p className="text-xs text-muted-foreground">
                Authorized staff accounts assigned directly to this purchasing center.
              </p>
            </div>
            {canManageUsers && (
              <Button onClick={() => handleOpenUserModal()} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add Account
              </Button>
            )}
          </div>

          <DataTable
            columns={userColumns}
            data={filteredUsers}
            isLoading={isUsersLoading}
          />
        </div>
      )}

      {/* TAB CONTENT: 3. ROLES */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <PurchasingCenterRoleList
            purchasingCenterId={centerId}
            basePath={`/admin/purchasing-centers/${centerId}`}
          />
        </div>
      )}

      {/* TAB CONTENT: 4. PERMISSIONS */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Purchasing Center Permissions Catalog</h2>
              <p className="text-xs text-muted-foreground">
                Independent authorization capabilities scoped strictly to the purchasing center domain.
              </p>
            </div>
          </div>

          <StatsComponent stats={permissionStats} />

          <div className="space-y-4">
            {resourceGroups.map((group) => (
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
                onToggleExpand={toggleResourceExpand}
                onToggle={handleTogglePermission}
                isToggling={isTogglingPermission}
              />
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. BRANDING & SETTINGS */}
      {activeTab === "branding" && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Purchasing Center Branding & Settings</CardTitle>
            <CardDescription>
              Customize system names, colors, and official logos for this center&apos;s independent workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveBranding} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Full System Name</label>
                  <Input
                    value={systemFullName}
                    onChange={(e) => setSystemFullName(e.target.value)}
                    placeholder={center.name}
                  />
                  <span className="text-xs text-muted-foreground">Displayed on login and workspace headers.</span>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Short Name / Code</label>
                  <Input
                    value={systemShortName}
                    onChange={(e) => setSystemShortName(e.target.value)}
                    placeholder={center.code}
                  />
                  <span className="text-xs text-muted-foreground">Used in badges and compact layouts.</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Tagline / Motto</label>
                <Input
                  value={systemTagline}
                  onChange={(e) => setSystemTagline(e.target.value)}
                  placeholder="Official tagline for this purchasing center"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-12 rounded border cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-12 rounded border cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-12 rounded border cursor-pointer"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <LogoUploadField
                  label="Official Center Logo / Emblem"
                  value={logoPrimaryPath || ""}
                  onChange={(val) => setLogoPrimaryPath(val || "")}
                />
              </div>

              {canManageBranding && (
                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isUpdatingBranding} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isUpdatingBranding ? "Saving..." : "Save Branding Settings"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Direct User Create / Edit Dialog - STRICTLY NO DEPARTMENT SELECTOR! */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit Purchasing Center Account" : "Add Purchasing Center Account"}
            </DialogTitle>
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
                          className="rounded border-gray-300"
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
