"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  Users,
  Folder,
  BarChart3,
  Settings,
  Home,
  Users as UsersIcon,
  AlertCircle,
  Building,
  Layers,
  Search,
  RefreshCw,
  MapPin,
  LayoutDashboard,
  Building2,
  Users2,
  Paintbrush,
  Info,
  ClipboardCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function PermissionList({
  isRegionalOnly = false,
  isCompanyOnly = false,
  isPurchasingCenterOnly = false,
}: {
  isRegionalOnly?: boolean;
  isCompanyOnly?: boolean;
  isPurchasingCenterOnly?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = isPurchasingCenterOnly
    ? "purchasing_center"
    : isCompanyOnly
    ? "company"
    : isRegionalOnly
    ? "regional"
    : tabParam === "purchasing_center"
    ? "purchasing_center"
    : tabParam === "company"
    ? "company"
    : tabParam === "regional"
    ? "regional"
    : "system";

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    if (isPurchasingCenterOnly) return { scope: "purchasing_center" as const };
    if (isCompanyOnly) return { scope: "company" as const };
    if (isRegionalOnly) return { scope: "regional" as const };
    return undefined;
  }, [isRegionalOnly, isCompanyOnly, isPurchasingCenterOnly]);

  const {
    data: apiResponse,
    isLoading,
    isError,
    refetch,
  } = useGetPermissionsQuery(queryParams);

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
    regions: <MapPin className="h-4 w-4 text-indigo-500" />,
    regional_dashboard: <LayoutDashboard className="h-4 w-4 text-indigo-500" />,
    regional_structures: <Building2 className="h-4 w-4 text-indigo-500" />,
    regional_users: <Users2 className="h-4 w-4 text-indigo-500" />,
    regional_branding: <Paintbrush className="h-4 w-4 text-indigo-500" />,
    regional_roles: <Shield className="h-4 w-4 text-indigo-500" />,
    regional_permission_groups: <Users className="h-4 w-4 text-indigo-500" />,
    regional_permissions: <Shield className="h-4 w-4 text-indigo-500" />,
    companies: <Building2 className="h-4 w-4 text-emerald-500" />,
    company_dashboard: <LayoutDashboard className="h-4 w-4 text-emerald-500" />,
    company_structures: <Building className="h-4 w-4 text-emerald-500" />,
    company_users: <Users2 className="h-4 w-4 text-emerald-500" />,
    company_branding: <Paintbrush className="h-4 w-4 text-emerald-500" />,
    company_roles: <Shield className="h-4 w-4 text-emerald-500" />,
    company_permission_groups: <Users className="h-4 w-4 text-emerald-500" />,
    company_permissions: <Shield className="h-4 w-4 text-emerald-500" />,
    purchasing_centers: <Building2 className="h-4 w-4 text-amber-500" />,
    purchasing_center_dashboard: <LayoutDashboard className="h-4 w-4 text-amber-500" />,
    purchasing_center_users: <Users2 className="h-4 w-4 text-amber-500" />,
    purchasing_center_branding: <Paintbrush className="h-4 w-4 text-amber-500" />,
    purchasing_center_roles: <Shield className="h-4 w-4 text-amber-500" />,
    purchasing_center_permission_groups: <Users className="h-4 w-4 text-amber-500" />,
    purchasing_center_permissions: <Shield className="h-4 w-4 text-amber-500" />,
    inspection_analytics: <ClipboardCheck className="h-4 w-4 text-teal-600" />,
  };

  const isPurchasingCenterResource = (resource: string) => {
    const r = resource.toLowerCase();
    return r.startsWith("purchasing_center") || r === "purchasing_centers";
  };

  const isRegionalResource = (resource: string) => {
    const r = resource.toLowerCase();
    return r.startsWith("regional_") || r === "regions";
  };

  const isCompanyResource = (resource: string) => {
    const r = resource.toLowerCase();
    return r.startsWith("company_") || r === "companies";
  };

  // Divide permissions into System vs Regional vs Company vs Purchasing Center
  const { systemPermissions, regionalPermissions, companyPermissions, purchasingCenterPermissions } = useMemo(() => {
    const system: Permission[] = [];
    const regional: Permission[] = [];
    const company: Permission[] = [];
    const purchasingCenter: Permission[] = [];

    for (const p of permissions) {
      if (isPurchasingCenterResource(p.resource)) {
        purchasingCenter.push(p);
      } else if (isCompanyResource(p.resource)) {
        company.push(p);
      } else if (isRegionalResource(p.resource)) {
        regional.push(p);
      } else {
        system.push(p);
      }
    }
    return { systemPermissions: system, regionalPermissions: regional, companyPermissions: company, purchasingCenterPermissions: purchasingCenter };
  }, [permissions]);

  const currentPermissions = isPurchasingCenterOnly
    ? permissions.filter((p) => isPurchasingCenterResource(p.resource))
    : isCompanyOnly
    ? permissions.filter((p) => isCompanyResource(p.resource))
    : isRegionalOnly
    ? permissions.filter((p) => isRegionalResource(p.resource))
    : activeTab === "purchasing_center"
    ? purchasingCenterPermissions
    : activeTab === "company"
    ? companyPermissions
    : activeTab === "regional"
    ? regionalPermissions
    : systemPermissions;

  // Calculate statistics for the active tab
  const stats: PermissionStats = useMemo(
    () => ({
      total: currentPermissions.length,
      active: currentPermissions.filter((p) => p.is_active).length,
      inactive: currentPermissions.filter((p) => !p.is_active).length,
    }),
    [currentPermissions]
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
      setPermissions(apiResponse || []);
    }
  }, [apiResponse, isError, isLoading]);

  // Group permissions by resource for current tab
  const resourceGroups = useMemo(() => {
    const grouped = currentPermissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return Object.entries(grouped).map(([resource, perms]) => {
      const activeCount = perms.filter((p) => p.is_active).length;
      return {
        resource,
        icon: resourceIcons[resource] || <Shield className="h-4 w-4" />,
        permissions: perms,
        isExpanded: expandedResource === resource,
        activeCount,
        totalCount: perms.length,
      };
    });
  }, [currentPermissions, expandedResource, resourceIcons]);

  // Filtered resource groups with search
  const filteredResourceGroups = useMemo(() => {
    let filtered = resourceGroups;

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
    setExpandedResource((prev) => (prev === resource ? null : resource));
  }, []);

  const handleRefresh = () => {
    refetch();
  };

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "regional" || val === "company") {
      params.set("tab", val);
    } else {
      params.delete("tab");
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/users/permissions${query}`);
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
    <div className="w-full space-y-6">
      <div className="w-full bg-white dark:bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <PermissionHeader
          title={
            isCompanyOnly
              ? "Company Permission Management"
              : isRegionalOnly
              ? "Regional Permission Management"
              : "Permission Management"
          }
          description={
            isCompanyOnly
              ? "View and manage permissions applicable to company operations and workspace access"
              : isRegionalOnly
              ? "View and manage permissions applicable to regional operations and security"
              : "Manage and configure system permissions"
          }
        />

        <div className="p-6 space-y-6">
          {/* Tab bar dividing System vs Regional vs Company Permissions */}
          {!isRegionalOnly && !isCompanyOnly && (
            <div className="border-b bg-muted/30 px-4 py-2.5 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-3 h-10 w-full sm:w-[600px] bg-muted/60 p-1">
                  <TabsTrigger
                    value="system"
                    className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                  >
                    <Shield className="h-4 w-4" />
                    <span>System Permissions ({systemPermissions.length})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="regional"
                    className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                  >
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    <span>Regional Permissions ({regionalPermissions.length})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="company"
                    className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                  >
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    <span>Company Permissions ({companyPermissions.length})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <span className="text-xs text-muted-foreground hidden sm:inline">
                {activeTab === "company"
                  ? "Restricted to company management domain"
                  : activeTab === "regional"
                  ? "Restricted to regional management domain"
                  : "System-wide federal & structure scope"}
              </span>
            </div>
          )}

          {(isRegionalOnly || activeTab === "regional") && (
            <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-900/50 p-4 text-xs text-indigo-900 dark:text-indigo-200">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="font-semibold text-indigo-950 dark:text-indigo-100">
                  Regional Operational Permissions
                </p>
                <p className="mt-0.5 text-indigo-800/90 dark:text-indigo-300/80">
                  These permissions control authority strictly inside regional domains, including
                  regional dashboards, regional departments, staff account administration, roles, permission groups, and
                  custom regional branding.
                </p>
              </div>
            </div>
          )}

          {(isCompanyOnly || activeTab === "company") && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-900/50 p-4 text-xs text-emerald-900 dark:text-emerald-200">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                  Company Operational Permissions
                </p>
                <p className="mt-0.5 text-emerald-800/90 dark:text-emerald-300/80">
                  These permissions control authority strictly inside company domains, including
                  company dashboards, company departments, staff account administration, roles, permission groups, and
                  custom company branding. Decoupled and strictly isolated from federal and regional permissions.
                </p>
              </div>
            </div>
          )}

          {/* Statistics */}
          <StatsComponent stats={stats} />

          {/* Permissions Accordion / Grid */}
          <div className="w-full bg-white dark:bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                    {activeTab === "company" || isCompanyOnly ? (
                      <>
                        <Building2 className="h-5 w-5 text-emerald-600" />
                        Company Permissions Catalog
                      </>
                    ) : activeTab === "regional" || isRegionalOnly ? (
                      <>
                        <MapPin className="h-5 w-5 text-indigo-600" />
                        Regional Permissions Catalog
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 text-primary" />
                        System Permissions Catalog
                      </>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentPermissions.length} total permissions • {stats.active} active •{" "}
                    {stats.inactive} inactive
                  </p>
                </div>
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={`Search ${activeTab === "company" ? "company " : activeTab === "regional" ? "regional " : ""}permissions...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-lg border border-input py-2 pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary md:w-72"
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
                      : `No ${activeTab === "regional" ? "regional " : ""}permissions have been configured yet.`
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
    </div>
  );
}
