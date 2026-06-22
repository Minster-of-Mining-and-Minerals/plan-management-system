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
import { useStructureScope } from "@/hooks/useStructureScope";
import { useSearchParams } from "next/navigation";
import { withStructureQuery } from "@/utils/structureQueryUtils";
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
  const searchParams = useSearchParams();
  const { isSuperAdmin, structureId: sessionStructureId } = useStructureScope();
  const structureId =
    searchParams.get("government_structure_id") || sessionStructureId || undefined;
  const rolesListPath = withStructureQuery("/users/roles", structureId);

  const {
    data: roleResponse,
    isLoading: loadingRole,
    isError: roleError,
    refetch: refetchRole,
  } = useGetRoleByIdQuery(id!, { skip: !isEditMode });

  const editingSystemRole =
    isEditMode &&
    (roleResponse?.scope === "global" || roleResponse?.scope === "private");

  const permissionQueryArgs =
    isSuperAdmin && (!structureId || editingSystemRole)
      ? { scope: "all" as const }
      : structureId
        ? { government_structure_id: structureId }
        : undefined;

  const { data: permissionsResponse, isLoading: loadingPermissions } =
    useGetPermissionsQuery(permissionQueryArgs, {
      skip: !permissionQueryArgs,
    });

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
      setDescription(role.description || "");

      const rolePermissions = (role.rolePermissions ?? [])
        .map((entry) => entry.permission)
        .filter(
          (permission): permission is { permission_id: string; resource: string; action: string } =>
            Boolean(permission?.permission_id)
        );

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

    if (!isEditMode && !structureId) {
      actionFeedback.error("Select a structure before creating a role.");
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
        router.push(rolesListPath);
      } else {
        await createRole({
          name: name.trim(),
          description: description.trim(),
          permission_ids: selectedPermissionIds,
          government_structure_id: structureId,
        }).unwrap();

        actionFeedback.success("Role created successfully!");
        resetForm();
        router.push(rolesListPath);
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
            onSubmit={() => handleSubmit}
          />
        </form>
      </div>
    </div>
  );
}
