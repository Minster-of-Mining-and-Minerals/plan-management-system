"use strict";
"use client";

import { useMemo, useState } from "react";
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
  ShieldCheck,
  Shield,
  RotateCcw,
  Mail,
  Search,
  ExternalLink,
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useGetPurchasingCentersQuery,
  useCreatePurchasingCenterMutation,
  useUpdatePurchasingCenterMutation,
  useTogglePurchasingCenterStatusMutation,
  useDeletePurchasingCenterMutation,
  useGetPurchasingCenterRolesQuery,
} from "@/redux/api/purchasingCenterApi";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useResetUserPasswordMutation,
} from "@/redux/api/userApi";
import { actionFeedback } from "@/components/action-feedback";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { UserAvatar } from "@/components/common/UserAvatar";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/utils/fileUrl";
import type { PurchasingCenter } from "@/redux/types/purchasingCenter";
import type { User, Role } from "@/redux/types/user";
import type { FilterField, ActionButton } from "@/types/tableLayout";

export function PurchasingCenterList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<PurchasingCenter | null>(null);

  // Form states for Purchasing Center
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [logoPath, setLogoPath] = useState("");

  // Initial Administrator Account states (during registration)
  const [createAdminAccount, setCreateAdminAccount] = useState(true);
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhoneNumber, setAdminPhoneNumber] = useState("");

  // User Management Dialog states (for managing users of a specific center)
  const [managingUsersCenter, setManagingUsersCenter] = useState<PurchasingCenter | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFullName, setUserFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhoneNumber, setUserPhoneNumber] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const { can } = usePermissions();
  const { roles: authRoles } = useAuth();
  const isSuperAdmin = authRoles?.some((r) => String(r).toLowerCase() === "super admin");
  const canCreate = can("PURCHASING_CENTERS:CREATE") || can("PURCHASING_CENTERS:MANAGE") || isSuperAdmin;
  const canUpdate = can("PURCHASING_CENTERS:UPDATE") || can("PURCHASING_CENTERS:MANAGE") || isSuperAdmin;
  const canDelete = can("PURCHASING_CENTERS:DEACTIVATE") || can("PURCHASING_CENTERS:MANAGE") || isSuperAdmin;
  const canManageUsers =
    can("PURCHASING_CENTER_USERS:MANAGE") ||
    can("PURCHASING_CENTERS:MANAGE") ||
    isSuperAdmin;

  // Center queries and mutations
  const { data: centers = [], isLoading, refetch } = useGetPurchasingCentersQuery({
    search: searchQuery || undefined,
  });
  const [createCenter, { isLoading: isCreating }] = useCreatePurchasingCenterMutation();
  const [updateCenter, { isLoading: isUpdating }] = useUpdatePurchasingCenterMutation();
  const [toggleStatus] = useTogglePurchasingCenterStatusMutation();
  const [deleteCenter] = useDeletePurchasingCenterMutation();

  // User queries and mutations for the currently selected center
  const {
    data: centerUsers = [],
    isLoading: isUsersLoading,
    refetch: refetchCenterUsers,
  } = useGetUsersQuery(
    { purchasing_center_id: managingUsersCenter?.purchasing_center_id || "" },
    { skip: !managingUsersCenter }
  );

  const { data: availableRoles = [] } = useGetPurchasingCenterRolesQuery();

  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [toggleUserStatus] = useToggleUserStatusMutation();
  const [resetUserPassword] = useResetUserPasswordMutation();

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setLogoPath("");
    setCreateAdminAccount(true);
    setAdminFullName("");
    setAdminEmail("");
    setAdminPhoneNumber("");
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

    if (!editingCenter && createAdminAccount) {
      if (!adminFullName.trim() || !adminEmail.trim()) {
        actionFeedback.error("Administrator name and email are required to create the admin account.");
        return;
      }
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
          ...(createAdminAccount && adminFullName.trim() && adminEmail.trim()
            ? {
                admin_full_name: adminFullName.trim(),
                admin_email: adminEmail.trim().toLowerCase(),
                admin_phone_number: adminPhoneNumber.trim() || undefined,
              }
            : {}),
        }).unwrap();
        actionFeedback.success(
          createAdminAccount && adminFullName.trim()
            ? `Purchasing center '${name}' registered with initial administrator account.`
            : `Purchasing center '${name}' registered successfully.`
        );
      }
      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (err: unknown) {
      const errorMsg =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as Error)?.message ||
        "Failed to save purchasing center.";
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
      const errorMsg =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to update purchasing center status.";
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
      const errorMsg =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to deactivate purchasing center.";
      actionFeedback.error(errorMsg);
    }
  };

  // User Management Handlers (Direct center membership, NO department selector!)
  const openUserManagementModal = (center: PurchasingCenter) => {
    setManagingUsersCenter(center);
    setUserSearchQuery("");
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFullName("");
    setUserEmail("");
    setUserPhoneNumber("");
    // Default to "Purchasing Center Administrator" role if present
    const adminRole = availableRoles.find(
      (r: Role) =>
        r.role_id === "40000000-0000-4000-8000-000000000001" ||
        r.name.toLowerCase().includes("admin")
    );
    setSelectedRoleIds(adminRole ? [adminRole.role_id] : []);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserFullName(user.full_name || "");
    setUserEmail(user.email || "");
    setUserPhoneNumber(user.phone_number || "");
    const rawRoleIds = user.roles?.map((r: Role) => r.role_id) || [];
    setSelectedRoleIds(rawRoleIds);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingUsersCenter) return;

    if (!userFullName.trim() || !userEmail.trim()) {
      actionFeedback.error("Name and email are required.");
      return;
    }

    try {
      if (editingUser) {
        await updateUser({
          id: editingUser.user_id,
          data: {
            full_name: userFullName.trim(),
            email: userEmail.trim().toLowerCase(),
            phone_number: userPhoneNumber.trim() || undefined,
            purchasing_center_id: managingUsersCenter.purchasing_center_id,
            role_ids: selectedRoleIds,
          },
        }).unwrap();
        actionFeedback.success(`Purchasing center account '${userFullName}' updated.`);
      } else {
        await createUser({
          full_name: userFullName.trim(),
          email: userEmail.trim().toLowerCase(),
          phone_number: userPhoneNumber.trim() || undefined,
          purchasing_center_id: managingUsersCenter.purchasing_center_id,
          role_ids: selectedRoleIds,
        }).unwrap();
        actionFeedback.success(`Purchasing center account created for ${userFullName}.`);
      }
      setIsUserModalOpen(false);
      refetchCenterUsers();
      refetch();
    } catch (err: unknown) {
      const errorMsg =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as Error)?.message ||
        "Failed to save user account.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleToggleUserActive = async (user: User) => {
    try {
      await toggleUserStatus({
        id: user.user_id,
        data: { is_active: !user.is_active },
      }).unwrap();
      actionFeedback.success(`User '${user.full_name}' status updated.`);
      refetchCenterUsers();
      refetch();
    } catch (err: unknown) {
      const errorMsg =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to update user status.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset password for ${user.full_name}?`)) return;
    try {
      await resetUserPassword(user.user_id).unwrap();
      actionFeedback.success(`Temporary password sent to ${user.email}.`);
    } catch (err: unknown) {
      const errorMsg =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to reset password.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleExportCenterUsers = () => {
    if (!managingUsersCenter) return;
    const headers = ["Full Name", "Email", "Phone", "Assigned Roles", "Status"];
    const rows = filteredCenterUsers.map((u) => [
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
    a.download = `${managingUsersCenter.code}-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    actionFeedback.success("Purchasing center accounts list exported successfully.");
  };

  const filteredCenterUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return centerUsers;
    const q = userSearchQuery.toLowerCase();
    return centerUsers.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone_number && u.phone_number.includes(q))
    );
  }, [centerUsers, userSearchQuery]);

  const centerUserColumns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: "Account",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <UserAvatar name={u.full_name} className="h-8 w-8 text-xs shrink-0" />
              <div>
                <p className="font-medium text-foreground text-xs">{u.full_name}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {u.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "phone_number",
        header: "Phone",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.phone_number || "—"}</span>
        ),
      },
      {
        id: "roles",
        header: "Assigned Roles",
        cell: ({ row }) => {
          const roles = row.original.roles;
          if (!roles || roles.length === 0) {
            return <span className="text-muted-foreground italic text-[11px]">No role assigned</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((r: Role) => (
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
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const u = row.original;
          if (!canManageUsers) return null;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="Edit User"
                onClick={() => handleOpenEditUser(u)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={u.is_active ? "Deactivate User" : "Activate User"}
                onClick={() => handleToggleUserActive(u)}
                className="h-7 w-7"
              >
                {u.is_active ? (
                  <XCircle className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Reset Temporary Password"
                onClick={() => handleResetPassword(u)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canManageUsers]
  );

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
        <button
          type="button"
          onClick={() => openUserManagementModal(row.original)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer group"
          title="Click to manage staff accounts for this purchasing center"
        >
          <Users className="h-3.5 w-3.5 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-foreground underline decoration-dotted underline-offset-2">
            {row.original.active_users_count || 0}
          </span>
          <span>Accounts</span>
        </button>
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
              onClick={() => openUserManagementModal(center)}
              variant="ghost"
              size="icon"
              title="Manage Center Accounts (No Department)"
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => router.push(`/admin/purchasing-centers/${center.purchasing_center_id}`)}
              variant="ghost"
              size="icon"
              title="View Full Center Overview & Settings"
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
                  title="Edit Center Profile"
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

      {/* ================= REGISTER / EDIT PURCHASING CENTER MODAL ================= */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCenter ? "Edit Purchasing Center" : "Register Purchasing Center"}
            </DialogTitle>
            <DialogDescription>
              {editingCenter
                ? "Update purchasing center identity and branding properties."
                : "Register a mineral purchasing center in the federal registry and optionally create its initial administrator account."}
            </DialogDescription>
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

            {/* INITIAL ADMINISTRATOR ACCOUNT SECTION (FOR NEW REGISTRATION) */}
            {!editingCenter && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3 pt-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Initial Administrator Account
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAdminAccount}
                      onChange={(e) => setCreateAdminAccount(e.target.checked)}
                      className="rounded border-primary/40 text-primary h-4 w-4"
                    />
                    <span>Create Admin Account</span>
                  </label>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically provisions a center administrator account with full operational credentials. Purchasing center accounts belong directly to the center (no departments).
                </p>

                {createAdminAccount && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-medium mb-1 block">
                        Administrator Full Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        placeholder="e.g. Almaz Bekele"
                        required={createAdminAccount}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block">
                        Administrator Email Address <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="e.g. admin.shakiso@pc.mom.et"
                        required={createAdminAccount}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block">
                        Phone Number
                      </label>
                      <Input
                        value={adminPhoneNumber}
                        onChange={(e) => setAdminPhoneNumber(e.target.value)}
                        placeholder="+251 91 123 4567"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className="font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Role: Purchasing Center Administrator
                      </span>
                      <span className="font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        Direct Account • No Department
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

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

      {/* ================= PURCHASING CENTER USER MANAGEMENT MODAL ================= */}
      {managingUsersCenter && (
        <Dialog
          open={Boolean(managingUsersCenter)}
          onOpenChange={(open) => !open && setManagingUsersCenter(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {managingUsersCenter.name}
                    </DialogTitle>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                      {managingUsersCenter.code}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Purchasing center accounts belong directly to this purchasing center without department hierarchies.
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const id = managingUsersCenter.purchasing_center_id;
                      setManagingUsersCenter(null);
                      router.push(`/admin/purchasing-centers/${id}`);
                    }}
                    className="gap-1.5 text-xs text-primary border-primary/30"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Full Center View
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search accounts by name, email, or phone..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCenterUsers}
                    className="gap-1.5 text-xs h-9"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                  {canManageUsers && (
                    <Button
                      size="sm"
                      onClick={handleOpenAddUser}
                      className="gap-1.5 text-xs h-9"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Account
                    </Button>
                  )}
                </div>
              </div>

              {/* Accounts Table */}
              <div className="border rounded-lg overflow-hidden p-2">
                <DataTable
                  columns={centerUserColumns}
                  data={filteredCenterUsers}
                  isLoading={isUsersLoading}
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button variant="outline" onClick={() => setManagingUsersCenter(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ================= CREATE / EDIT STAFF ACCOUNT SUB-DIALOG ================= */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit Purchasing Center Account" : "Add Purchasing Center Account"}
            </DialogTitle>
            <DialogDescription>
              {managingUsersCenter?.name} • Directly assigned account without departments.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={userFullName}
                onChange={(e) => setUserFullName(e.target.value)}
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
                value={userPhoneNumber}
                onChange={(e) => setUserPhoneNumber(e.target.value)}
                placeholder="+251 91 123 4567"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Assigned Center Roles</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
                {availableRoles.length > 0 ? (
                  availableRoles.map((role: Role) => {
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
                  <p className="text-xs text-muted-foreground p-1">No roles found.</p>
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
    </>
  );
}
