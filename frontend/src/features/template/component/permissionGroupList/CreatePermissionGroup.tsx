"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { Permission, ResourceGroup, PermissionMatrix } from "../../types/role";
import { useGetPermissionsQuery } from "@/redux/api/permissionApi";
import {
  useCreatePermissionGroupMutation,
  useGetPermissionGroupByIdQuery,
  useUpdatePermissionGroupMutation,
} from "@/redux/api/permissionGroupApi";
import { CreatePermissionGroupHeader } from "./Header";
import { BasicInfo } from "./BasicInfo";
import { PermissionMatrix as PermissionMatrixComponent } from "./PermissionMatrix";
import { FooterActions } from "./FooterActions";
import { PermissionGroupFormSkeleton } from "./Skeleton";
import { ErrorState } from "./ErrorState";
import GroupManagement from "./GroupManagement";
import { governmentStructureDetailPath } from "@/utils/structureQueryUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { useStructureScope } from "@/hooks/useStructureScope";
import type { GetPermissionsParams } from "@/redux/api/permissionApi";
import {
  PermissionGroupSectionConfig,
  STANDARD_PERMISSION_GROUP_CONFIG,
} from "./permissionGroupSectionConfig";
import { SpecialPermissionGroupGuidance } from "./SpecialPermissionGroupGuidance";

export default function CreatePermissionGroup({
  groupId,
  config = STANDARD_PERMISSION_GROUP_CONFIG,
}: {
  groupId?: string;
  config?: PermissionGroupSectionConfig;
}) {
  const { id: paramId } = useParams<{ id?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSuperAdmin, structureId: sessionStructureId } = useStructureScope();
  const { can } = usePermissions();
  const id = groupId || paramId;
  const isEditMode = Boolean(id && id !== "create" && id !== "new");
  const structureId =
    searchParams.get("government_structure_id") || sessionStructureId || undefined;
  const forceViewMode = searchParams.get("mode") === "view";
  const canUpdateGroups = can(config.updatePermission);
  const isViewOnly = forceViewMode || (isEditMode && !canUpdateGroups);
  const cancelHref = structureId
    ? governmentStructureDetailPath(structureId)
    : config.basePath;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(
    {}
  );

  const permissionTier = config.groupKind === "special" ? "special" : "standard";

  const permissionQueryArgs = useMemo((): GetPermissionsParams | undefined => {
    const base: GetPermissionsParams = { tier: permissionTier };
    if (structureId) {
      return { ...base, government_structure_id: structureId };
    }
    if (isSuperAdmin) {
      return { ...base, scope: "all" };
    }
    if (sessionStructureId) {
      return { ...base, government_structure_id: sessionStructureId };
    }
    return base;
  }, [permissionTier, structureId, isSuperAdmin, sessionStructureId]);

  const { data: permissionsResponse, isLoading: loadingPermissions } =
    useGetPermissionsQuery(permissionQueryArgs);

  const {
    data: group,
    isLoading: loadingGroup,
    isError: groupError,
    refetch: refetchGroup,
  } = useGetPermissionGroupByIdQuery(
    structureId
      ? { id: id as string, government_structure_id: structureId }
      : (id as string),
    { skip: !isEditMode }
  );

  const [createGroup, { isLoading: isCreating }] = useCreatePermissionGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdatePermissionGroupMutation();

  const isLoading = isCreating || isUpdating;

  // Group permissions by resource (tier-filtered by API; keep a client guard too)
  const resourceGroups = useMemo((): ResourceGroup[] => {
    if (!permissionsResponse) return [];

    const activePermissions = permissionsResponse.filter((p: Permission & { permission_tier?: string }) => {
      if (p.is_active !== true) return false;
      const tier = (p.permission_tier || "standard").toLowerCase();
      return config.groupKind === "special" ? tier === "special" : tier === "standard";
    });

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
  }, [permissionsResponse, config.groupKind]);

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
    if (isViewOnly) return;

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
            government_structure_id: structureId,
          },
        }).unwrap();

        actionFeedback.success("Permission group updated successfully!");
        router.push(cancelHref);
      } else {
        await createGroup({
          name: name.trim(),
          description: description.trim(),
          permission_ids: selectedPermissionIds,
          group_kind: config.groupKind,
        }).unwrap();

        actionFeedback.success(
          config.groupKind === "special"
            ? "Special permission group created successfully!"
            : "Permission group created successfully!"
        );
        resetForm();
        router.push(config.basePath);
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
        <CreatePermissionGroupHeader
          isEditMode={isEditMode}
          isViewOnly={isViewOnly}
          title={
            isViewOnly
              ? config.viewTitle
              : isEditMode
                ? config.editTitle
                : config.createTitle
          }
          description={
            config.groupKind === "special"
              ? "Special permissions only — used for governance actions such as sector plan hierarchy oversight"
              : undefined
          }
        />

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex-1 overflow-y-auto py-5 space-y-6">
            <BasicInfo
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              readOnly={isViewOnly}
            />

            {config.groupKind === "special" && <SpecialPermissionGroupGuidance />}

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
              readOnly={isViewOnly}
            />
          </div>

          <FooterActions
            isLoading={isLoading}
            isEditMode={isEditMode}
            isViewOnly={isViewOnly}
            name={name}
            selectedPermissionsCount={getSelectedPermissionsCount()}
            cancelHref={cancelHref}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e as any);
            }}
          />
        </form>
        <GroupManagement
          groupId={isEditMode ? id : undefined}
          readOnly={isViewOnly}
          config={config}
        />
      </div>
    </div>
  );
}
