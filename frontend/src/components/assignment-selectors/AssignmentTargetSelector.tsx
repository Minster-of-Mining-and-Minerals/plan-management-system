"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Building, Shield, User as UserIcon } from "lucide-react";
import { TableTabBar } from "@/components/common/TableTabBar";
import { cn } from "@/lib/utils";
import { AssignmentDepartmentsPanel } from "./AssignmentDepartmentsPanel";
import { AssignmentRolesPanel } from "./AssignmentRolesPanel";
import { AssignmentUsersPanel } from "./AssignmentUsersPanel";
import {
    AssignmentTargetSelectorProps,
    AssignmentTargetType,
    createEmptySelection,
    getSelectionId,
    isRoleTabSelection,
    selectionFromIds,
} from "./types";

type AssignmentTab = "department" | "user" | "role";

function getDefaultTab(
    allowDepartment: boolean,
    allowUser: boolean,
    allowRole: boolean
): AssignmentTab {
    if (allowDepartment) return "department";
    if (allowUser) return "user";
    if (allowRole) return "role";
    return "department";
}

function selectionToTab(type: AssignmentTargetType): AssignmentTab {
    if (isRoleTabSelection(type)) return "role";
    return type as AssignmentTab;
}

export function AssignmentTargetSelector({
    users,
    departments,
    roles,
    permissionGroups,
    allowUser,
    allowDepartment,
    allowRole,
    isLoading = false,
    disabled = false,
    value,
    onChange,
    className,
}: AssignmentTargetSelectorProps) {
    const visibleTabs = useMemo(() => {
        const tabs: AssignmentTab[] = [];
        if (allowDepartment) tabs.push("department");
        if (allowUser) tabs.push("user");
        if (allowRole) tabs.push("role");
        return tabs;
    }, [allowDepartment, allowUser, allowRole]);

    const [activeTab, setActiveTab] = useState<AssignmentTab>(
        getDefaultTab(allowDepartment, allowUser, allowRole)
    );

    useEffect(() => {
        if (value?.type && visibleTabs.includes(selectionToTab(value.type))) {
            setActiveTab(selectionToTab(value.type));
            return;
        }
        if (!visibleTabs.includes(activeTab)) {
            setActiveTab(visibleTabs[0] ?? "department");
        }
    }, [value?.type, visibleTabs, activeTab]);

    function handleTabChange(tab: string) {
        const nextTab = tab as AssignmentTab;
        setActiveTab(nextTab);
        onChange(createEmptySelection(nextTab === "role" ? "role" : nextTab));
    }

    function handleSelect(type: AssignmentTargetType, id: string) {
        onChange(selectionFromIds(type, id));
    }

    if (visibleTabs.length === 0) {
        return (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-gray-500">
                No assignment target types are available for this scope.
            </div>
        );
    }

    const selectedId =
        value && selectionToTab(value.type) === activeTab ? getSelectionId(value) : null;

    if (visibleTabs.length === 1) {
        const onlyTab = visibleTabs[0];
        return (
            <div className={cn("space-y-3", className)}>
                {onlyTab === "department" ? (
                    <AssignmentDepartmentsPanel
                        departments={departments}
                        selectedId={value?.type === "department" ? value.internalStructureId : null}
                        onSelect={(id) => handleSelect("department", id)}
                        isLoading={isLoading}
                        disabled={disabled}
                    />
                ) : null}
                {onlyTab === "user" ? (
                    <AssignmentUsersPanel
                        users={users}
                        selectedId={value?.type === "user" ? value.userId : null}
                        onSelect={(id) => handleSelect("user", id)}
                        isLoading={isLoading}
                        disabled={disabled}
                    />
                ) : null}
                {onlyTab === "role" ? (
                    <AssignmentRolesPanel
                        roles={roles}
                        permissionGroups={permissionGroups}
                        selectedRoleId={value?.type === "role" ? value.roleId : null}
                        selectedPermissionGroupId={
                            value?.type === "permission_group" ? value.permissionGroupId : null
                        }
                        onSelectRole={(id) => handleSelect("role", id)}
                        onSelectPermissionGroup={(id) => handleSelect("permission_group", id)}
                        isLoading={isLoading}
                        disabled={disabled}
                    />
                ) : null}
            </div>
        );
    }

    const tabItems = useMemo(() => {
        const items: { value: AssignmentTab; label: string; icon: ReactNode }[] = [];
        if (allowDepartment) {
            items.push({
                value: "department",
                label: "Departments",
                icon: <Building className="h-4 w-4" />,
            });
        }
        if (allowUser) {
            items.push({
                value: "user",
                label: "Users",
                icon: <UserIcon className="h-4 w-4" />,
            });
        }
        if (allowRole) {
            items.push({
                value: "role",
                label: "Roles & Groups",
                icon: <Shield className="h-4 w-4" />,
            });
        }
        return items;
    }, [allowDepartment, allowUser, allowRole]);

    return (
        <div className={cn("w-full space-y-4", className)}>
            <TableTabBar
                tabs={tabItems}
                value={activeTab}
                onChange={(tab) => handleTabChange(tab)}
                className="w-full"
            />

            {allowDepartment && activeTab === "department" ? (
                <AssignmentDepartmentsPanel
                    departments={departments}
                    selectedId={activeTab === "department" ? selectedId : null}
                    onSelect={(id) => handleSelect("department", id)}
                    isLoading={isLoading}
                    disabled={disabled}
                />
            ) : null}

            {allowUser && activeTab === "user" ? (
                <AssignmentUsersPanel
                    users={users}
                    selectedId={activeTab === "user" ? selectedId : null}
                    onSelect={(id) => handleSelect("user", id)}
                    isLoading={isLoading}
                    disabled={disabled}
                />
            ) : null}

            {allowRole && activeTab === "role" ? (
                <AssignmentRolesPanel
                    roles={roles}
                    permissionGroups={permissionGroups}
                    selectedRoleId={value?.type === "role" ? value.roleId : null}
                    selectedPermissionGroupId={
                        value?.type === "permission_group" ? value.permissionGroupId : null
                    }
                    onSelectRole={(id) => handleSelect("role", id)}
                    onSelectPermissionGroup={(id) => handleSelect("permission_group", id)}
                    isLoading={isLoading}
                    disabled={disabled}
                />
            ) : null}
        </div>
    );
}
