"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Calendar,
  Edit,
  Mail,
  Plus,
  User2,
  Eye,
  Save,
  X,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DetailHeader from "@/components/common/DetailHeader";
import { CreateUserModal } from "@/components/common/modals/CreateUserModal";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import {
  useGetDepartmentByIdQuery,
  useUpdateDepartmentMutation,
} from "@/redux/api/departmentApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type { User } from "@/redux/types/user";
import { formatStatus } from "@/utils/statusFormatter";
import { formatInternalUserDisplayName } from "@/utils/formatUserDisplayName";
import { toast } from "sonner";

function InfoField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 px-4 first:pl-0 last:pr-0 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

export default function DepartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const departmentId = params.id as string;

  const {
    data: department,
    isLoading: deptLoading,
    isError: deptError,
    refetch: refetchDept,
  } = useGetDepartmentByIdQuery(departmentId);

  const {
    data: deptUsersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useGetUsersQuery({ department_id: departmentId });
  const deptUsers = deptUsersData?.users ?? [];

  const { data: allActiveUsersData } = useGetUsersQuery(
    { is_active: true },
    { skip: deptLoading }
  );
  const allActiveUsers = allActiveUsersData?.users ?? [];

  const [updateDepartment, { isLoading: isUpdating }] =
    useUpdateDepartmentMutation();

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigningHead, setIsAssigningHead] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [deptHeadId, setDeptHeadId] = useState("");
  const [headSearch, setHeadSearch] = useState("");

  useEffect(() => {
    if (!department) return;
    setName(department.name);
    setCode(department.code);
    setStatus(department.status);
    setDeptHeadId(department.dept_head ?? "");
  }, [department]);

  const resetForm = () => {
    if (!department) return;
    setName(department.name);
    setCode(department.code);
    setStatus(department.status);
    setDeptHeadId(department.dept_head ?? "");
    setHeadSearch("");
    setIsAssigningHead(false);
  };

  const headCandidates = useMemo(() => {
    const seen = new Set<string>();
    const merged: User[] = [];
    for (const u of [...deptUsers, ...allActiveUsers]) {
      if (!seen.has(u.user_id)) {
        seen.add(u.user_id);
        merged.push(u);
      }
    }
    const term = headSearch.trim().toLowerCase();
    const filtered = term
      ? merged.filter(
          (u) =>
            u.full_name?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term)
        )
      : merged;
    return filtered.slice(0, 50);
  }, [deptUsers, allActiveUsers, headSearch]);

  const selectedHeadUser = useMemo(
    () => allActiveUsers.find((u) => u.user_id === deptHeadId),
    [allActiveUsers, deptHeadId]
  );

  const handleSave = async () => {
    if (!department) return;
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }

    try {
      await updateDepartment({
        id: department.department_id,
        data: {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          status,
          dept_head: deptHeadId || null,
        },
      }).unwrap();
      toast.success("Department updated");
      setIsEditing(false);
      setIsAssigningHead(false);
      refetchDept();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to update department";
      toast.error(message);
    }
  };

  const handleAssignHead = async () => {
    if (!department || !deptHeadId) {
      toast.error("Select a staff member to assign as department head");
      return;
    }

    try {
      await updateDepartment({
        id: department.department_id,
        data: { dept_head: deptHeadId },
      }).unwrap();
      toast.success("Department head assigned");
      setIsAssigningHead(false);
      refetchDept();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to assign department head";
      toast.error(message);
    }
  };

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: "full_name",
        header: "Full Name",
        cell: ({ row }) => formatInternalUserDisplayName(row.original),
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "phone_number",
        header: "Phone",
        cell: ({ row }) => row.getValue("phone_number") || "—",
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.getValue("is_active") as boolean;
          return (
            <Badge variant={isActive ? "default" : "destructive"}>
              {formatStatus(isActive ? "Active" : "Inactive")}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            title="View user"
            onClick={() => router.push(`/users/list/${row.original.user_id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router]
  );

  const {
    paginated: paginatedUsers,
    totalPageCount,
    pageIndex,
    pageSize,
    handlePagination,
  } = useClientDataTable(deptUsers, {
    searchKeys: ["full_name", "email", "phone_number"],
  });

  if (deptLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (deptError || !department) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Department not found.</p>
        <Button variant="outline" onClick={() => router.push("/departments")}>
          Back to departments
        </Button>
      </div>
    );
  }

  const hasHead = Boolean(department.dept_head && department.dept_head_name);
  const showHeadPicker = isEditing || isAssigningHead;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DetailHeader
          breadcrumbs={[
            { title: "Departments", link: "/departments" },
            { title: isEditing ? name || department.name : department.name },
          ]}
        />
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
                disabled={isUpdating}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                <Save className="mr-2 h-4 w-4" />
                {isUpdating ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit department
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 px-4 py-3">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold text-primary">
              Department
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="flex flex-wrap items-start divide-x divide-border border-y border-border py-3">
              <InfoField label="Name">
                {isEditing ? (
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 max-w-[200px]"
                  />
                ) : (
                  <span className="font-semibold">{department.name}</span>
                )}
              </InfoField>
              <InfoField label="Code">
                {isEditing ? (
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="h-8 max-w-[120px] font-mono"
                  />
                ) : (
                  <span className="font-mono font-medium">{department.code}</span>
                )}
              </InfoField>
              <InfoField label="Slug">
                <span className="font-mono text-xs text-muted-foreground">
                  {department.slug}
                </span>
              </InfoField>
              <InfoField label="Status">
                {isEditing ? (
                  <Select
                    value={status}
                    onValueChange={(v) =>
                      setStatus(v as "active" | "inactive")
                    }
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant={
                      department.status === "active" ? "default" : "secondary"
                    }
                  >
                    {department.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                )}
              </InfoField>
              <InfoField label="Created" className="hidden sm:block">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(department.created_at).toLocaleDateString()}
                </span>
              </InfoField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 px-4 py-3">
            <User2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold text-primary">
              Department Head
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0 text-sm">
            {hasHead && !showHeadPicker ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {department.dept_head_name}
                    </p>
                    {department.dept_head_email && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        {department.dept_head_email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/users/list/${department.dept_head}`)
                    }
                  >
                    View profile
                  </Button>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeptHeadId(department.dept_head ?? "");
                        setIsAssigningHead(true);
                      }}
                    >
                      Change head
                    </Button>
                  )}
                </div>
              </>
            ) : showHeadPicker ? (
              <div className="space-y-2">
                <Input
                  value={headSearch}
                  onChange={(e) => setHeadSearch(e.target.value)}
                  placeholder="Search staff…"
                  className="h-8"
                />
                <Select
                  value={deptHeadId || "none"}
                  onValueChange={(v) => setDeptHeadId(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select department head" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No head assigned</SelectItem>
                    {headCandidates.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {formatInternalUserDisplayName(user)} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedHeadUser && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {formatInternalUserDisplayName(selectedHeadUser)}
                  </p>
                )}
                {!isEditing && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleAssignHead}
                      disabled={isUpdating || !deptHeadId}
                    >
                      {isUpdating ? "Assigning…" : "Assign head"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetForm();
                        setIsAssigningHead(false);
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  No department head assigned yet.
                </p>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setIsAssigningHead(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign department head
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TableLayout
        title="Staff in this department"
        description={`Users assigned to ${department.name}`}
        actions={[
          {
            label: "Add staff user",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            permissions: ["USERS:CREATE"],
            onClick: () => setCreateUserOpen(true),
          },
        ]}
      >
        <DataTable
          columns={columns}
          data={paginatedUsers}
          totalPageCount={totalPageCount}
          handlePagination={handlePagination}
          tablePageSize={pageSize}
          currentIndex={pageIndex}
          isLoading={usersLoading}
        />
      </TableLayout>

      <CreateUserModal
        isOpen={createUserOpen}
        onClose={() => {
          setCreateUserOpen(false);
          refetchUsers();
        }}
        defaultDepartmentId={departmentId}
        lockDepartment
      />
    </div>
  );
}
