"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Calendar,
  Edit,
  Hash,
  Mail,
  Plus,
  User2,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DetailHeader from "@/components/common/DetailHeader";
import { CreateUserModal } from "@/components/common/modals/CreateUserModal";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { useGetDepartmentByIdQuery } from "@/redux/api/departmentApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type { User } from "@/redux/types/user";
import { formatStatus } from "@/utils/statusFormatter";
import { DepartmentFormModal } from "./DepartmentFormModal";

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
    data: users = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useGetUsersQuery({ department_id: departmentId });

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: "full_name",
        header: "Full Name",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.getValue("full_name")}</span>
        ),
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
  } = useClientDataTable(users, {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DetailHeader
          breadcrumbs={[
            { title: "Departments", link: "/departments" },
            { title: department.name },
          ]}
        />
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit department
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <Building2 className="h-5 w-5" />
              Department
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-semibold text-foreground">{department.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Code</p>
                <p className="font-medium">{department.code}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Slug</p>
                <p className="font-mono text-xs">{department.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={department.status === "active" ? "default" : "secondary"}>
                {department.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{new Date(department.created_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <User2 className="h-5 w-5" />
              Department Head
            </CardTitle>
          </CardHeader>
          <CardContent>
            {department.dept_head && department.dept_head_name ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {department.dept_head_name}
                    </p>
                    {department.dept_head_email && (
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {department.dept_head_email}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/users/list/${department.dept_head}`)}
                >
                  View profile
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No department head assigned yet.
              </p>
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

      <DepartmentFormModal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          refetchDept();
          refetchUsers();
        }}
        department={department}
      />
    </div>
  );
}
