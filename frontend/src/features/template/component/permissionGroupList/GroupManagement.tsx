"use client";
import { ActionButton } from "@/types/tableLayout";
import { Building, Users, UserPlus } from "lucide-react";
import { useState } from "react";
import UsersGroupList from "./UsersGroupList";
import StructuresGroupList from "./StructuresGroupList";
import { useGetPermissionGroupByIdQuery } from "@/redux/api/permissionGroupApi";
import { AddGroupMembersModal } from "./AddGroupMembersModal";

interface GroupManagementProps {
    groupId?: string;
}

function GroupManagement({ groupId }: GroupManagementProps) {
    const [activeTab, setActiveTab] = useState<"users" | "structures">(
        "users"
    );
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { data: group, isLoading } = useGetPermissionGroupByIdQuery(groupId as string, {
        skip: !groupId,
    });

    const sideActions: ActionButton[] = [
        {
            label: "Users",
            icon: <Users className="h-4 w-4" />,
            variant: activeTab === "users" ? "default" : "outline",
            size: "default",
            onClick: () => setActiveTab("users"),
        },
        {
            label: "Structures",
            icon: <Building className="h-4 w-4" />,
            variant: activeTab === "structures" ? "default" : "outline",
            size: "default",
            onClick: () => setActiveTab("structures"),
        },
    ];

    const actions: ActionButton[] = groupId ? [
        {
            label: "Add Member",
            icon: <UserPlus className="h-4 w-4" />,
            variant: "default",
            onClick: () => setIsAddModalOpen(true),
        },
    ] : [];

    if (!groupId) return null;

    return (
        <div className="space-y-4 mt-8 pt-8 border-t w-full">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-golden-dark">Group Members</h3>
            </div>

            {activeTab === "users" && (
                <UsersGroupList
                    sideActions={sideActions}
                    actions={actions}
                    users={group?.users || []}
                    groupId={groupId}
                    isLoading={isLoading}
                />
            )}
            {activeTab === "structures" && (
                <StructuresGroupList
                    sideActions={sideActions}
                    actions={actions}
                    structures={group?.structures || []}
                    groupId={groupId}
                    isLoading={isLoading}
                />
            )}

            <AddGroupMembersModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                groupId={groupId}
                existingUserIds={group?.users?.map(u => u.user_id) || []}
                existingStructureIds={group?.structures?.map(s => s.structure_id) || []}
            />
        </div>
    );
}

export default GroupManagement;