"use client";

import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useBranding } from "@/providers/BrandingProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { useGetRegionalDashboardQuery } from "@/redux/api/regionApi";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function RegionalDashboardView() {
  const { data: session } = useSession();
  const { branding, logoPrimaryUrl } = useBranding();
  const { can } = usePermissions();

  const user = session?.user;
  const regionId = user?.region_id;
  const basePath = regionId ? `/regions/${regionId}` : "/regional";

  const { data: dashboardData, isLoading, error } = useGetRegionalDashboardQuery(
    regionId ? { region_id: regionId } : undefined,
    { skip: !regionId }
  );

  if (isLoading) {
    return <Loading01 />;
  }

  if (error || !dashboardData) {
    return (
      <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
        <h3 className="text-lg font-semibold">Unable to load regional dashboard</h3>
        <p className="text-sm mt-1 text-muted-foreground">
          Please check your connection or contact an administrator.
        </p>
      </div>
    );
  }

  const { region, counts, recent_departments, recent_users } = dashboardData;
  const regionName = region?.name || branding.system_name_full || "Regional Bureau";
  const regionCode = region?.code || "REG";

  const canManageDepts = can("REGIONAL_STRUCTURES:READ") || can("REGIONAL_STRUCTURES:MANAGE");
  const canManageUsers = can("REGIONAL_USERS:READ") || can("REGIONAL_USERS:MANAGE");
  const canManageBranding = can("REGIONAL_BRANDING:READ") || can("REGIONAL_BRANDING:MANAGE");

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Hero Identity Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-primary/5 p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {logoPrimaryUrl ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-background/80 p-2 shadow-sm backdrop-blur">
                <Image
                  src={logoPrimaryUrl}
                  alt={`${regionName} logo`}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                <Building2 className="h-10 w-10" />
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {regionCode} Regional Administration
                </span>
                <ActiveStatusBadge isActive={region?.is_active ?? true} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <MapPin className="h-7 w-7 text-primary shrink-0" />
                {regionName}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {branding.system_tagline || "Regional Operational Workspace and Administrative Center"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="rounded-xl border border-border/60 bg-background/60 p-3.5 backdrop-blur text-sm">
              <div className="text-xs text-muted-foreground font-medium">Logged in user</div>
              <div className="font-semibold text-foreground truncate max-w-[180px]">{user?.name}</div>
              <div className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Departments */}
        <Card className="border border-border/70 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Departments
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {counts.departments.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="font-medium text-emerald-600">{counts.departments.root} root</span>
              <span>•</span>
              <span>{counts.departments.active} active</span>
            </p>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="border border-border/70 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {counts.users.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="font-medium text-blue-600">{counts.users.active} active</span>
              <span>•</span>
              <span>{counts.users.assigned} in departments</span>
            </p>
          </CardContent>
        </Card>

        {/* Department Assigned Users */}
        <Card className="border border-border/70 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staff Placement
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {counts.users.assigned}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {counts.users.unassigned} unassigned users
            </p>
          </CardContent>
        </Card>

        {/* Domain Scope */}
        <Card className="border border-border/70 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Security Scope
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tracking-tight text-foreground">
              {regionCode} Domain
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Strict region boundary enforced
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {canManageDepts && (
          <Link
            href={`${basePath}/departments`}
            className="group block rounded-xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold mt-4 text-foreground">Departments</h3>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage the organizational hierarchy and departmental divisions.
            </p>
          </Link>
        )}

        {canManageUsers && (
          <Link
            href={`${basePath}/users`}
            className="group block rounded-xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold mt-4 text-foreground">Users</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Administer regional accounts, department assignments, and permission roles.
            </p>
          </Link>
        )}

        {canManageBranding && (
          <Link
            href={`${basePath}/settings`}
            className="group block rounded-xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Paintbrush className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold mt-4 text-foreground">Settings & Branding</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Customize region-specific colors, logo, and system identification.
            </p>
          </Link>
        )}
      </div>

      {/* Two Column Layout: Recent Departments & Recent Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Departments */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Departments
              </CardTitle>
              <CardDescription className="text-xs">
                Recently established organizational units
              </CardDescription>
            </div>
            {canManageDepts && (
              <Button asChild variant="outline" size="sm">
                <Link href={`${basePath}/departments`}>View All</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recent_departments.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg">
                No departments configured yet for this region.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border">
                {recent_departments.map((dept) => (
                  <div
                    key={dept.regional_structure_id}
                    className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        L{dept.level}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-medium text-foreground truncate">{dept.name}</div>
                        <div className="text-xs text-muted-foreground">Level {dept.level} Directorate</div>
                      </div>
                    </div>
                    <ActiveStatusBadge isActive={dept.is_active} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Users
              </CardTitle>
              <CardDescription className="text-xs">
                Recently registered accounts in {regionName}
              </CardDescription>
            </div>
            {canManageUsers && (
              <Button asChild variant="outline" size="sm">
                <Link href={`${basePath}/users`}>View All</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recent_users.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg">
                No users registered yet in this region.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border">
                {recent_users.map((u) => {
                  const roleName = u.roles?.[0]?.name || "Regional Member";
                  const deptName = u.regional_structure?.name || "Unassigned";

                  return (
                    <div
                      key={u.user_id}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 font-semibold text-xs flex items-center justify-center shrink-0">
                          {u.full_name?.charAt(0) || "U"}
                        </div>
                        <div className="truncate">
                          <div className="text-sm font-medium text-foreground truncate">{u.full_name}</div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
