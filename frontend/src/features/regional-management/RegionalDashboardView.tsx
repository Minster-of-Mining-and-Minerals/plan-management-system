"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import {
  Building2,
  Users,
  ShieldCheck,
  Paintbrush,
  ArrowRight,
  UserCheck,
  Layers,
  CheckCircle2,
  ListTree,
  AlertCircle,
  Key,
  Shield,
  RefreshCw,
  Clock,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useBranding } from "@/providers/BrandingProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { RegionalPlanDashboardView } from "@/features/regional-plan-management/RegionalPlanDashboardView";
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

type DashboardTab = "overview" | "strategic-preview" | "issues-preview";

export interface RegionalDashboardViewProps {
  overrideRegionId?: string;
  hideHeaderNavigation?: boolean;
}

/* -------------------------------------------------------------------------
   Presentation helpers (one consistent card language for the whole page)
------------------------------------------------------------------------- */

type Tone = "primary" | "sky" | "violet" | "emerald" | "amber" | "rose" | "slate";

const TONE_CHIP: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

const TONE_BAR: Record<Tone, string> = {
  primary: "bg-primary",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

const CARD = "rounded-2xl border border-border/70 bg-card shadow-2xs";

/** Placement colour follows the value: good, needs work, poor. */
function placementTone(rate: number): Tone {
  if (rate >= 80) return "emerald";
  if (rate >= 50) return "amber";
  return "rose";
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  progress,
}: {
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  icon: LucideIcon;
  tone: Tone;
  progress?: number;
}) {
  return (
    <div className={cn(CARD, "flex flex-col gap-3 p-5")}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONE_CHIP[tone])}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>
      <div className="text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums">{value}</div>
      {progress !== undefined && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div className={cn("h-full rounded-full transition-all", TONE_BAR[tone])} style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

/** A labelled horizontal bar split into parts, with an always-visible legend. */
function SplitBar({
  title,
  total,
  parts,
}: {
  title: string;
  total: number;
  parts: Array<{ label: string; value: number; tone: Tone }>;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{total} total</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          parts.map((p) =>
            p.value > 0 ? (
              <div
                key={p.label}
                className={cn("h-full", TONE_BAR[p.tone])}
                style={{ width: `${(p.value / total) * 100}%` }}
              />
            ) : null
          )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-sm", TONE_BAR[p.tone])} aria-hidden="true" />
            {p.label}
            <span className="font-semibold text-foreground tabular-nums">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(CARD, "flex flex-col p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function RegionalDashboardView({
  overrideRegionId,
  hideHeaderNavigation = false,
}: RegionalDashboardViewProps = {}) {
  const { data: session } = useSession();
  const { branding } = useBranding();
  const { can } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string }>();

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
  const { data: rolesData = [] } = useGetRegionalRolesQuery(activeRegionId ? { region_id: activeRegionId } : undefined);

  // 3. Fetch live regional permission groups count
  const { data: permissionGroupsData = [] } = useGetPermissionGroupsQuery(
    activeRegionId
      ? { group_kind: "regional", region_id: activeRegionId }
      : undefined,
    { skip: !activeRegionId }
  );

  // 4. Regional planning execution summary & department scorecard (prefetched for the Strategic tab)
  useGetRegionalExecutionDashboardSummaryQuery(
    { region_id: activeRegionId as string },
    { skip: !activeRegionId }
  );
  useGetRegionalExecutionDashboardDepartmentUserQuery(
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

  const totalUsers = counts.users.total;
  const assignedUsers = counts.users.assigned;
  const placementRate =
    totalUsers > 0 ? Math.round((assignedUsers / totalUsers) * 100) : 0;
  const inactiveUsers = Math.max(0, counts.users.total - counts.users.active);
  const subUnits = Math.max(0, counts.departments.total - counts.departments.root);
  const inactiveDepts = Math.max(0, counts.departments.total - counts.departments.active);

  // Things worth acting on, built only from real counts.
  const attention: Array<{ key: string; icon: LucideIcon; tone: Tone; text: string; href?: string; cta?: string }> = [];
  if (counts.departments.total === 0) {
    attention.push({
      key: "no-depts",
      icon: Building2,
      tone: "amber",
      text: "No departments yet. Create the region's directorates so staff can be placed.",
      href: canManageDepts ? `${basePath}/departments` : undefined,
      cta: "Add departments",
    });
  }
  if (counts.users.unassigned > 0) {
    attention.push({
      key: "unassigned",
      icon: UserCheck,
      tone: "amber",
      text: `${counts.users.unassigned} staff ${counts.users.unassigned === 1 ? "member is" : "members are"} not placed in a department.`,
      href: canManageUsers ? `${basePath}/users` : undefined,
      cta: "Assign staff",
    });
  }
  if (inactiveUsers > 0) {
    attention.push({
      key: "inactive-users",
      icon: UserX,
      tone: "slate",
      text: `${inactiveUsers} staff ${inactiveUsers === 1 ? "account is" : "accounts are"} inactive.`,
      href: canManageUsers ? `${basePath}/users` : undefined,
      cta: "Review users",
    });
  }
  if (inactiveDepts > 0) {
    attention.push({
      key: "inactive-depts",
      icon: Building2,
      tone: "slate",
      text: `${inactiveDepts} ${inactiveDepts === 1 ? "department is" : "departments are"} inactive.`,
      href: canManageDepts ? `${basePath}/departments` : undefined,
      cta: "Review departments",
    });
  }

  const quickLinks: Array<{ show: boolean; href: string; label: string; hint: string; icon: LucideIcon; tone: Tone }> = [
    { show: canManageDepts, href: `${basePath}/departments`, label: "Departments", hint: "Hierarchy & directorates", icon: Building2, tone: "primary" },
    { show: canManageUsers, href: `${basePath}/users`, label: "Users", hint: "Staff accounts & placement", icon: Users, tone: "sky" },
    { show: canManageRoles, href: `${basePath}/users/roles`, label: "Roles", hint: "Regional access roles", icon: Shield, tone: "violet" },
    { show: canManageGroups, href: `${basePath}/users/permission-groups`, label: "Permission groups", hint: "Regional security groups", icon: ShieldCheck, tone: "violet" },
    { show: canManagePermissions, href: `${basePath}/users/permissions`, label: "Permissions", hint: "Catalog of operational keys", icon: Key, tone: "slate" },
    { show: canManageBranding, href: `${basePath}/settings`, label: "Settings & branding", hint: "Colors & region logo", icon: Paintbrush, tone: "amber" },
  ];
  const visibleLinks = quickLinks.filter((l) => l.show);

  const tabs: Array<{ id: DashboardTab; label: string; icon: LucideIcon }> = [
    { id: "overview", label: "Overview", icon: ListTree },
    { id: "strategic-preview", label: "Strategic Execution", icon: Layers },
    { id: "issues-preview", label: "Operational Issues", icon: AlertCircle },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Dashboard view switcher */}
      <div
        className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-border/70 bg-card p-1.5 shadow-2xs"
        role="tablist"
        aria-label="Dashboard views"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                selected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =============================== OVERVIEW =============================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key figures */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Departments"
              value={counts.departments.total}
              detail={`${counts.departments.root} directorates · ${subUnits} sub-units · ${counts.departments.active} active`}
              icon={Building2}
              tone="primary"
            />
            <StatCard
              label="Staff"
              value={counts.users.total}
              detail={`${counts.users.active} active · ${inactiveUsers} inactive`}
              icon={Users}
              tone="sky"
            />
            <StatCard
              label="Staff placement"
              value={`${placementRate}%`}
              detail={`${counts.users.assigned} of ${counts.users.total} placed in a department`}
              icon={UserCheck}
              tone={placementTone(placementRate)}
              progress={placementRate}
            />
            <StatCard
              label="Roles"
              value={rolesData.length}
              detail={`${permissionGroupsData.length} permission ${permissionGroupsData.length === 1 ? "group" : "groups"}`}
              icon={ShieldCheck}
              tone="violet"
            />
          </div>

          {/* Needs attention (only when there is something to do) */}
          {attention.length > 0 && (
            <section aria-labelledby="attention-title" className={cn(CARD, "p-5")}>
              <h3 id="attention-title" className="mb-3 text-base font-semibold text-foreground">
                Needs attention
              </h3>
              <ul className="grid gap-2.5 md:grid-cols-2">
                {attention.map((a) => {
                  const Icon = a.icon;
                  return (
                    <li
                      key={a.key}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3"
                    >
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE_CHIP[a.tone])}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-foreground">{a.text}</span>
                      {a.href && a.cta && (
                        <Link
                          href={a.href}
                          className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10"
                        >
                          {a.cta}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Organization at a glance + quick links */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard
              title="Organization at a glance"
              description={`How ${regionName} is structured and staffed`}
            >
              <div className="space-y-6">
                <SplitBar
                  title="Staff placement"
                  total={counts.users.total}
                  parts={[
                    { label: "Placed in a department", value: counts.users.assigned, tone: "emerald" },
                    { label: "Not placed", value: counts.users.unassigned, tone: "amber" },
                  ]}
                />
                <SplitBar
                  title="Department structure"
                  total={counts.departments.total}
                  parts={[
                    { label: "Directorates", value: counts.departments.root, tone: "primary" },
                    { label: "Sub-units", value: subUnits, tone: "sky" },
                  ]}
                />
                <SplitBar
                  title="Account status"
                  total={counts.users.total}
                  parts={[
                    { label: "Active", value: counts.users.active, tone: "emerald" },
                    { label: "Inactive", value: inactiveUsers, tone: "slate" },
                  ]}
                />
              </div>
            </SectionCard>

            <SectionCard title="Quick links" description="Manage your region">
              {visibleLinks.length === 0 ? (
                <EmptyState>You don&apos;t have access to any management pages.</EmptyState>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {visibleLinks.map((l) => {
                    const Icon = l.icon;
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="group flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE_CHIP[l.tone])}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
                            {l.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{l.hint}</span>
                        </span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                          aria-hidden="true"
                        />
                      </Link>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Recent departments & staff */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Recent departments"
              description="Latest additions to the structure"
              action={
                canManageDepts ? (
                  <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary hover:bg-primary/10 hover:text-primary">
                    <Link href={`${basePath}/departments`}>
                      View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : undefined
              }
            >
              {recent_departments.length === 0 ? (
                <EmptyState>No departments created yet for this region.</EmptyState>
              ) : (
                <ul className="divide-y divide-border/60">
                  {recent_departments.map((dept) => (
                    <li key={dept.regional_structure_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          L{dept.level}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{dept.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {dept.level === 1 ? "Directorate" : `Level ${dept.level} unit`}
                          </div>
                        </div>
                      </div>
                      <ActiveStatusBadge isActive={dept.is_active} />
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Regional staff"
              description="Recently registered personnel"
              action={
                canManageUsers ? (
                  <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary hover:bg-primary/10 hover:text-primary">
                    <Link href={`${basePath}/users`}>
                      View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : undefined
              }
            >
              {recent_users.length === 0 ? (
                <EmptyState>No users registered yet in this region.</EmptyState>
              ) : (
                <ul className="divide-y divide-border/60">
                  {recent_users.map((u) => {
                    const roleName = u.roles?.[0]?.name || "Regional member";
                    const deptName =
                      u.regional_structure?.name ||
                      u.regionalStructure?.name ||
                      null;
                    const initials =
                      (u.full_name || "U")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w: string) => w.charAt(0).toUpperCase())
                        .join("") || "U";

                    return (
                      <li key={u.user_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-xs font-semibold text-sky-700 dark:text-sky-300">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">{u.full_name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {roleName} ·{" "}
                              {deptName ? (
                                deptName
                              ) : (
                                <span className="font-medium text-amber-700 dark:text-amber-300">Not placed</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ActiveStatusBadge isActive={u.is_active} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* =============================== STRATEGIC EXECUTION =============================== */}
      {activeTab === "strategic-preview" && (
        <div className="space-y-6">
          <RegionalPlanDashboardView
            embedded={true}
            overrideRegionId={activeRegionId as string}
          />
        </div>
      )}

      {/* =============================== OPERATIONAL ISSUES (placeholder) =============================== */}
      {activeTab === "issues-preview" && (
        <div className="space-y-6">
          <div className="flex items-start gap-3.5 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900/50 dark:bg-sky-950/30">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <div className="space-y-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-sky-950 dark:text-sky-100">
                Regional issue tracking
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                  Coming soon
                </span>
              </p>
              <p className="text-sm leading-relaxed text-sky-900/80 dark:text-sky-200/80">
                Departmental staff will be able to report operational obstacles, escalate bottlenecks
                and track corrective actions here.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Open issues" value="—" detail="No data yet" icon={AlertCircle} tone="rose" />
            <StatCard label="In resolution" value="—" detail="No data yet" icon={Clock} tone="amber" />
            <StatCard label="Resolved" value="—" detail="No data yet" icon={CheckCircle2} tone="emerald" />
            <StatCard label="Categories" value="—" detail="No data yet" icon={Layers} tone="slate" />
          </div>

          <div className={cn(CARD, "flex flex-col items-center gap-2 p-12 text-center")}>
            <AlertCircle className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="font-medium text-foreground">Issue tracking is not enabled yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Issue intake and escalation for {regionName} will be enabled in an upcoming release.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
