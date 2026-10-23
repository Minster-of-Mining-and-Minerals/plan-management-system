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
import { MapPin, Building2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { CreateRoleHeader } from "./Header";
import { BasicInfo } from "./BasicInfo";
import { PermissionMatrix as PermissionMatrixComponent } from "./PermissionMatrix";
import { FooterActions } from "./FooterActions";
import { RoleFormSkeleton } from "./Skeleton";
import { ErrorState } from "./ErrorState";

export default function CreateRole({
  roleId,
  backPath,
  forceRegional = false,
  forceCompany = false,
}: {
  roleId?: string;
  backPath?: string;
  forceRegional?: boolean;
  forceCompany?: boolean;
}) {
  const { id: paramId } = useParams<{ id?: string }>();
  const router = useRouter();
  const { data: session } = useSession();
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

  const scopeParam = searchParams.get("scope");
  const isCompanyRole =
    forceCompany ||
    roleResponse?.scope === "company" ||
    scopeParam === "company";

  const isRegionalRole =
    !isCompanyRole &&
    (forceRegional ||
      roleResponse?.scope === "regional" ||
      scopeParam === "regional");

  const editingSystemRole =
    isEditMode &&
    (roleResponse?.scope === "global" || roleResponse?.scope === "private");

  const permissionQueryArgs =
    isCompanyRole
      ? { scope: "company" as const }
      : isRegionalRole
      ? { scope: "regional" as const }
      : isSuperAdmin && (!structureId || editingSystemRole)
        ? { scope: "system" as const, tier: "standard" as const }
        : structureId
          ? { government_structure_id: structureId, tier: "standard" as const }
          : undefined;

  const { data: permissionsResponse, isLoading: loadingPermissions } =
    useGetPermissionsQuery(permissionQueryArgs, {
      skip: !permissionQueryArgs,
    });

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

  const isLoading = isCreating || isUpdating;

  // Group permissions by resource with strict domain separation
  const resourceGroups = useMemo((): ResourceGroup[] => {
    if (!permissionsResponse) return [];

    const isRegionalResource = (resource: string) => {
      const r = (resource || "").toLowerCase();
      return r.startsWith("regional_") || r === "regions";
    };

    const isCompanyResource = (resource: string) => {
      const r = (resource || "").toLowerCase();
      return r.startsWith("company_") || r === "companies";
    };

    const activePermissions = (permissionsResponse || []).filter(
      (p: Permission) => {
        if (p.is_active !== true) return false;
        if (isCompanyRole) {
          return isCompanyResource(p.resource);
        }
        if (isRegionalRole) {
          return isRegionalResource(p.resource);
        }
        return !isRegionalResource(p.resource) && !isCompanyResource(p.resource);
      }
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
  }, [permissionsResponse, isRegionalRole, isCompanyRole]);

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

    if (!isEditMode && !structureId && !isRegionalRole && !isCompanyRole) {
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
        router.push(
          backPath ||
            (isCompanyRole
              ? "/users/roles?tab=company"
              : isRegionalRole
              ? "/users/roles?tab=regional"
              : rolesListPath)
        );
      } else {
        await createRole({
          name: name.trim(),
          description: description.trim(),
          permission_ids: selectedPermissionIds,
          ...(isCompanyRole
            ? {
                scope: "company" as any,
                company_id: session?.user?.company_id || undefined,
              }
            : isRegionalRole
            ? {
                scope: "regional" as any,
                region_id: session?.user?.region_id || undefined,
              }
            : { government_structure_id: structureId }),
        }).unwrap();

        actionFeedback.success("Role created successfully!");
        resetForm();
        router.push(
          backPath ||
            (isCompanyRole
              ? "/users/roles?tab=company"
              : isRegionalRole
              ? "/users/roles?tab=regional"
              : rolesListPath)
        );
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
            {isRegionalRole && (
              <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-900/50 p-4 text-xs text-indigo-900 dark:text-indigo-200">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="font-semibold text-indigo-950 dark:text-indigo-100">
                    Regional Role Scope
                  </p>
                  <p className="mt-0.5 text-indigo-800/90 dark:text-indigo-300/80">
                    This role is strictly restricted to Regional Security Permissions. System and federal governance permissions are decoupled and excluded from assignment.
                  </p>
                </div>
              </div>
            )}

            {isCompanyRole && (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-900/50 p-4 text-xs text-emerald-900 dark:text-emerald-200">
                <Building2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                    Company Role Scope
                  </p>
                  <p className="mt-0.5 text-emerald-800/90 dark:text-emerald-300/80">
                    This role is strictly restricted to Company Security Permissions. System, regional, and federal governance permissions are decoupled and excluded from assignment.
                  </p>
                </div>
              </div>
            )}

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
            onCancel={backPath ? () => router.push(backPath) : undefined}
          />
        </form>
      </div>
    </div>
  );
}
