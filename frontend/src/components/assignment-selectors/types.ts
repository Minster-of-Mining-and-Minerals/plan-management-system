import {
    PlanNodeAssignmentOptionDepartment,
    PlanNodeAssignmentOptionPermissionGroup,
    PlanNodeAssignmentOptionRole,
    PlanNodeAssignmentOptionUser,
} from "@/redux/types/plan";

export type AssignmentTargetType = "user" | "department" | "role" | "permission_group";

export interface AssignmentTargetSelection {
    type: AssignmentTargetType;
    userId: string | null;
    internalStructureId: string | null;
    roleId: string | null;
    permissionGroupId: string | null;
}

export interface AssignmentTargetSelectorProps {
    users: PlanNodeAssignmentOptionUser[];
    departments: PlanNodeAssignmentOptionDepartment[];
    roles: PlanNodeAssignmentOptionRole[];
    permissionGroups: PlanNodeAssignmentOptionPermissionGroup[];
    allowUser: boolean;
    allowDepartment: boolean;
    allowRole: boolean;
    isLoading?: boolean;
    disabled?: boolean;
    value: AssignmentTargetSelection | null;
    onChange: (value: AssignmentTargetSelection) => void;
    className?: string;
}

export function createEmptySelection(type: AssignmentTargetType): AssignmentTargetSelection {
    return {
        type,
        userId: null,
        internalStructureId: null,
        roleId: null,
        permissionGroupId: null,
    };
}

export function selectionFromIds(
    type: AssignmentTargetType,
    id: string | null
): AssignmentTargetSelection {
    return {
        type,
        userId: type === "user" ? id : null,
        internalStructureId: type === "department" ? id : null,
        roleId: type === "role" ? id : null,
        permissionGroupId: type === "permission_group" ? id : null,
    };
}

export function getSelectionId(selection: AssignmentTargetSelection | null): string | null {
    if (!selection) return null;
    if (selection.type === "user") return selection.userId;
    if (selection.type === "department") return selection.internalStructureId;
    if (selection.type === "permission_group") return selection.permissionGroupId;
    return selection.roleId;
}

export function isRoleTabSelection(type: AssignmentTargetType): boolean {
    return type === "role" || type === "permission_group";
}
