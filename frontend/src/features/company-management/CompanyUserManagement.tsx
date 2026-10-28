"use strict";
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
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useResetUserPasswordMutation,
} from "@/redux/api/userApi";
import {
  useGetCompanyStructuresQuery,
  useGetCompanyRolesQuery,
} from "@/redux/api/companyApi";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/redux/types/user";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function CompanyUserManagement({
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
    can("COMPANY_USERS:CREATE") ||
    can("COMPANY_USERS:MANAGE") ||
    can("COMPANIES:MANAGE") ||
    isSuperAdmin;
  const canUpdate =
    can("COMPANY_USERS:UPDATE") ||
    can("COMPANY_USERS:MANAGE") ||
    can("COMPANIES:MANAGE") ||
    isSuperAdmin;
  const canAssignRole =
    can("COMPANY_USERS:ASSIGN_ROLE") ||
    can("COMPANY_USERS:MANAGE") ||
    can("COMPANIES:MANAGE") ||
    isSuperAdmin;

  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Queries
  const {
    data: users = [],
    isLoading: isUsersLoading,
    refetch,
  } = useGetUsersQuery(
    { company_id: companyId || "" },
    { skip: !companyId }
  );

  const { data: structures = [] } = useGetCompanyStructuresQuery(
    { company_id: companyId || "" },
    { skip: !companyId }
  );

  const { data: roles = [] } = useGetCompanyRolesQuery(
    companyId || "",
    { skip: !companyId }
  );

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
    setSelectedDeptId(user.company_structure_id || "");
    setSelectedRoleIds(user.roles?.map((r) => r.role_id) || []);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !companyId) {
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
            company_structure_id: selectedDeptId || null,
            role_ids: selectedRoleIds,
          },
        }).unwrap();
        actionFeedback.success(`User '${fullName}' updated successfully.`);
      } else {
        await createUser({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim() || undefined,
          company_id: companyId,
          company_structure_id: selectedDeptId || null,
          role_ids: selectedRoleIds,
        }).unwrap();
        actionFeedback.success(`Company user '${fullName}' created successfully.`);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to save company user.");
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await toggleStatus({
        id: user.user_id,
        data: { is_active: !user.is_active },
      }).unwrap();
      actionFeedback.success(
        `User '${user.full_name}' ${!user.is_active ? "activated" : "deactivated"} successfully.`
      );
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to toggle user status.");
    }
  };

  const handleResetPassword = async (user: User) => {
    if (
      !confirm(
        `Reset temporary password for "${user.full_name}" (${user.email})? A temporary password will be issued.`
      )
    ) {
      return;
    }
    try {
      await resetPassword(user.user_id).unwrap();
      actionFeedback.success(`Password reset for '${user.full_name}'. Temporary password sent.`);
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to reset password.");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;
      if (deptFilter && u.company_structure_id !== deptFilter) return false;
      return true;
    });
  }, [users, statusFilter, deptFilter]);

  const columns = useMemo<ColumnDef<User>[]>(() => {
    return [
      {
        accessorKey: "full_name",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div>
              <div className="font-medium text-foreground">{user.full_name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" />
                <span>{user.email}</span>
              </div>
              {user.phone_number && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  <span>{user.phone_number}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "companyStructure",
        header: "Department",
        cell: ({ row }) => {
          const dept = row.original.companyStructure;
          return dept ? (
            <div className="flex items-center gap-1.5 text-sm">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{dept.name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Unassigned (HQ)</span>
          );
        },
      },
      {
        accessorKey: "roles",
        header: "Assigned Roles",
        cell: ({ row }) => {
          const userRolesList = row.original.roles || [];
          return (
            <div className="flex flex-wrap gap-1">
              {userRolesList.length > 0 ? (
                userRolesList.map((r) => (
                  <span
                    key={r.role_id}
                    className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
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
          const user = row.original;
          return (
            <div className="flex items-center gap-1">
              {canUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditModal(user)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Edit User"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}

              {canUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleStatus(user)}
                  className={`h-8 w-8 p-0 ${
                    user.is_active
                      ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                      : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  }`}
                  title={user.is_active ? "Deactivate User" : "Activate User"}
                >
                  <Power className="w-4 h-4" />
                </Button>
              )}

              {canUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetPassword(user)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Reset Temporary Password"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [canUpdate]);

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
        value: statusFilter,
        onChange: (val) => setStatusFilter(String(val || "")),
      },
      {
        key: "department",
        label: "Department",
        type: "select",
        options: structures.map((s) => ({
          label: s.name,
          value: s.company_structure_id,
        })),
        value: deptFilter,
        onChange: (val) => setDeptFilter(String(val || "")),
      },
    ];
  }, [statusFilter, deptFilter, structures]);

  const actionButtons = useMemo<ActionButton[]>(() => {
    const btns: ActionButton[] = [];
    if (canCreate) {
      btns.push({
        label: "Add Company User",
        icon: <Plus className="h-4 w-4" />,
        variant: "default",
        onClick: handleOpenAddModal,
      });
    }
    return btns;
  }, [canCreate]);

  if (isUsersLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      <TableLayout
        title="Company User Accounts"
        description="Manage company user accounts, department assignments, and permission roles. Company accounts are strictly isolated to their assigned company."
        filters={filterFields}
        actions={actionButtons}
        sideActions={sideActions}
      >
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={isUsersLoading}
        />
      </TableLayout>

      {/* Add / Edit User Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleSaveUser}>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit Company User" : "Add Company User"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Abebe Bikila"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address *</label>
                  <Input
                    required
                    type="email"
                    placeholder="user@miningcorp.et"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    placeholder="+251-91-..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Department Assignment</label>
                <Select
                  value={selectedDeptId || "none"}
                  onValueChange={(val) => setSelectedDeptId(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned (Company Headquarters)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned (Company Headquarters)</SelectItem>
                    {structures.map((s) => (
                      <SelectItem key={s.company_structure_id} value={s.company_structure_id}>
                        {"— ".repeat(s.level - 1)} {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  User can only be assigned to valid departments belonging to this company.
                </p>
              </div>

              {canAssignRole && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign Company Roles</label>
                  <div className="border rounded-md p-3 max-h-44 overflow-y-auto space-y-2 bg-muted/20">
                    {roles.length > 0 ? (
                      roles.map((r) => {
                        const isChecked = selectedRoleIds.includes(r.role_id);
                        return (
                          <label
                            key={r.role_id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRoleIds([...selectedRoleIds, r.role_id]);
                                } else {
                                  setSelectedRoleIds(
                                    selectedRoleIds.filter((id) => id !== r.role_id)
                                  );
                                }
                              }}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                            />
                            <div>
                              <div className="font-medium text-foreground">{r.name}</div>
                              {r.description && (
                                <div className="text-xs text-muted-foreground">
                                  {r.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="text-xs text-muted-foreground italic py-2 text-center">
                        No company roles configured.
                      </div>
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
                {isCreating || isUpdating ? "Saving..." : "Save User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
