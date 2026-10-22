"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Users,
  Plus,
  Edit,
  Shield,
  KeyRound,
  Building2,
  Mail,
  Phone,
  Power,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useResetUserPasswordMutation,
} from "@/redux/api/userApi";
import {
  useGetRegionalStructuresQuery,
  useGetRegionalRolesQuery,
} from "@/redux/api/regionApi";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/redux/types/user";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function RegionalUserManagement() {
  const { data: session } = useSession();
  const regionId = session?.user?.region_id;

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canCreate = can("REGIONAL_USERS:CREATE") || can("REGIONAL_USERS:MANAGE") || isSuperAdmin;
  const canUpdate = can("REGIONAL_USERS:UPDATE") || can("REGIONAL_USERS:MANAGE") || isSuperAdmin;
  const canAssignRole = can("REGIONAL_USERS:ASSIGN_ROLE") || can("REGIONAL_USERS:MANAGE") || isSuperAdmin;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Queries
  const {
    data: users = [],
    isLoading: isUsersLoading,
    refetch,
  } = useGetUsersQuery(
    { region_id: regionId || "" },
    { skip: !regionId }
  );

  const { data: structures = [] } = useGetRegionalStructuresQuery(
    { region_id: regionId || "" },
    { skip: !regionId }
  );

  const { data: roles = [] } = useGetRegionalRolesQuery();

  // Mutations
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [toggleStatus] = useToggleUserStatusMutation();
  const [resetPassword] = useResetUserPasswordMutation();

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setSelectedDeptId("");
    setSelectedRoleIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFullName(user.full_name);
    setEmail(user.email);
    setPhoneNumber(user.phone_number || "");
    setSelectedDeptId(user.regional_structure_id || "");
    const validRegionalRoleIds = new Set(roles.map((r: any) => r.role_id));
    const rawRoleIds = (user as any).roles?.map((r: any) => r.role_id) || [];
    const userRoleIds = validRegionalRoleIds.size > 0
      ? rawRoleIds.filter((id: string) => validRegionalRoleIds.has(id))
      : rawRoleIds;
    setSelectedRoleIds(userRoleIds);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionId) return;

    try {
      if (editingUser) {
        await updateUser({
          id: editingUser.user_id,
          data: {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone_number: phoneNumber.trim() || undefined,
            regional_structure_id: selectedDeptId ? selectedDeptId : null,
            ...(canAssignRole ? { role_ids: selectedRoleIds } : {}),
          },
        }).unwrap();
        actionFeedback.success("Regional user updated successfully.");
      } else {
        await createUser({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim() || undefined,
          region_id: regionId,
          regional_structure_id: selectedDeptId || undefined,
          role_ids: selectedRoleIds,
        }).unwrap();
        actionFeedback.success("Regional user account created successfully.");
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to save user account.");
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await toggleStatus({
        id: user.user_id,
        data: {
          is_active: !user.is_active,
        },
      }).unwrap();
      actionFeedback.success(
        `User ${!user.is_active ? "activated" : "deactivated"} successfully.`
      );
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to toggle user status.");
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset password for ${user.full_name}? A temporary password will be generated.`)) {
      return;
    }
    try {
      const res: any = await resetPassword(user.user_id).unwrap();
      actionFeedback.success(
        res?.message || `Password reset successfully for ${user.full_name}.`
      );
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to reset password.");
    }
  };

  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = searchQuery
        ? u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesStatus =
        statusFilter === "active"
          ? u.is_active
          : statusFilter === "inactive"
          ? !u.is_active
          : true;
      const matchesDept = deptFilter
        ? u.regional_structure_id === deptFilter
        : true;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [users, searchQuery, statusFilter, deptFilter]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "full_name",
      header: "User",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
              {u.full_name?.charAt(0) || "U"}
            </div>
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
      header: "Department",
      cell: ({ row }) => {
        const deptId = row.original.regional_structure_id;
        const dept = structures.find((s) => s.regional_structure_id === deptId);
        return dept ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {dept.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">— Unassigned —</span>
        );
      },
    },
    {
      accessorKey: "roles",
      header: "Assigned Roles",
      cell: ({ row }) => {
        const userRolesList = (row.original as any).roles || [];
        if (userRolesList.length === 0) {
          return <span className="text-xs text-muted-foreground">No role</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {userRolesList.map((r: any) => (
              <span
                key={r.role_id}
                className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border"
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
            {canUpdate && (
              <Button
                variant="ghost"
                size="sm"
                title="Edit User"
                onClick={() => handleOpenEditModal(u)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canUpdate && (
              <Button
                variant="ghost"
                size="sm"
                title={u.is_active ? "Deactivate User" : "Activate User"}
                onClick={() => handleToggleStatus(u)}
              >
                <Power
                  className={`h-4 w-4 ${
                    u.is_active ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                />
              </Button>
            )}
            {canUpdate && (
              <Button
                variant="ghost"
                size="sm"
                title="Reset Password"
                onClick={() => handleResetPassword(u)}
              >
                <RotateCcw className="h-4 w-4" />
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
      value: statusFilter,
      onChange: (val) => setStatusFilter(val),
      options: [
        { label: "All Statuses", value: "" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    {
      label: "Department",
      type: "select",
      key: "department",
      placeholder: "All Departments",
      value: deptFilter,
      onChange: (val) => setDeptFilter(val),
      options: [
        { label: "All Departments", value: "" },
        ...structures.map((s) => ({
          label: s.name,
          value: s.regional_structure_id,
        })),
      ],
    },
  ];

  const actionButtons: ActionButton[] = [];
  if (canCreate) {
    actionButtons.push({
      label: "New User",
      icon: <Plus className="h-4 w-4" />,
      onClick: handleOpenAddModal,
      variant: "default",
    });
  }

  if (isUsersLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Users
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administer regional staff accounts, department assignments, and permission roles.
          </p>
        </div>
      </div>

      <TableLayout
        title="Users"
        description="Accounts strictly bounded to this regional administration domain"
        filters={filterFields}
        actions={actionButtons}
      >
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={isUsersLoading}
        />
      </TableLayout>

      {/* Add / Edit User Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={handleSaveUser}>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit Regional User" : "Create Regional User"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Abebe Bikila"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@region.gov.et"
                  required
                />
                {!editingUser && (
                  <p className="text-xs text-muted-foreground">
                    A temporary password will be automatically assigned.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Phone Number
                </label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +251 911 234 567"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Regional Department
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Unassigned —</option>
                  {structures.map((s) => (
                    <option key={s.regional_structure_id} value={s.regional_structure_id}>
                      {s.name} (Level {s.level})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Departments belong exclusively to your regional organization.
                </p>
              </div>

              {canAssignRole && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-primary" />
                    Assignable Regional Roles
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-md border p-2.5 bg-muted/20">
                    {roles.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No regional roles configured</div>
                    ) : (
                      roles.map((r) => (
                        <label
                          key={r.role_id}
                          className="flex items-center gap-2.5 text-xs cursor-pointer hover:bg-muted/40 p-1.5 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.includes(r.role_id)}
                            onChange={() => toggleRoleSelection(r.role_id)}
                            className="rounded border-input text-primary"
                          />
                          <span className="font-medium text-foreground">{r.name}</span>
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
              )}
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
                {editingUser ? "Save Changes" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
