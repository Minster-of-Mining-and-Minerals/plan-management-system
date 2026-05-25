"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, Eye, Edit, Trash, Users } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useExportUsersMutation, useGetUsersQuery } from "@/redux/api/userApi";
import { User } from "@/redux/types/user";
import { CreateUserModal } from "@/components/common/modals/CreateUserModal";
import { formatStatus } from "@/utils/statusFormatter";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";


export interface UserTableProps {
    sideActions?: ActionButton[];
    structure_id?: string;
}
// structure_node_id
export default function UserTable({ sideActions, structure_id }: UserTableProps) {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();

    // Pagination states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);


    const columns: ColumnDef<User>[] = [
        {
            accessorKey: "full_name",
            header: "Full Name",
            cell: ({ row }) => (
                <span className="font-medium text-primary">
                    {row.getValue("full_name")}
                </span>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }: any) => <div>{row.getValue("email")}</div>,
        },
        {
            accessorKey: "phone_number",
            header: "Phone Number",
            cell: ({ row }: any) => <div>{row.getValue("phone_number")}</div>,
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
                <div className="flex items-center">
                    <Button onClick={() => router.push(`/users/list/${row.original.user_id}`)} variant="ghost" size="icon" >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {/* <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                    <Trash className="h-4 w-4" />
                </Button> */}
                </div>
            ),
        },
    ];

    const {
        data: response,
        isLoading,
        isError,
        refetch,
    } = useGetUsersQuery({
        structure_id: structure_id,
        page: pageIndex + 1,
        limit: pageSize,
        search: searchQuery,
    });

    const allUsers = response ?? [];
    const totalPages = Math.max(1, Math.ceil(allUsers.length / pageSize));
    const users = allUsers.slice(
        pageIndex * pageSize,
        pageIndex * pageSize + pageSize
    );
    const [exportUsers, { isLoading: exportLoading }] = useExportUsersMutation();

    // Reset page index when search changes
    useEffect(() => {
        setPageIndex(0);
    }, [searchQuery]);

    const [isModalOpen, setModalOpen] = useState(false);
    const handlePagination = (index: number, size: number) => {
        setPageIndex(index);
        setPageSize(size);
    };

    // Filters
    const [statusFilter, setStatusFilter] = useState("");

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

    // Actions
    const actions: ActionButton[] = [
        {
            label: "Export",
            icon: <Download className="h-4 w-4" />,
            variant: "outline",
            loading: exportLoading,
            // permissions: ["USER:EXPORT"],
            onClick: async () => {
                try {
                    const blob = await exportUsers().unwrap();
                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "users.csv";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } catch (err) {
                    console.error("Export failed", err);
                }
            },
        },

        {
            label: "New User",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            onClick: () => setModalOpen(true),
            // permissions: ["USER:CREATE"],
        },
    ];

    // Apply filters locally
    const filteredData = users.filter((role) => {
        if (statusFilter === "active") return role.is_active === true;
        if (statusFilter === "inactive") return role.is_active === false;
        return true;
    });

    return (
        <>
            <TableLayout
                actions={actions}
                sideActions={sideActions}
                filters={filters}
                filterColumnsPerRow={1}
            >
                <DataTable
                    columns={columns}
                    data={filteredData}
                    totalPageCount={totalPages}
                    handlePagination={handlePagination}
                    tablePageSize={pageSize}
                    currentIndex={pageIndex}
                />
            </TableLayout>
            <CreateUserModal
                structure_id={structure_id}
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
            />
        </>
    );
} 