"use client";
import { ActionButton } from "@/types/tableLayout";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import UsersGroupList from "./UsersGroupList";
import { useGetPermissionGroupByIdQuery } from "@/redux/api/permissionGroupApi";
import { AddGroupMembersModal } from "./AddGroupMembersModal";

interface GroupManagementProps {
    groupId?: string;
}

function GroupManagement({ groupId }: GroupManagementProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { data: group, isLoading } = useGetPermissionGroupByIdQuery(groupId as string, {
        skip: !groupId,
    });

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
                <h3 className="text-xl font-bold text-section-accent">Group Members</h3>
            </div>

            <UsersGroupList
                actions={actions}
                users={group?.users || []}
                groupId={groupId}
                isLoading={isLoading}
            />

            <AddGroupMembersModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                groupId={groupId}
                existingUserIds={group?.users?.map(u => u.user_id) || []}
            />
        </div>
    );
}

export default GroupManagement;
