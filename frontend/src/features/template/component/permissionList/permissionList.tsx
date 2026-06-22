"use client";

import React, { useEffect, useState, useMemo, useCallback, JSX } from "react";
import {
  Shield,
  Users,
  Folder,
  BarChart3,
  Settings,
  Home,
  Users as UsersIcon,
  Briefcase,
  AlertCircle,
  Building,
  Layers,
  Search,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useGetPermissionsQuery,
  useTogglePermissionMutation,
} from "@/redux/api/permissionApi";
import {
  Permission,
  PermissionStats,
  ResourceGroup,
  ResourceIcons,
} from "../../types/permission";
import { PermissionHeader } from "./Header";
import { PermissionStats as StatsComponent } from "./Stats";
import { ResourceGroup as ResourceGroupComponent } from "./ResourceGroup";
import { EmptyState } from "./EmptyState";
import { PermissionSkeleton } from "./Skeleton";

export default function PermissionList() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  const {
    data: apiResponse,
    isLoading,
    isError,
    refetch,
  } = useGetPermissionsQuery();

  const [togglePermissionMutation, { isLoading: isToggling }] =
    useTogglePermissionMutation();

  // Resource icons mapping
  const resourceIcons: ResourceIcons = {
    dashboard: <Home className="h-4 w-4" />,
    users: <UsersIcon className="h-4 w-4" />,
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

  // Calculate statistics
  const stats: PermissionStats = useMemo(
    () => ({
      total: permissions.length,
      active: permissions.filter((p) => p.is_active).length,
      inactive: permissions.filter((p) => !p.is_active).length,
    }),
    [permissions]
  );

  const togglePermission = useCallback(
    async (id: string) => {
      try {
        await togglePermissionMutation(id).unwrap();
      } catch (err) {
        console.error("Toggle permission failed", err);
      }
    },
    [togglePermissionMutation]
  );

  // Process API data
  useEffect(() => {
    if (!isError && !isLoading && apiResponse) {
      console.log("apiResponse: ", apiResponse);
      // The API returns { success, message, data }
      // We need to extract the data array
      setPermissions(apiResponse || []);
    }
  }, [apiResponse, isError, isLoading]);

  // Group permissions by resource
  const resourceGroups = useMemo(() => {
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return Object.entries(grouped).map(([resource, permissions]) => {
      const activeCount = permissions.filter((p) => p.is_active).length;
      return {
        resource,
        icon: resourceIcons[resource] || <Shield className="h-4 w-4" />,
        permissions,
        isExpanded: expandedResource === resource,
        activeCount,
        totalCount: permissions.length,
      };
    });
  }, [permissions, expandedResource, resourceIcons]);

  // Filtered resource groups with search
  const filteredResourceGroups = useMemo(() => {
    let filtered = resourceGroups;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.resource.toLowerCase().includes(query) ||
          group.permissions.some((p) => p.action.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [resourceGroups, searchQuery]);

  const toggleResourceExpand = useCallback((resource: string) => {
    setExpandedResource((prev) => {
      // If clicking the same resource, collapse it
      if (prev === resource) {
        return null;
      }
      // Otherwise, expand the new resource (this automatically collapses the previous one)
      return resource;
    });
  }, []);

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="w-full p-4">
        <PermissionSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full p-4">
        <EmptyState
          title="Unable to load permissions"
          description="There was an error loading the permissions data. Please try again."
          action={
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center bg-white rounded-lg">
      <div className="w-full">
        <PermissionHeader />

        {/* Statistics */}
        <div className="mb-6">
          <StatsComponent stats={stats} />
        </div>

        {/* Permissions Accordion */}
        <div className="w-full bg-white border border-gray-200 rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-primary">
                  Permissions List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {permissions.length} total permissions • {stats.active} active
                  • {stats.inactive} inactive
                </p>
              </div>
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-primary" />
                <Input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input py-2 pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary md:w-64"
                />
              </div>
            </div>
          </div>
          <div className="p-6">
            {filteredResourceGroups.length === 0 ? (
              <EmptyState
                title="No permissions found"
                description={
                  searchQuery
                    ? "Try adjusting your search criteria."
                    : "No permissions have been configured yet."
                }
                action={
                  searchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                      }}
                    >
                      Clear search
                    </Button>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {filteredResourceGroups.map((group) => (
                  <ResourceGroupComponent
                    key={group.resource}
                    group={group}
                    onToggle={togglePermission}
                    isToggling={isToggling}
                    onToggleExpand={toggleResourceExpand}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
