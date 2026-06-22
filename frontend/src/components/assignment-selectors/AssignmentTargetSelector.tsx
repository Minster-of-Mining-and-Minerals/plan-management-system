"use client";

import { useEffect, useMemo, useState } from "react";
import { Building, Shield, User as UserIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

    return (
        <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className={cn("w-full", className)}
        >
            <TabsList
                className={cn(
                    "grid h-auto w-full",
                    visibleTabs.length === 2 ? "grid-cols-2" : "grid-cols-3"
                )}
            >
                {allowDepartment ? (
                    <TabsTrigger value="department" className="gap-1.5 py-2">
                        <Building className="h-4 w-4 shrink-0" />
                        Departments
                    </TabsTrigger>
                ) : null}
                {allowUser ? (
                    <TabsTrigger value="user" className="gap-1.5 py-2">
                        <UserIcon className="h-4 w-4 shrink-0" />
                        Users
                    </TabsTrigger>
                ) : null}
                {allowRole ? (
                    <TabsTrigger value="role" className="gap-1.5 py-2">
                        <Shield className="h-4 w-4 shrink-0" />
                        Roles & Groups
                    </TabsTrigger>
                ) : null}
            </TabsList>

            {allowDepartment ? (
                <TabsContent value="department" className="mt-4">
                    <AssignmentDepartmentsPanel
                        departments={departments}
                        selectedId={activeTab === "department" ? selectedId : null}
                        onSelect={(id) => handleSelect("department", id)}
                        isLoading={isLoading}
                        disabled={disabled}
                    />
                </TabsContent>
            ) : null}

            {allowUser ? (
                <TabsContent value="user" className="mt-4">
                    <AssignmentUsersPanel
                        users={users}
                        selectedId={activeTab === "user" ? selectedId : null}
                        onSelect={(id) => handleSelect("user", id)}
                        isLoading={isLoading}
                        disabled={disabled}
                    />
                </TabsContent>
            ) : null}

            {allowRole ? (
                <TabsContent value="role" className="mt-4">
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
                </TabsContent>
            ) : null}
        </Tabs>
    );
}
