"use client";

import { useMemo } from "react";
import {
    PlanNodeAssignmentOptionPermissionGroup,
    PlanNodeAssignmentOptionRole,
} from "@/redux/types/plan";
import { SelectableSearchList } from "./SelectableSearchList";

type RoleOrGroupItem =
    | { kind: "role"; data: PlanNodeAssignmentOptionRole }
    | { kind: "permission_group"; data: PlanNodeAssignmentOptionPermissionGroup };

interface AssignmentRolesPanelProps {
    roles: PlanNodeAssignmentOptionRole[];
    permissionGroups: PlanNodeAssignmentOptionPermissionGroup[];
    selectedRoleId: string | null;
    selectedPermissionGroupId: string | null;
    onSelectRole: (roleId: string) => void;
    onSelectPermissionGroup: (permissionGroupId: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

function getItemId(item: RoleOrGroupItem): string {
    return item.kind === "role" ? item.data.role_id : item.data.permission_group_id;
}

export function AssignmentRolesPanel({
    roles,
    permissionGroups,
    selectedRoleId,
    selectedPermissionGroupId,
    onSelectRole,
    onSelectPermissionGroup,
    isLoading,
    disabled,
}: AssignmentRolesPanelProps) {
    const items = useMemo<RoleOrGroupItem[]>(
        () => [
            ...roles.map((role) => ({ kind: "role" as const, data: role })),
            ...permissionGroups.map((group) => ({
                kind: "permission_group" as const,
                data: group,
            })),
        ],
        [roles, permissionGroups]
    );

    const selectedId = selectedPermissionGroupId
        ? `group:${selectedPermissionGroupId}`
        : selectedRoleId
          ? `role:${selectedRoleId}`
          : null;

    return (
        <SelectableSearchList
            items={items}
            getItemId={(item) => `${item.kind === "role" ? "role" : "group"}:${getItemId(item)}`}
            selectedId={selectedId}
            onSelect={(compositeId) => {
                const [kind, id] = compositeId.split(":");
                if (kind === "group") {
                    onSelectPermissionGroup(id);
                    return;
                }
                onSelectRole(id);
            }}
            isLoading={isLoading}
            disabled={disabled}
            searchPlaceholder="Search roles and permission groups..."
            emptyMessage="No eligible roles or permission groups"
            filterItem={(item, search) => {
                const name = item.data.name.toLowerCase();
                if (name.includes(search)) return true;
                if (item.kind === "permission_group") {
                    return (
                        item.data.structure_names?.some((structureName) =>
                            structureName.toLowerCase().includes(search)
                        ) ?? false
                    );
                }
                return false;
            }}
            renderItem={(item) => {
                if (item.kind === "role") {
                    return (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{item.data.name}</span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    Role
                                </span>
                            </div>
                            <span className="text-xs capitalize text-gray-500">{item.data.scope} role</span>
                        </div>
                    );
                }

                const structureLabel = item.data.structure_names?.length
                    ? item.data.structure_names.join(", ")
                    : "Sector-linked group";

                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{item.data.name}</span>
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                                Group
                            </span>
                        </div>
                        <span className="text-xs text-gray-500">{structureLabel}</span>
                    </div>
                );
            }}
        />
    );
}
