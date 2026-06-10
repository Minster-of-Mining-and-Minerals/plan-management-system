"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import { User } from "@/redux/types/user";
import { formatStatus } from "@/utils/statusFormatter";
import { useRouter } from "next/navigation";
import { useRemoveUserFromGroupMutation } from "@/redux/api/permissionGroupApi";
import { actionFeedback } from "@/components/action-feedback";
import { useSearchParams } from "next/navigation";
import { matchesActiveInactiveFilter, matchesSearchQuery } from "@/utils/tableUtils";


export interface UserTableProps {
    sideActions?: ActionButton[];
    actions?: ActionButton[];
    users: User[];
    groupId?: string;
    isLoading?: boolean;
}

export default function UsersGroupList({ sideActions, actions, users, groupId, isLoading }: UserTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const [statusFilter, setStatusFilter] = useState("");

    const [removeUser, { isLoading: isRemoving }] = useRemoveUserFromGroupMutation();

    const handleRemove = async (userId: string) => {
        if (!groupId) return;
        if (await actionFeedback.confirm("Are you sure you want to remove this user from the group?", { destructive: true })) {
            try {
                await removeUser({ permission_group_id: groupId, user_id: userId }).unwrap();
                actionFeedback.success("User removed from group");
            } catch (err: any) {
                actionFeedback.error(err?.data?.message || "Failed to remove user");
            }
        }
    };

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
            cell: ({ row }: any) => <div>{row.getValue("phone_number") || "N/A"}</div>,
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("is_active") as boolean;
                return (
                    <Badge className="text-white" status={isActive ? "active" : "inactive"}>
                        {formatStatus(isActive ? "Active" : "Inactive")}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={() => router.push(`/users/list/${row.original.user_id}`)} 
                        variant="ghost" 
                        size="icon"
                        title="View Profile"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {groupId && (
                        <Button 
                            onClick={() => handleRemove(row.original.user_id)} 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Remove from Group"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
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

    // Apply filters locally
    const filteredData = users.filter((user) => {
        if (!matchesActiveInactiveFilter(statusFilter, user.is_active)) return false;
        return matchesSearchQuery(searchQuery, [user.full_name, user.email, user.phone_number]);
    });

    return (
        <div className="w-full">
            <TableLayout
                actions={actions}
                sideActions={sideActions}
                filters={filters}
                filterColumnsPerRow={1}
            >
                <DataTable
                    columns={columns}
                    data={filteredData}
                    isLoading={isLoading || isRemoving}
                    resetKey={`${searchQuery}-${statusFilter}-${groupId}-${users.length}`}
                />
            </TableLayout>
        </div>
    );
} 
