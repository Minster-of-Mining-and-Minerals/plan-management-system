"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { Permission, ResourceGroup, PermissionMatrix } from "../../types/role";
import { useGetPermissionsQuery } from "@/redux/api/permissionApi";
import {
  useCreateRoleMutation,
  useGetRoleByIdQuery,
  useUpdateRoleMutation,
} from "@/redux/api/roleApi";
import { CreateRoleHeader } from "./Header";
import { BasicInfo } from "./BasicInfo";
import { PermissionMatrix as PermissionMatrixComponent } from "./PermissionMatrix";
import { FooterActions } from "./FooterActions";
import { RoleFormSkeleton } from "./Skeleton";
import { ErrorState } from "./ErrorState";

export default function CreateRole({ roleId }: { roleId?: string }) {
  const { id: paramId } = useParams<{ id?: string }>();
  const router = useRouter();
  const id = roleId || paramId;
  const isEditMode = Boolean(id && id !== "create" && id !== "new");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roleType, setRoleType] = useState("");
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(
    {}
  );

  // RTK Queries
  const { data: permissionsResponse, isLoading: loadingPermissions } =
    useGetPermissionsQuery();

  const {
    data: roleResponse,
    isLoading: loadingRole,
    isError: roleError,
    refetch: refetchRole,
  } = useGetRoleByIdQuery(id!, { skip: !isEditMode });

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

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
    const matrix: PermissionMatrix = {};
    resourceGroups.forEach((group) => {
      matrix[group.resource] = {};
      group.permissions.forEach((permission) => {
        matrix[group.resource][permission.action] = false;
      });
    });
    setPermissionMatrix(matrix);
  }, [resourceGroups]);

  // Populate form when role data is loaded (edit mode)
  useEffect(() => {
    if (isEditMode && roleResponse && resourceGroups.length > 0) {
      const role = roleResponse;
      // Set name and description
      setName(role.name || "");
      setDescription("");
      // setRoleType(type);

      const rolePermissions = role.permissions ?? [];

      // Populate permission matrix with existing permissions
      if (rolePermissions.length > 0) {
        const matrix: PermissionMatrix = {};

        // Initialize all to false first
        resourceGroups.forEach((group) => {
          matrix[group.resource] = {};
          group.permissions.forEach((permission) => {
            matrix[group.resource][permission.action] = false;
          });
        });

        // Set selected permissions to true
        rolePermissions.forEach((permission) => {
          if (permission) {
            const permissionId = permission.permission_id;
            const matched = resourceGroups
              .flatMap((g) => g.permissions)
              .find((p) => p.permission_id === permissionId);

            if (matched) {
              if (!matrix[matched.resource]) {
                matrix[matched.resource] = {};
              }
              matrix[matched.resource][matched.action] = true;
            }
          }
        });

        setPermissionMatrix(matrix);
      }
    }
  }, [isEditMode, roleResponse, resourceGroups]);

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
        return "bg-green-100 text-green-800 border-green-200";
      case "some":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
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
    e.preventDefault();

    if (!name.trim()) {
      actionFeedback.error("Role name is required");
      return;
    }

    const selectedPermissionIds = getSelectedPermissions();

    if (selectedPermissionIds.length === 0) {
      actionFeedback.error("Please select at least one permission");
      return;
    }

    try {
      if (isEditMode) {
        await updateRole({
          id: id!,
          data: {
            name: name.trim(),
            description: description.trim(),
            permission_ids: selectedPermissionIds,
          },
        }).unwrap();

        actionFeedback.success("Role updated successfully!");
        router.push("/users/roles");
      } else {
        await createRole({
          name: name.trim(),
          description: description.trim(),
          permission_ids: selectedPermissionIds,
        }).unwrap();

        actionFeedback.success("Role created successfully!");
        resetForm();
        router.push("/users/roles");
      }
    } catch (error: any) {
      actionFeedback.error(
        error?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} role`
      );
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setRoleType("");
    setPermissionMatrix({});
    setExpandedResource(null);
  };

  // Show loading state while fetching role data
  if (isEditMode && loadingRole) {
    return <RoleFormSkeleton />;
  }

  // Show error state if role not found
  if (isEditMode && roleError) {
    return <ErrorState message="Role not found" onRetry={refetchRole} />;
  }

  return (
    <div className="w-full flex items-center justify-center bg-white rounded-lg p-4">
      <div className="w-full" onClick={(e) => e.stopPropagation()}>
        <CreateRoleHeader isEditMode={isEditMode} />

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex-1 overflow-y-auto py-5 space-y-6">
            {/* Basic Information */}
            <BasicInfo
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              roleType={roleType}
              setRoleType={setRoleType}
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
            onSubmit={() => handleSubmit}
          />
        </form>
      </div>
    </div>
  );
}
