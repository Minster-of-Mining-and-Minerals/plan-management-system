"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  Users,
  ShieldCheck,
  Paintbrush,
  MapPin,
  ArrowRight,
  UserCheck,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ListTree,
  AlertCircle,
  GitBranch,
  Key,
  Shield,
  Activity,
  RefreshCw,
  FolderLock,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useBranding } from "@/providers/BrandingProvider";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetRegionalDashboardQuery,
  useGetRegionalRolesQuery,
} from "@/redux/api/regionApi";
import {
  useGetRegionalExecutionDashboardSummaryQuery,
  useGetRegionalExecutionDashboardDepartmentUserQuery,
} from "@/redux/api/regionalPlanApi";
import { useGetPermissionGroupsQuery } from "@/redux/api/permissionGroupApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { cn } from "@/lib/utils";

// Shared federal dashboard presentation components
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  AnalyticsPanel,
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { DonutStatCard } from "@/features/plan-management/dashboard/components/DonutStatCard";
import { SimpleBarChart } from "@/features/plan-management/dashboard/components/SimpleBarChart";
import { RankedLeaderboard } from "@/features/plan-management/dashboard/components/RankedLeaderboard";
import { CircularProgress } from "@/features/plan-management/components/CircularProgress";
import { useDashboardAppearance } from "@/features/plan-management/dashboard/hooks/useDashboardAppearance";
import { hexToRgba } from "@/features/plan-management/dashboard/utils/dashboardAppearanceUtils";

type DashboardTab = "overview" | "strategic-preview" | "issues-preview";

export interface RegionalDashboardViewProps {
  overrideRegionId?: string;
  hideHeaderNavigation?: boolean;
}

export function RegionalDashboardView({
  overrideRegionId,
  hideHeaderNavigation = false,
}: RegionalDashboardViewProps = {}) {
  const { data: session } = useSession();
  const { branding, logoPrimaryUrl } = useBranding();
  const { can } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string }>();

  const { tone, chartPalette, color, textPrimary, textSecondary } =
    useDashboardAppearance();
  const primaryTone = tone("primary");
  const accentTone = tone("accent");

  const user = session?.user;
  const activeRegionId = overrideRegionId || params?.id || user?.region_id;
  const basePath = activeRegionId ? `/regions/${activeRegionId}` : "/regional";

  const [localTab, setLocalTab] = useState<DashboardTab>("overview");
  const requestedTab = searchParams.get("tab") as DashboardTab | null;
  const activeTab: DashboardTab = hideHeaderNavigation
    ? localTab
    : requestedTab === "strategic-preview"
    ? "strategic-preview"
    : requestedTab === "issues-preview"
    ? "issues-preview"
    : "overview";

  const setActiveTab = (tab: DashboardTab) => {
    if (hideHeaderNavigation) {
      setLocalTab(tab);
      return;
    }
    const p = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      p.delete("tab");
    } else {
      p.set("tab", tab);
    }
    const query = p.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  };

  // 1. Fetch live regional dashboard summary
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetRegionalDashboardQuery(
    activeRegionId ? { region_id: activeRegionId } : undefined,
    { skip: !activeRegionId }
  );

  // 2. Fetch live regional roles count
  const { data: rolesData = [] } = useGetRegionalRolesQuery();

  // 3. Fetch live regional permission groups count
  const { data: permissionGroupsData = [] } = useGetPermissionGroupsQuery(
    activeRegionId
      ? { group_kind: "regional", region_id: activeRegionId }
      : undefined,
    { skip: !activeRegionId }
  );

  // 4. Fetch live regional planning execution summary & department scorecard
  const { data: planSummary } = useGetRegionalExecutionDashboardSummaryQuery(
    { region_id: activeRegionId as string },
    { skip: !activeRegionId }
  );

  const { data: planDeptData } = useGetRegionalExecutionDashboardDepartmentUserQuery(
    { region_id: activeRegionId as string },
    { skip: !activeRegionId }
  );

  // Permissions to view sub-sections
  const canManageDepts =
    can("REGIONAL_STRUCTURES:READ") || can("REGIONAL_STRUCTURES:MANAGE");
  const canManageUsers =
    can("REGIONAL_USERS:READ") || can("REGIONAL_USERS:MANAGE");
  const canManageRoles =
    can("REGIONAL_ROLES:READ") || can("REGIONAL_ROLES:MANAGE");
  const canManageGroups =
    can("REGIONAL_PERMISSION_GROUPS:READ") ||
    can("REGIONAL_PERMISSION_GROUPS:MANAGE");
  const canManagePermissions =
    can("REGIONAL_PERMISSIONS:READ") ||
    can("REGIONAL_PERMISSIONS:MANAGE") ||
    can("REGIONAL_USERS:READ") ||
    can("REGIONAL_USERS:MANAGE");
  const canManageBranding =
    can("REGIONAL_BRANDING:READ") || can("REGIONAL_BRANDING:MANAGE");

  if (isDashboardLoading) {
    return <Loading01 />;
  }

  if (dashboardError || !dashboardData) {
    return (
      <div className="p-8 text-center border rounded-2xl bg-destructive/5 text-destructive space-y-4 max-w-xl mx-auto my-12">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Unable to load regional dashboard</h3>
          <p className="text-sm mt-1 text-muted-foreground">
            There was an error communicating with the regional data services.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetchDashboard()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      </div>
    );
  }

  const { region, counts, recent_departments, recent_users } = dashboardData;
  const regionName = region?.name || branding.system_name_full || "Regional Administration";
  const regionCode = region?.code || "REG";

  const totalUsers = counts.users.total;
  const assignedUsers = counts.users.assigned;
  const placementRate =
    totalUsers > 0 ? Math.round((assignedUsers / totalUsers) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* =========================================================================
          1. REGIONAL HERO & IDENTITY WELCOME BANNER
          Styled with federal dashboard gradient aesthetics and regional branding
      ========================================================================= */}
      <div
        className="relative overflow-hidden rounded-2xl border px-6 py-6 sm:px-8 sm:py-7 shadow-xs"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(primaryTone.color, 0.14)} 0%, #ffffff 50%, ${hexToRgba(accentTone.color, 0.08)} 100%)`,
          borderColor: hexToRgba(primaryTone.color, 0.16),
        }}
      >
        <div
          className="absolute -right-8 -top-8 h-56 w-56 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: hexToRgba(primaryTone.color, 0.12) }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {logoPrimaryUrl ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-white/90 p-2 shadow-xs backdrop-blur">
                <Image
                  src={logoPrimaryUrl}
                  alt={`${regionName} logo`}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border shadow-xs"
                style={{
                  backgroundColor: hexToRgba(primaryTone.color, 0.12),
                  borderColor: hexToRgba(primaryTone.color, 0.25),
                  color: primaryTone.color,
                }}
              >
                <Building2 className="h-10 w-10" />
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: hexToRgba(primaryTone.color, 0.12),
                    borderColor: hexToRgba(primaryTone.color, 0.25),
                    color: primaryTone.color,
                  }}
                >
                  {regionCode} Regional Administration
                </span>
                <ActiveStatusBadge isActive={region?.is_active ?? true} />
              </div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2"
                style={{ color: textPrimary }}
              >
                <MapPin className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-primary" />
                {regionName}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {branding.system_tagline ||
                  "Regional Operations, Department Structure, and Governance Workspace"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="rounded-xl border border-border/70 bg-white/80 dark:bg-card/80 p-3.5 backdrop-blur text-sm shadow-2xs">
              <div className="text-xs text-muted-foreground font-medium">Logged in operator</div>
              <div className="font-semibold text-foreground truncate max-w-[200px]">
                {user?.name || "Regional Staff"}
              </div>
              <div className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. DASHBOARD VIEW SELECTOR TABS
          Replicates the federal GlobalDashboardView tab switcher
      ========================================================================= */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-3 sm:p-4 shadow-xs"
        role="tablist"
        aria-label="Regional Dashboard Views"
      >
        <Button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          variant={activeTab === "overview" ? "default" : "outline"}
          onClick={() => setActiveTab("overview")}
          className={cn(
            "h-10 rounded-xl px-4 shadow-none gap-2",
            activeTab === "overview"
              ? "bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          <ListTree className="h-4 w-4 shrink-0" />
          <span>Regional Overview</span>
          <span className="text-[10px] uppercase font-bold tracking-wide ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            Live
          </span>
        </Button>

        <Button
          type="button"
          role="tab"
          aria-selected={activeTab === "strategic-preview"}
          variant={activeTab === "strategic-preview" ? "default" : "outline"}
          onClick={() => setActiveTab("strategic-preview")}
          className={cn(
            "h-10 rounded-xl px-4 shadow-none gap-2",
            activeTab === "strategic-preview"
              ? "bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          <Layers className="h-4 w-4 shrink-0" />
          <span>Strategic Execution</span>
          <span className="text-[10px] uppercase font-bold tracking-wide ml-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
            Preview
          </span>
        </Button>

        <Button
          type="button"
          role="tab"
          aria-selected={activeTab === "issues-preview"}
          variant={activeTab === "issues-preview" ? "default" : "outline"}
          onClick={() => setActiveTab("issues-preview")}
          className={cn(
            "h-10 rounded-xl px-4 shadow-none gap-2",
            activeTab === "issues-preview"
              ? "bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Operational Issues</span>
          <span className="text-[10px] uppercase font-bold tracking-wide ml-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
            Preview
          </span>
        </Button>
      </div>

      {/* =========================================================================
          3. TAB CONTENT
      ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <DashboardSectionHeader
            title="Administrative & Operational Metrics"
            description={`Real-time organizational structure, staff allocation, and RBAC governance for ${regionName}.`}
            badge="Live Regional Data"
          />

          {/* Primary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Total Departments"
              value={counts.departments.total}
              subtitle={`${counts.departments.root} root directorates`}
              icon={Building2}
              variant="gradient"
              accent="primary"
            />
            <KpiCard
              title="Staff Placement"
              value={`${placementRate}%`}
              subtitle={`${counts.users.assigned} of ${counts.users.total} staff placed`}
              icon={TrendingUp}
              variant="solid"
              accent="success"
            />
            <KpiCard
              title="Active Staff Users"
              value={counts.users.active}
              subtitle={`${counts.users.total - counts.users.active} inactive accounts`}
              icon={Users}
              variant="gradient"
              accent="accent"
            />
            <KpiCard
              title="Security Roles"
              value={rolesData.length}
              subtitle={`${permissionGroupsData.length} permission groups`}
              icon={ShieldCheck}
              variant="gradient"
              accent="warning"
            />
          </div>

          {/* Secondary Outline KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              title="Root Directorates"
              value={counts.departments.root}
              subtitle="Level 1 structures"
              icon={Layers}
              variant="outline"
              accent="primary"
            />
            <KpiCard
              title="Active Units"
              value={counts.departments.active}
              subtitle="Operational offices"
              icon={CheckCircle2}
              variant="outline"
              accent="info"
            />
            <KpiCard
              title="Unassigned Staff"
              value={counts.users.unassigned}
              subtitle="Pending assignment"
              icon={UserCheck}
              variant="outline"
              accent="secondary"
            />
            <KpiCard
              title="Security Boundary"
              value={`${regionCode} Domain`}
              subtitle="Strict regional isolation"
              icon={MapPin}
              variant="outline"
              accent="accent"
            />
          </div>

          {/* Analytics Grid: Donut Breakdown Cards & Quick Navigation */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Personnel Placement Mix */}
            <div className="xl:col-span-4">
              <DonutStatCard
                title="Personnel Placement Mix"
                description="Staff allocated to departments vs unassigned"
                centerValue={counts.users.total}
                centerLabel="Total Staff"
                segments={[
                  {
                    label: "Assigned in Depts",
                    value: counts.users.assigned,
                    color: chartPalette[0] || primaryTone.color,
                  },
                  {
                    label: "Unassigned Personnel",
                    value: counts.users.unassigned,
                    color: chartPalette[2] || "#94a3b8",
                  },
                ]}
              />
            </div>

            {/* Department Structure Mix */}
            <div className="xl:col-span-4">
              <DonutStatCard
                title="Department Hierarchy"
                description="Root directorates vs sub-directorate divisions"
                centerValue={counts.departments.total}
                centerLabel="Units"
                segments={[
                  {
                    label: "Root Directorates",
                    value: counts.departments.root,
                    color: chartPalette[1] || accentTone.color,
                  },
                  {
                    label: "Sub-Directorates & Units",
                    value: Math.max(0, counts.departments.total - counts.departments.root),
                    color: chartPalette[3] || "#64748b",
                  },
                ]}
              />
            </div>

            {/* Quick Actions Panel */}
            <div className="xl:col-span-4">
              <AnalyticsPanel
                title="Regional Directory"
                description="Quick navigation to administrative modules"
                icon={FolderLock}
                tone="primary"
                className="h-full"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
                  {canManageDepts && (
                    <Link
                      href={`${basePath}/departments`}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            Departments
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Hierarchy & directorates
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  )}

                  {canManageUsers && (
                    <Link
                      href={`${basePath}/users`}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            Users List
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Staff accounts & placement
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  )}

                  {canManageRoles && (
                    <Link
                      href={`${basePath}/users/roles`}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            Role Management
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Regional access roles
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  )}

                  {canManageGroups && (
                    <Link
                      href={`${basePath}/users/permission-groups`}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            Permission Groups
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Regional security groups
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  )}

                  {canManagePermissions && (
                    <Link
                      href={`${basePath}/users/permissions`}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Key className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            Regional Permissions
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Catalog of operational keys
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  )}

                  {canManageBranding && (
                    <Link
                      href={`${basePath}/settings`}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Paintbrush className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            Settings & Branding
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Custom colors & region logo
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  )}
                </div>
              </AnalyticsPanel>
            </div>
          </div>

          {/* Two Column Layout: Recent Departments & Recent Staff Users */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Departments Preview Card */}
            <div className="rounded-xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-border/70">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Recent Departments</h3>
                    <p className="text-xs text-muted-foreground">
                      Organizational hierarchy divisions
                    </p>
                  </div>
                </div>
                {canManageDepts && (
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                    <Link href={`${basePath}/departments`}>View All</Link>
                  </Button>
                )}
              </div>

              <div className="pt-4">
                {recent_departments.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                    No departments created yet for this region.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                    {recent_departments.map((dept) => (
                      <div
                        key={dept.regional_structure_id}
                        className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            L{dept.level}
                          </div>
                          <div className="truncate">
                            <div className="text-sm font-medium text-foreground truncate">
                              {dept.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Level {dept.level} Directorate
                            </div>
                          </div>
                        </div>
                        <ActiveStatusBadge isActive={dept.is_active} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Staff Members Preview Card */}
            <div className="rounded-xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-border/70">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Regional Staff</h3>
                    <p className="text-xs text-muted-foreground">
                      Recently registered personnel
                    </p>
                  </div>
                </div>
                {canManageUsers && (
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                    <Link href={`${basePath}/users`}>View All</Link>
                  </Button>
                )}
              </div>

              <div className="pt-4">
                {recent_users.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                    No users registered yet in this region.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                    {recent_users.map((u) => {
                      const roleName = u.roles?.[0]?.name || "Regional Member";
                      const deptName =
                        u.regional_structure?.name ||
                        u.regionalStructure?.name ||
                        "Unassigned";

                      return (
                        <div
                          key={u.user_id}
                          className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 font-semibold text-xs flex items-center justify-center shrink-0">
                              {u.full_name?.charAt(0) || "U"}
                            </div>
                            <div className="truncate">
                              <div className="text-sm font-medium text-foreground truncate">
                                {u.full_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {roleName} • {deptName}
                              </div>
                            </div>
                          </div>
                          <ActiveStatusBadge isActive={u.is_active} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. STRATEGIC PLANNING TAB
          Live Regional Planning Summary & Performance Analytics
      ========================================================================= */}
      {activeTab === "strategic-preview" && (
        <div className="space-y-6">
          {/* Header Banner with Direct Navigation Links */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs shadow-2xs">
            <div className="flex items-start gap-3.5">
              <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span>Regional Strategic Plan Execution</span>
                  <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                    Live Regional Data
                  </Badge>
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Real-time status of regional strategic master plans, active execution periods, and department rollups.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button asChild size="sm" variant="outline" className="gap-2">
                <Link href={`${basePath}/plans`}>
                  <Layers className="h-4 w-4" />
                  <span>All Plans</span>
                </Link>
              </Button>

              <Button asChild size="sm" className="gap-2 shadow-xs">
                <Link href={`${basePath}/plans/dashboard`}>
                  <TrendingUp className="h-4 w-4" />
                  <span>Execution Dashboard</span>
                </Link>
              </Button>
            </div>
          </div>

          <DashboardSectionHeader
            title="Strategic Execution Overview"
            description="Milestone achievement, target rollups, and directorate scorecard analytics."
            badge="Live Performance"
          />

          {/* Live KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Regional Plans"
              value={planSummary?.summary?.total_plans ?? planSummary?.total_plans ?? 0}
              subtitle={`${planSummary?.summary?.status_breakdown?.active_plans ?? planSummary?.active_plans ?? 0} actively executing cycles`}
              icon={Layers}
              variant="gradient"
              accent="primary"
            />
            <KpiCard
              title="Portfolio Progress"
              value={`${planSummary?.summary?.avg_progress ?? planSummary?.portfolio_progress_percent ?? 0}%`}
              subtitle="Confirmed hierarchical rollups"
              icon={TrendingUp}
              variant="solid"
              accent="success"
            />
            <KpiCard
              title="Active Milestones"
              value={planSummary?.summary?.active_milestones ?? planSummary?.active_milestones ?? 0}
              subtitle="Planned goals & leaf KPIs"
              icon={CheckCircle2}
              variant="gradient"
              accent="accent"
            />
            <KpiCard
              title="Delayed KPIs"
              value={planSummary?.summary?.delayed_kpis ?? planSummary?.delayed_kpis ?? 0}
              subtitle="Behind target schedule"
              icon={AlertCircle}
              variant="gradient"
              accent="warning"
            />
          </div>

          {/* Charts & Directorate Scorecard */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <AnalyticsPanel
              title="Execution Pulse"
              description="Portfolio-wide achievement score"
              variant="gradient"
              tone="primary"
              className="xl:col-span-4"
            >
              <div className="flex flex-col items-center justify-center py-4">
                <CircularProgress
                  value={planSummary?.summary?.avg_progress ?? planSummary?.portfolio_progress_percent ?? 0}
                  color={primaryTone.color}
                  size={150}
                  label={`${planSummary?.summary?.avg_progress ?? planSummary?.portfolio_progress_percent ?? 0}%`}
                />
                <p className="mt-4 text-xs text-muted-foreground text-center max-w-[220px]">
                  {planSummary?.summary?.total_plans ?? planSummary?.total_plans ?? 0} strategic cycles configured for {regionName}. Overall confirmed execution is at {planSummary?.summary?.avg_progress ?? planSummary?.portfolio_progress_percent ?? 0}%.
                </p>
              </div>
            </AnalyticsPanel>

            <div className="xl:col-span-8">
              <RankedLeaderboard
                title="Directorate Performance Scorecard"
                description="Live performance across regional departments"
                entries={(planDeptData?.departments || []).map((dept) => ({
                  id: dept.regional_structure_id,
                  title: dept.name,
                  subtitle: `Level ${dept.level} Directorate • ${dept.assigned_nodes_count} milestones`,
                  value: dept.avg_progress,
                  valueLabel: `${dept.avg_progress}%`,
                  hasProgress: true,
                }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. OPERATIONAL ISSUES TAB (CLEARLY LABELED PREVIEW PLACEHOLDER)
          Replicates the federal IssueDashboardOverview layout without fake data
      ========================================================================= */}
      {activeTab === "issues-preview" && (
        <div className="space-y-6">
          <div className="flex items-start gap-3.5 rounded-xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-900/50 p-4 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-blue-950 dark:text-blue-100 flex items-center gap-2">
                <span>Regional Issue & Bottleneck Tracking (Preview Mode)</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-800 dark:text-blue-300">
                  Coming Soon
                </span>
              </p>
              <p className="text-blue-800/90 dark:text-blue-300/80 leading-relaxed">
                Regional issue management will allow departmental staff and project managers to report
                operational obstacles, escalate workflow bottlenecks, and track corrective action plans.
              </p>
            </div>
          </div>

          <DashboardSectionHeader
            title="Operational Issues & Escalations"
            description="Preview of incident categories and resolution metrics."
            badge="Preview Layout"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Open Issues"
              value="—"
              subtitle="No active escalations"
              icon={AlertCircle}
              variant="gradient"
              accent="error"
            />
            <KpiCard
              title="In Resolution"
              value="—"
              subtitle="Pending review"
              icon={Clock}
              variant="solid"
              accent="warning"
            />
            <KpiCard
              title="Resolved"
              value="—"
              subtitle="0 historical records"
              icon={CheckCircle2}
              variant="gradient"
              accent="success"
            />
            <KpiCard
              title="Active Categories"
              value="—"
              subtitle="Regional issue flows"
              icon={Layers}
              variant="outline"
              accent="info"
            />
          </div>

          <div className="rounded-xl border border-dashed border-border/80 bg-white/50 p-12 text-center text-sm text-muted-foreground space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="font-medium text-foreground">Issue Tracking Module Offline</p>
            <p className="max-w-md mx-auto text-xs">
              Issue intake forms and escalation workflows for {regionName} will be enabled in the upcoming operational release.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
