"use strict";
"use client";

import { useMemo } from "react";
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
  Briefcase,
  Pickaxe,
  Factory,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useBranding } from "@/providers/BrandingProvider";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetCompanyDashboardQuery,
  useGetCompanyRolesQuery,
} from "@/redux/api/companyApi";
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

type DashboardTab = "overview" | "planning-preview" | "compliance-preview";

export function CompanyDashboardView() {
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
  const activeCompanyId = params?.id || user?.company_id;
  const basePath = `/companies/${activeCompanyId}`;

  const requestedTab = searchParams.get("tab") as DashboardTab | null;
  const activeTab: DashboardTab =
    requestedTab === "planning-preview"
      ? "planning-preview"
      : requestedTab === "compliance-preview"
      ? "compliance-preview"
      : "overview";

  const setActiveTab = (tab: DashboardTab) => {
    const p = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      p.delete("tab");
    } else {
      p.set("tab", tab);
    }
    const query = p.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  };

  // 1. Fetch live company dashboard summary
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetCompanyDashboardQuery(activeCompanyId || "", {
    skip: !activeCompanyId,
  });

  // 2. Fetch live company roles count
  const { data: rolesData = [] } = useGetCompanyRolesQuery(
    activeCompanyId || "",
    { skip: !activeCompanyId }
  );

  // 3. Fetch live company permission groups count
  const { data: permissionGroupsData = [] } = useGetPermissionGroupsQuery(
    activeCompanyId
      ? { group_kind: "company", company_id: activeCompanyId }
      : undefined,
    { skip: !activeCompanyId }
  );

  // Permissions to view sub-sections
  const canManageDepts =
    can("COMPANY_STRUCTURES:READ") || can("COMPANY_STRUCTURES:MANAGE");
  const canManageUsers =
    can("COMPANY_USERS:READ") || can("COMPANY_USERS:MANAGE");
  const canManageRoles =
    can("COMPANY_ROLES:READ") || can("COMPANY_ROLES:MANAGE");
  const canManageGroups =
    can("COMPANY_PERMISSION_GROUPS:READ") ||
    can("COMPANY_PERMISSION_GROUPS:MANAGE");
  const canManagePermissions =
    can("COMPANY_PERMISSIONS:READ") ||
    can("COMPANY_PERMISSIONS:MANAGE") ||
    can("COMPANY_USERS:READ") ||
    can("COMPANY_USERS:MANAGE");
  const canManageBranding =
    can("COMPANY_BRANDING:READ") || can("COMPANY_BRANDING:MANAGE");

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
          <h3 className="text-lg font-semibold">Unable to load company dashboard</h3>
          <p className="text-sm mt-1 text-muted-foreground">
            There was an error communicating with the company data services.
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

  const { company, counts, recent_departments, recent_users } = dashboardData;
  const companyName = company?.name || branding.system_name_full || "Mining Company Workspace";
  const companyCode = company?.code || "COMP";

  const totalUsers = counts.users.total;
  const assignedUsers = counts.users.assigned;
  const placementRate =
    totalUsers > 0 ? Math.round((assignedUsers / totalUsers) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* =========================================================================
          1. COMPANY HERO & IDENTITY WELCOME BANNER
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
                  alt={`${companyName} logo`}
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
                  {companyCode} Enterprise Workspace
                </span>
                <ActiveStatusBadge isActive={company?.is_active ?? true} />
              </div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2"
                style={{ color: textPrimary }}
              >
                <Factory className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-primary" />
                {companyName}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {branding.system_tagline ||
                  "Corporate Operations, Department Structure, and Production Management"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="rounded-xl border border-border/70 bg-white/80 dark:bg-card/80 p-3.5 backdrop-blur text-sm shadow-2xs">
              <div className="text-xs text-muted-foreground font-medium">Active Operator</div>
              <div className="font-semibold text-foreground truncate max-w-[200px]">
                {user?.name || "Company Officer"}
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
      ========================================================================= */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-3 sm:p-4 shadow-xs"
        role="tablist"
        aria-label="Company Dashboard Views"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Views:
        </span>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-xs",
            activeTab === "overview"
              ? "text-white shadow-sm"
              : "border border-border bg-card text-foreground hover:bg-muted/70"
          )}
          style={
            activeTab === "overview"
              ? { backgroundColor: primaryTone.color }
              : undefined
          }
        >
          <Building2 className="h-4 w-4" />
          <span>Operational Overview</span>
          <span className="ml-1 text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-white/20">
            Live
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "planning-preview"}
          onClick={() => setActiveTab("planning-preview")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all shadow-xs",
            activeTab === "planning-preview"
              ? "text-white shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
          style={
            activeTab === "planning-preview"
              ? { backgroundColor: primaryTone.color }
              : undefined
          }
        >
          <TrendingUp className="h-4 w-4" />
          <span>Production & Planning</span>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Coming soon
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "compliance-preview"}
          onClick={() => setActiveTab("compliance-preview")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all shadow-xs",
            activeTab === "compliance-preview"
              ? "text-white shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
          style={
            activeTab === "compliance-preview"
              ? { backgroundColor: primaryTone.color }
              : undefined
          }
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Mineral Compliance & Reporting</span>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Coming soon
          </span>
        </button>
      </div>

      {/* =========================================================================
          3. TAB 1: OPERATIONAL OVERVIEW (LIVE DYNAMIC DATA)
      ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Corporate Departments"
              value={counts.departments.total}
              subtitle={`${counts.departments.active} active units across corporate hierarchy`}
              accent="primary"
              variant="gradient"
              icon={Building2}
            />

            <KpiCard
              title="Enterprise Accounts"
              value={counts.users.total}
              subtitle={`${counts.users.active} active accounts strictly in ${companyCode}`}
              accent="accent"
              variant="gradient"
              icon={Users}
            />

            <KpiCard
              title="Department Placement"
              value={`${placementRate}%`}
              subtitle={`${counts.users.assigned} assigned, ${counts.users.unassigned} at company HQ`}
              accent="success"
              variant="solid"
              icon={UserCheck}
            />

            <KpiCard
              title="Security Catalog"
              value={rolesData.length}
              subtitle={`${permissionGroupsData.length} active permission groups assigned`}
              accent="warning"
              variant="gradient"
              icon={ShieldCheck}
            />
          </div>

          {/* Analytical Charts and Summary Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Hierarchy Breakdown */}
            <DonutStatCard
              title="Department Structure"
              description="Hierarchy distribution of operational units"
              centerValue={String(counts.departments.total)}
              centerLabel="Units"
              segments={[
                {
                  label: "Root Divisions",
                  value: counts.departments.root,
                  color: primaryTone.color,
                },
                {
                  label: "Subordinate Units",
                  value: Math.max(0, counts.departments.total - counts.departments.root),
                  color: accentTone.color,
                },
                {
                  label: "Active Operations",
                  value: counts.departments.active,
                  color: color("success"),
                },
              ]}
            />

            {/* User Account Assignment Distribution */}
            <div className="lg:col-span-2">
              <AnalyticsPanel
                title="Account Allocation & Workforce Placement"
                description="Distribution of corporate personnel across organizational divisions"
                tone="primary"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-card">
                    <CircularProgress
                      value={placementRate}
                      size={140}
                      color={primaryTone.color}
                    />
                    <div className="mt-3 text-center">
                      <div className="font-semibold text-sm">Placement Rate</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {counts.users.assigned} of {counts.users.total} users assigned to specific departments
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: primaryTone.color }}
                        />
                        <span className="font-medium">Departmental Personnel</span>
                      </div>
                      <span className="font-bold font-mono">{counts.users.assigned}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: accentTone.color }}
                        />
                        <span className="font-medium">Corporate Headquarters (HQ)</span>
                      </div>
                      <span className="font-bold font-mono">{counts.users.unassigned}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color("success") }}
                        />
                        <span className="font-medium">Active Accounts</span>
                      </div>
                      <span className="font-bold font-mono">{counts.users.active}</span>
                    </div>
                  </div>
                </div>
              </AnalyticsPanel>
            </div>
          </div>

          {/* Quick Management Launchpad */}
          <AnalyticsPanel
            title="Company Administration Launchpad"
            description="Direct operational pathways for authorized corporate administrators"
            tone="primary"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {canManageDepts && (
                <Link
                  href={`${basePath}/departments`}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all group"
                >
                  <div
                    className="p-3 rounded-xl shrink-0"
                    style={{
                      backgroundColor: hexToRgba(primaryTone.color, 0.1),
                      color: primaryTone.color,
                    }}
                  >
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Departments & Hierarchy
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manage organizational trees, subordinate branches, and operational mine sites.
                    </p>
                  </div>
                </Link>
              )}

              {canManageUsers && (
                <Link
                  href={`${basePath}/users`}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all group"
                >
                  <div
                    className="p-3 rounded-xl shrink-0"
                    style={{
                      backgroundColor: hexToRgba(accentTone.color, 0.1),
                      color: accentTone.color,
                    }}
                  >
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      User Accounts & Roles
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Authorize company personnel, configure roles, and assign security groups.
                    </p>
                  </div>
                </Link>
              )}

              {canManageBranding && (
                <Link
                  href={`${basePath}/settings`}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all group"
                >
                  <div
                    className="p-3 rounded-xl shrink-0"
                    style={{
                      backgroundColor: hexToRgba(color("success"), 0.1),
                      color: color("success"),
                    }}
                  >
                    <Paintbrush className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Identity & Appearance
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Update corporate branding, emblem logo, colors, and system title.
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </AnalyticsPanel>

          {/* Recent Records Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Departments */}
            <AnalyticsPanel
              title="Recent Organizational Units"
              description="Latest corporate divisions registered in this company"
              tone="primary"
            >
              {recent_departments && recent_departments.length > 0 ? (
                <div className="divide-y divide-border">
                  {recent_departments.map((dept) => (
                    <div
                      key={dept.company_structure_id}
                      className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground flex items-center gap-2">
                            <span>{dept.name}</span>
                            {dept.code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                {dept.code}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Hierarchy Level {dept.level}
                          </div>
                        </div>
                      </div>
                      <ActiveStatusBadge isActive={dept.is_active} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground italic">
                  No departments recorded yet.
                </div>
              )}
            </AnalyticsPanel>

            {/* Recent Users */}
            <AnalyticsPanel
              title="Recent Account Assignments"
              description="Recently created personnel in this company workspace"
              tone="primary"
            >
              {recent_users && recent_users.length > 0 ? (
                <div className="divide-y divide-border">
                  {recent_users.map((u) => (
                    <div
                      key={u.user_id}
                      className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {u.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground">
                            {u.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {u.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-foreground">
                          {u.companyStructure?.name || u.company_structure?.name || "HQ Staff"}
                        </div>
                        <ActiveStatusBadge isActive={u.is_active} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground italic">
                  No company users created yet.
                </div>
              )}
            </AnalyticsPanel>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. TAB 2: PRODUCTION & PLANNING PREVIEW (CLEARLY LABELED STATIC PLACEHOLDER)
      ========================================================================= */}
      {activeTab === "planning-preview" && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-700 dark:text-amber-400 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-amber-950 dark:text-amber-200">
                    Production & Operational Planning — Future Phase
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                    Not yet available
                  </span>
                </div>
                <p className="text-sm text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Company production scheduling, extraction milestones, annual targets, and equipment
                  KPIs will be integrated in subsequent phases. This view illustrates upcoming corporate
                  planning interfaces without generating fake production metrics.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-75">
            <AnalyticsPanel
              title="Extraction & Refining Output"
              description="Quarterly metric targets vs actual yield"
              tone="secondary"
            >
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl bg-muted/20">
                <Pickaxe className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Production Schedules (Coming Soon)
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Target tonnages, refining quotas, and daily extraction logs will populate here.
                </span>
              </div>
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Site Operations & Fleet Monitoring"
              description="Active concessions and equipment telemetry"
              tone="secondary"
            >
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl bg-muted/20">
                <Factory className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Concession Operations (Coming Soon)
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Active mining sites, processing plants, and facility status will populate here.
                </span>
              </div>
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Operational Milestone Progress"
              description="Yearly operational target completion"
              tone="secondary"
            >
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl bg-muted/20">
                <TrendingUp className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Target Tracking (Coming Soon)
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Strategic plan milestones aligned with federal mining objectives will display here.
                </span>
              </div>
            </AnalyticsPanel>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. TAB 3: COMPLIANCE & REPORTING PREVIEW (CLEARLY LABELED STATIC PLACEHOLDER)
      ========================================================================= */}
      {activeTab === "compliance-preview" && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-700 dark:text-amber-400 shrink-0">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-amber-950 dark:text-amber-200">
                    Statutory & Environmental Compliance — Future Phase
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                    Not yet available
                  </span>
                </div>
                <p className="text-sm text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Statutory reporting to the federal Ministry of Mining, environmental impact filings,
                  and mineral royalty clearances will be implemented in subsequent phases.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75">
            <AnalyticsPanel
              title="Environmental & Rehabilitation Filings"
              description="Quarterly EIA compliance and site remediation"
              tone="secondary"
            >
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl bg-muted/20">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Environmental Reports (Coming Soon)
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                  Rehabilitation status, water testing records, and statutory submissions will be tracked here.
                </span>
              </div>
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Mineral Royalty & Clearance Audits"
              description="Annual royalty settlements with Ministry of Mining"
              tone="secondary"
            >
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl bg-muted/20">
                <Briefcase className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Royalty Clearances (Coming Soon)
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                  Export permits, federal royalty audits, and revenue reconciliation modules will appear here.
                </span>
              </div>
            </AnalyticsPanel>
          </div>
        </div>
      )}
    </div>
  );
}
