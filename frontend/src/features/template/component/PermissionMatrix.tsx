import React, { type JSX } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Users,
  Shield,
  Folder,
  BarChart3,
  Settings,
  Home,
  AlertCircle,
  Layers,
  Building,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  ResourceGroup,
  PermissionMatrix as PermissionMatrixType,
} from "../types/role";

interface PermissionMatrixProps {
  loadingPermissions: boolean;
  resourceGroups: ResourceGroup[];
  expandedResource: string | null;
  permissionMatrix: PermissionMatrixType;
  toggleResource: (resource: string) => void;
  togglePermission: (resource: string, action: string) => void;
  selectAllInResource: (resource: string, select: boolean) => void;
  selectAllGlobally: (select: boolean) => void;
  getResourceSelectionStatus: (resource: string) => string;
  getSelectionStatusText: (status: string) => string;
  getSelectionStatusClass: (status: string) => string;
  getSelectedPermissionsCount: () => number;
  getTotalPermissionsCount: () => number;
  readOnly?: boolean;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  loadingPermissions,
  resourceGroups,
  expandedResource,
  permissionMatrix,
  toggleResource,
  togglePermission,
  selectAllInResource,
  selectAllGlobally,
  getResourceSelectionStatus,
  getSelectionStatusText,
  getSelectionStatusClass,
  getSelectedPermissionsCount,
  getTotalPermissionsCount,
  readOnly = false,
}) => {
  const resourceIcons: { [key: string]: JSX.Element } = {
    dashboard: <Home className="h-4 w-4" />,
    users: <Users className="h-4 w-4" />,
    roles: <Shield className="h-4 w-4" />,
    projects: <Folder className="h-4 w-4" />,
    issues: <AlertCircle className="h-4 w-4" />,
    issue_categories: <Layers className="h-4 w-4" />,
    issue_flows: <BarChart3 className="h-4 w-4" />,
    issue_priorities: <AlertCircle className="h-4 w-4" />,
    human_resources: <Users className="h-4 w-4" />,
    organization_structures: <Building className="h-4 w-4" />,
    organizations: <Building className="h-4 w-4" />,
    permissions: <Shield className="h-4 w-4" />,
    system: <Settings className="h-4 w-4" />,
  };

  if (loadingPermissions) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border p-6">
          <h3 className="text-xl font-bold text-primary">Permission Matrix</h3>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (resourceGroups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border p-6">
          <h3 className="text-xl font-bold text-primary">Permission Matrix</h3>
        </div>
        <div className="p-8 text-center text-muted-foreground">No permissions available</div>
      </div>
    );
  }

  const totalPermissions = getTotalPermissionsCount();
  const selectedPermissions = getSelectedPermissionsCount();
  const globalSelectionStatus =
    totalPermissions === 0
      ? "none"
      : selectedPermissions === totalPermissions
        ? "all"
        : selectedPermissions > 0
          ? "some"
          : "none";
  const isAllGloballySelected = globalSelectionStatus === "all";

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="space-y-4 border-b border-border p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-primary">Permission Matrix</h3>
          <div className="flex items-center space-x-2 text-sm text-primary">
            <span>Selected:</span>
            <span className="font-semibold">{selectedPermissions}</span>
            <span>/</span>
            <span>{totalPermissions}</span>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Select all permissions</p>
            <p className="text-xs text-muted-foreground">
              Toggle every permission across all sections
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`rounded-full border px-2 py-1 text-xs font-medium text-primary ${getSelectionStatusClass(
                globalSelectionStatus
              )}`}
            >
              {getSelectionStatusText(globalSelectionStatus)}
            </span>
            <Switch
              checked={isAllGloballySelected}
              onCheckedChange={readOnly ? undefined : selectAllGlobally}
              disabled={readOnly}
              aria-label={
                isAllGloballySelected
                  ? "Deselect all permissions"
                  : "Select all permissions"
              }
            />
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {resourceGroups.map((group) => {
            const selectionStatus = getResourceSelectionStatus(group.resource);
            const isExpanded = expandedResource === group.resource;
            const isAllSelected = selectionStatus === "all";

            return (
              <div
                key={group.resource}
                className="self-start rounded-lg border border-border"
              >
                <div
                  onClick={() => toggleResource(group.resource)}
                  className="flex cursor-pointer items-center justify-between rounded-t-lg bg-muted/40 p-4 transition-all duration-200 hover:bg-primary/10"
                >
                  <div className="flex flex-1 items-center space-x-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleResource(group.resource);
                      }}
                      className="rounded p-1 hover:bg-muted"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-primary" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-primary" />
                      )}
                    </button>
                    <div className="rounded-lg bg-card p-2 text-primary shadow-sm">
                      {resourceIcons[group.resource] || <Shield className="h-4 w-4" />}
                    </div>
                    <div>
                      <h3 className="font-semibold capitalize text-primary">
                        {group.resource.replace(/_/g, " ")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {group.permissions.length} permissions available
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-medium text-primary ${getSelectionStatusClass(
                        selectionStatus
                      )}`}
                    >
                      {getSelectionStatusText(selectionStatus)}
                    </span>
                    <Switch
                      checked={isAllSelected}
                      onCheckedChange={
                        readOnly
                          ? undefined
                          : (checked) => selectAllInResource(group.resource, checked)
                      }
                      disabled={readOnly}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={
                        isAllSelected
                          ? `Deselect all ${group.resource} permissions`
                          : `Select all ${group.resource} permissions`
                      }
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-b-lg border-t border-border bg-card p-4">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          {group.permissions.map((permission) => {
                            const isChecked =
                              permissionMatrix[group.resource]?.[permission.action] ||
                              false;

                            return (
                              <label
                                key={permission.permission_id}
                                className={`flex w-full items-center space-x-3 rounded-lg border border-border p-3 transition-colors duration-150 ${
                                  readOnly
                                    ? "cursor-default"
                                    : "cursor-pointer hover:bg-muted/40"
                                }`}
                              >
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={readOnly}
                                    onChange={() => {
                                      if (!readOnly) {
                                        togglePermission(group.resource, permission.action);
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200 ${
                                      isChecked
                                        ? "border-primary bg-primary"
                                        : "border-primary"
                                    }`}
                                  >
                                    {isChecked && (
                                      <Check className="h-3 w-3 text-primary-foreground" />
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm font-medium capitalize text-foreground">
                                  {permission.action.replace(/_/g, " ")}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
