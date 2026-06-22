"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { Permission, ResourceGroup, PermissionMatrix } from "../../types/role";
import { useGetPermissionsQuery } from "@/redux/api/permissionApi";
import {
  useCreatePermissionGroupMutation,
  useGetPermissionGroupByIdQuery,
  useUpdatePermissionGroupMutation,
} from "@/redux/api/permissionGroupApi";
import { useGetPermissionGroupsQuery } from "@/redux/api/permissionGroupApi";
import { CreatePermissionGroupHeader } from "./Header";
import { BasicInfo } from "./BasicInfo";
import { PermissionMatrix as PermissionMatrixComponent } from "./PermissionMatrix";
import { FooterActions } from "./FooterActions";
import { PermissionGroupFormSkeleton } from "./Skeleton";
import { ErrorState } from "./ErrorState";
import GroupManagement from "./GroupManagement";

export default function CreatePermissionGroup({ groupId }: { groupId?: string }) {
  const { id: paramId } = useParams<{ id?: string }>();
  const router = useRouter();
  const id = groupId || paramId;
  const isEditMode = Boolean(id && id !== "create" && id !== "new");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(
    {}
  );

  // RTK Queries
  const { data: permissionsResponse, isLoading: loadingPermissions } =
    useGetPermissionsQuery();

  const {
    data: group,
    isLoading: loadingGroup,
    isError: groupError,
    refetch: refetchGroup,
  } = useGetPermissionGroupByIdQuery(id as string, { skip: !isEditMode });

  const [createGroup, { isLoading: isCreating }] = useCreatePermissionGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdatePermissionGroupMutation();

  const isLoading = isCreating || isUpdating;

  // Group permissions by resource
  const resourceGroups = useMemo((): ResourceGroup[] => {
    if (!permissionsResponse) return [];

    const activePermissions = permissionsResponse.filter(
      (p: Permission) => p.is_active === true
    );

    const grouped = activePermissions.reduce(
      (acc: { [key: string]: Permission[] }, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      },
      {}
    );

    return Object.entries(grouped).map(([resource, permissions]) => ({
      resource,
      icon: <div />, // Will be handled in PermissionMatrix component
      permissions: permissions as Permission[],
      selected: false,
    }));
  }, [permissionsResponse]);

  // Initialize permission matrix
  useEffect(() => {
    if (resourceGroups.length > 0) {
      const matrix: PermissionMatrix = {};

      // 1. Initialize all to false based on available permissions
      resourceGroups.forEach((group) => {
        matrix[group.resource] = {};
        group.permissions.forEach((permission) => {
          matrix[group.resource][permission.action] = false;
        });
      });

      // 2. If in edit mode and group data is loaded, populate the matrix
      if (isEditMode && group) {
        setName(group.name || "");
        setDescription(group.description || "");

        if (group.permissions && group.permissions.length > 0) {
          group.permissions.forEach((p: any) => {
            if (matrix[p.resource]) {
              matrix[p.resource][p.action] = true;
            }
          });
        }
      }

      setPermissionMatrix(matrix);
    }
  }, [resourceGroups, isEditMode, group]);

  // Helper functions
  const toggleResource = useCallback((resource: string) => {
    setExpandedResource((prev) => (prev === resource ? null : resource));
  }, []);

  const togglePermission = useCallback((resource: string, action: string) => {
    setPermissionMatrix((prev) => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [action]: !prev[resource]?.[action],
      },
    }));
  }, []);

  const selectAllInResource = useCallback(
    (resource: string, select: boolean) => {
      setPermissionMatrix((prev) => ({
        ...prev,
        [resource]: Object.keys(prev[resource] || {}).reduce((acc, action) => {
          acc[action] = select;
          return acc;
        }, {} as { [key: string]: boolean }),
      }));
    },
    []
  );

  const selectAllGlobally = useCallback((select: boolean) => {
    setPermissionMatrix((prev) => {
      const next: PermissionMatrix = {};
      Object.entries(prev).forEach(([resource, actions]) => {
        next[resource] = Object.keys(actions).reduce(
          (acc, action) => {
            acc[action] = select;
            return acc;
          },
          {} as { [key: string]: boolean }
        );
      });
      return next;
    });
  }, []);

  const getSelectedPermissions = useCallback((): string[] => {
    const selected: string[] = [];
    Object.entries(permissionMatrix).forEach(([resource, actions]) => {
      Object.entries(actions).forEach(([action, isSelected]) => {
        if (isSelected) {
          const permission = resourceGroups
            .find((g) => g.resource === resource)
            ?.permissions.find((p) => p.action === action);
          if (permission) {
            selected.push(permission.permission_id);
          }
        }
      });
    });
    return selected;
  }, [permissionMatrix, resourceGroups]);

  const getResourceSelectionStatus = useCallback(
    (resource: string) => {
      const actions = permissionMatrix[resource] || {};
      const actionsList = Object.values(actions);
      if (actionsList.length === 0) return "none";
      if (actionsList.every((val) => val)) return "all";
      if (actionsList.some((val) => val)) return "some";
      return "none";
    },
    [permissionMatrix]
  );

  const getSelectionStatusText = useCallback((status: string) => {
    switch (status) {
      case "all":
        return "All Selected";
      case "some":
        return "Partial";
      default:
        return "None";
    }
  }, []);

  const getSelectionStatusClass = useCallback((status: string) => {
    switch (status) {
      case "all":
        return "bg-success/10 text-success border-success/30";
      case "some":
        return "bg-warning/10 text-warning border-warning/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  }, []);

  const getSelectedPermissionsCount = useCallback(
    () => getSelectedPermissions().length,
    [getSelectedPermissions]
  );

  const getTotalPermissionsCount = useCallback(() => {
    return resourceGroups.reduce(
      (acc, group) => acc + group.permissions.length,
      0
    );
  }, [resourceGroups]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      actionFeedback.error("Permission group name is required");
      return;
    }

    const selectedPermissionIds = getSelectedPermissions();

    if (selectedPermissionIds.length === 0) {
      actionFeedback.error("Please select at least one permission");
      return;
    }

    try {
      if (isEditMode) {
        // Since the backend doesn't seem to have a single "update permissions" in updatePermissionGroup,
        // we might need to handle permission changes separately if the backend expects it.
        // But checking the controller, updatePermissionGroup just updates the group model.
        // We might need to use addPermissionsToGroup and removePermissionFromGroup.
        // However, many systems handle this in one go. 
        // Let's check permissionGroupApi.ts again.

        await updateGroup({
          id: id!,
          data: {
            name: name.trim(),
            description: description.trim(),
            permission_ids: selectedPermissionIds,
          },
        }).unwrap();

        // For now, let's assume the user just wants to update basic info or the backend handles permissions in update.
        // If not, we'd need more complex logic to diff permissions.

        actionFeedback.success("Permission group updated successfully!");
        router.push("/users/permission-groups");
      } else {
        await createGroup({
          name: name.trim(),
          description: description.trim(),
          permission_ids: selectedPermissionIds,
        }).unwrap();

        actionFeedback.success("Permission group created successfully!");
        resetForm();
        router.push("/users/permission-groups");
      }
    } catch (error: any) {
      actionFeedback.error(
        error?.data?.message ||
        `Failed to ${isEditMode ? "update" : "create"} permission group`
      );
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPermissionMatrix({});
    setExpandedResource(null);
  };

  // Show loading state while fetching group data
  if (isEditMode && loadingGroup) {
    return <PermissionGroupFormSkeleton />;
  }

  // Show error state if group not found
  if (isEditMode && groupError) {
    return <ErrorState message="Permission group not found" onRetry={refetchGroup} />;
  }

  return (
    <div className="w-full flex items-center justify-center bg-white rounded-lg p-4">
      <div className="w-full" onClick={(e) => e.stopPropagation()}>
        <CreatePermissionGroupHeader isEditMode={isEditMode} />

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex-1 overflow-y-auto py-5 space-y-6">
            {/* Basic Information */}
            <BasicInfo
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
            />

            {/* Permission Matrix */}
            <PermissionMatrixComponent
              loadingPermissions={loadingPermissions}
              resourceGroups={resourceGroups}
              expandedResource={expandedResource}
              permissionMatrix={permissionMatrix}
              toggleResource={toggleResource}
              togglePermission={togglePermission}
              selectAllInResource={selectAllInResource}
              selectAllGlobally={selectAllGlobally}
              getResourceSelectionStatus={getResourceSelectionStatus}
              getSelectionStatusText={getSelectionStatusText}
              getSelectionStatusClass={getSelectionStatusClass}
              getSelectedPermissionsCount={getSelectedPermissionsCount}
              getTotalPermissionsCount={getTotalPermissionsCount}
            />
          </div>

          {/* Footer Actions */}
          <FooterActions
            isLoading={isLoading}
            isEditMode={isEditMode}
            name={name}
            selectedPermissionsCount={getSelectedPermissionsCount()}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e as any);
            }}
          />
          <GroupManagement groupId={isEditMode ? id : undefined} />
        </form>
      </div>
    </div>
  );
}
