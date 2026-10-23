"use strict";
"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Edit,
  RotateCcw,
  CheckCircle2,
  XCircle,
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
import { useGetPurchasingCenterRolesQuery } from "@/redux/api/purchasingCenterApi";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import type { User, Role } from "@/redux/types/user";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";

export function PurchasingCenterUserManagement() {
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const sessionUser = session?.user as (Record<string, unknown> & { purchasing_center_id?: string }) | undefined;
  const centerId = params?.id || sessionUser?.purchasing_center_id;

  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const canCreate = can("PURCHASING_CENTER_USERS:CREATE") || can("PURCHASING_CENTER_USERS:MANAGE") || isSuperAdmin;
  const canUpdate = can("PURCHASING_CENTER_USERS:UPDATE") || can("PURCHASING_CENTER_USERS:MANAGE") || isSuperAdmin;
  const canAssignRole = can("PURCHASING_CENTER_USERS:ASSIGN_ROLE") || can("PURCHASING_CENTER_USERS:MANAGE") || isSuperAdmin;

  const [statusFilter, setStatusFilter] = useState("");

  // Queries
  const {
    data: users = [],
    isLoading: isUsersLoading,
    refetch,
  } = useGetUsersQuery(
    { purchasing_center_id: centerId || "" },
    { skip: !centerId }
  );

  const { data: roles = [] } = useGetPurchasingCenterRolesQuery();

  // Mutations
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [toggleStatus] = useToggleUserStatusMutation();
  const [resetPassword] = useResetUserPasswordMutation();

  // Create / Edit Modal State (Zero department fields!)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setSelectedRoleIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFullName(u.full_name || "");
    setEmail(u.email || "");
    setPhoneNumber(u.phone_number || "");
    const rawRoleIds = u.roles?.map((r) => r.role_id) || [];
    setSelectedRoleIds(rawRoleIds);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      actionFeedback.error("Name and email are required.");
      return;
    }

    try {
      if (editingUser) {
        await updateUser({
          id: editingUser.user_id,
          data: {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone_number: phoneNumber.trim() || undefined,
            purchasing_center_id: centerId,
            role_ids: selectedRoleIds,
          },
        }).unwrap();
        actionFeedback.success(`Purchasing center account '${fullName}' updated.`);
      } else {
        await createUser({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim() || undefined,
          purchasing_center_id: centerId,
          role_ids: selectedRoleIds,
        }).unwrap();
        actionFeedback.success(`Account created for '${fullName}'.`);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string }; message?: string })?.data?.message || (err as Error)?.message || "Failed to save user account.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await toggleStatus({
        id: u.user_id,
        data: { is_active: !u.is_active },
      }).unwrap();
      actionFeedback.success(`Status for '${u.full_name}' updated.`);
      refetch();
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to update status.";
      actionFeedback.error(errorMsg);
    }
  };

  const handleResetPassword = async (u: User) => {
    if (!confirm(`Reset password for ${u.full_name}?`)) return;
    try {
      await resetPassword(u.user_id).unwrap();
      actionFeedback.success(`Temporary password sent to ${u.email}.`);
    } catch (err: unknown) {
      const errorMsg = (err as { data?: { message?: string } })?.data?.message || "Failed to reset password.";
      actionFeedback.error(errorMsg);
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "full_name",
      header: "Staff Member",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
            {row.original.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.original.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
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
            {canUpdate && (
              <Button
                onClick={() => handleOpenEditModal(u)}
                variant="ghost"
                size="icon"
                title="Edit Account"
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canUpdate && (
              <Button
                onClick={() => handleToggleActive(u)}
                variant="ghost"
                size="icon"
                title={u.is_active ? "Deactivate Account" : "Activate Account"}
                className="h-8 w-8"
              >
                {u.is_active ? (
                  <XCircle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </Button>
            )}
            {canUpdate && (
              <Button
                onClick={() => handleResetPassword(u)}
                variant="ghost"
                size="icon"
                title="Reset Password"
                className="h-8 w-8 text-blue-600"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const filteredUsers = useMemo(() => {
    return users.filter((u) => matchesActiveInactiveFilter(statusFilter, u.is_active));
  }, [users, statusFilter]);

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "Filter by status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "All Statuses", value: "" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const actions: ActionButton[] = [
    ...(canCreate
      ? [
          {
            label: "Add Center Account",
            icon: <Plus className="h-4 w-4" />,
            onClick: handleOpenAddModal,
          },
        ]
      : []),
  ];

  if (isUsersLoading) {
    return <Loading01 />;
  }

  return (
    <>
      <TableLayout
        title="Purchasing Center Staff Accounts"
        description="Manage authorized users belonging directly to this purchasing center."
        filters={filters}
        actions={actions}
      >
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={isUsersLoading}
        />
      </TableLayout>

      {/* Direct User Create / Edit Dialog - Zero Department Fields! */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit Center Account" : "Add Center Account"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. almaz@purchasing.mom.et"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number</label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251 91 123 4567"
              />
            </div>

            {canAssignRole && (
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
                                setSelectedRoleIds(
                                  selectedRoleIds.filter((id) => id !== role.role_id)
                                );
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
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating
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
