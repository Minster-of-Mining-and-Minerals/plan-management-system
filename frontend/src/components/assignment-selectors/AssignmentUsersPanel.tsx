"use client";

import { PlanNodeAssignmentOptionUser } from "@/redux/types/plan";
import { SelectableSearchList } from "./SelectableSearchList";

interface AssignmentUsersPanelProps {
    users: PlanNodeAssignmentOptionUser[];
    selectedId: string | null;
    onSelect: (userId: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

export function AssignmentUsersPanel({
    users,
    selectedId,
    onSelect,
    isLoading,
    disabled,
}: AssignmentUsersPanelProps) {
    return (
        <SelectableSearchList
            items={users}
            getItemId={(user) => user.user_id}
            selectedId={selectedId}
            onSelect={onSelect}
            isLoading={isLoading}
            disabled={disabled}
            searchPlaceholder="Search users..."
            emptyMessage="No eligible users"
            filterItem={(user, search) =>
                user.full_name.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search)
            }
            renderItem={(user) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{user.full_name}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                </div>
            )}
        />
    );
}
