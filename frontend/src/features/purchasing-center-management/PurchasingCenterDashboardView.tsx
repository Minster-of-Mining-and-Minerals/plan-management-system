"use client";

import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  Users,
  ShieldCheck,
  Paintbrush,
  Store,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Shield,
  Activity,
  ShoppingCart,
  TrendingUp,
  Truck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useBranding } from "@/providers/BrandingProvider";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetPurchasingCenterDashboardQuery,
  useGetPurchasingCenterRolesQuery,
} from "@/redux/api/purchasingCenterApi";
import Loading01 from "@/features/template/component/Loading/Loading01";

// Shared dashboard presentation components
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  AnalyticsPanel,
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { useDashboardAppearance } from "@/features/plan-management/dashboard/hooks/useDashboardAppearance";

type DashboardTab = "overview" | "procurement-preview" | "suppliers-preview";

export function PurchasingCenterDashboardView() {
  const { data: session } = useSession();
  const { branding, logoPrimaryUrl } = useBranding();
  const { can } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string }>();

  const { tone } = useDashboardAppearance();
  const primaryTone = tone("primary");

  const sessionUser = session?.user as (Record<string, unknown> & { purchasing_center_id?: string; name?: string; email?: string }) | undefined;
  const activeCenterId = params?.id || sessionUser?.purchasing_center_id;
  const basePath = activeCenterId ? `/purchasing-centers/${activeCenterId}` : "/purchasing-center";

  const requestedTab = searchParams.get("tab") as DashboardTab | null;
  const activeTab: DashboardTab =
    requestedTab === "procurement-preview"
      ? "procurement-preview"
      : requestedTab === "suppliers-preview"
      ? "suppliers-preview"
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

  // 1. Fetch live purchasing center dashboard summary
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
  } = useGetPurchasingCenterDashboardQuery(
    activeCenterId ? { purchasing_center_id: activeCenterId } : undefined
  );

  // 2. Fetch center scoped roles
  const { data: roles = [] } = useGetPurchasingCenterRolesQuery();

  const counts = dashboardData?.counts;
  const centerInfo = dashboardData?.purchasing_center;
  const recentUsers = dashboardData?.recent_users || [];

  if (isDashboardLoading) {
    return <Loading01 />;
  }

  const totalUsers = counts?.users.total || 0;
  const activeUsers = counts?.users.active || 0;
  const inactiveUsers = counts?.users.inactive || 0;

  return (
    <div className="space-y-6">
      {/* ----------------- HEADER & WELCOME SECTION ----------------- */}
      <div
        className="rounded-2xl p-6 sm:p-8 border shadow-sm relative overflow-hidden transition-all duration-300"
        style={{
          background: primaryTone.gradientBackground,
          borderColor: primaryTone.borderColor,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-background/90 border border-border shadow-md flex items-center justify-center p-2 shrink-0">
              {logoPrimaryUrl ? (
                <Image
                  src={logoPrimaryUrl}
                  alt={centerInfo?.name || "Purchasing Center Logo"}
                  width={48}
                  height={48}
                  className="max-h-12 w-auto object-contain rounded-lg"
                  unoptimized
                />
              ) : (
                <Store className="h-8 w-8 text-primary" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {centerInfo?.name || "Purchasing Center Workspace"}
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-semibold uppercase bg-background/80"
                  style={{ borderColor: primaryTone.borderColor, color: primaryTone.color }}
                >
                  {centerInfo?.code || "PC"}
                </Badge>
                {centerInfo && <ActiveStatusBadge isActive={centerInfo.is_active} />}
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {branding.system_tagline ||
                  "Independent Mineral Purchasing Operations & Administrative Workspace."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {can("PURCHASING_CENTER_USERS:READ") && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 bg-background/80 backdrop-blur-sm border-border hover:bg-background shadow-xs text-foreground"
              >
                <Link href={`${basePath}/users`}>
                  <Users className="h-4 w-4 text-primary" />
                  Staff Accounts
                </Link>
              </Button>
            )}

            {can("PURCHASING_CENTER_BRANDING:READ") && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 bg-background/80 backdrop-blur-sm border-border hover:bg-background shadow-xs text-foreground"
              >
                <Link href={`${basePath}/settings`}>
                  <Paintbrush className="h-4 w-4 text-amber-600" />
                  Branding & Theme
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-20 pointer-events-none blur-3xl"
          style={{ background: primaryTone.color }}
        />
      </div>

      {/* ----------------- SUBNAV TABS ----------------- */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <Button
          variant={activeTab === "overview" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("overview")}
          className="gap-2 text-xs font-medium"
        >
          <Activity className="h-3.5 w-3.5" />
          Center Overview & Accounts
        </Button>
        <Button
          variant={activeTab === "procurement-preview" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("procurement-preview")}
          className="gap-2 text-xs font-medium"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Procurement Operations
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
            Preview
          </span>
        </Button>
        <Button
          variant={activeTab === "suppliers-preview" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("suppliers-preview")}
          className="gap-2 text-xs font-medium"
        >
          <Truck className="h-3.5 w-3.5" />
          Suppliers & Logistics
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
            Preview
          </span>
        </Button>
      </div>

      {/* ----------------- TAB 1: OVERVIEW & ACCOUNTS (REAL DATA) ----------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric Summary Cards (Backed by real database queries, ZERO departments!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Center Accounts"
              value={totalUsers}
              subtitle="Direct membership accounts"
              icon={Users}
              accent="primary"
            />
            <KpiCard
              title="Active Center Staff"
              value={activeUsers}
              subtitle="Authorized operational users"
              icon={UserCheck}
              accent="accent"
            />
            <KpiCard
              title="Inactive Accounts"
              value={inactiveUsers}
              subtitle="Suspended or pending access"
              icon={Shield}
              accent="secondary"
            />
            <KpiCard
              title="Defined Center Roles"
              value={roles.length}
              subtitle="Scoped security roles"
              icon={ShieldCheck}
              accent="primary"
            />
          </div>

          {/* Center Details & Organizational Architecture Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AnalyticsPanel
                title="Recent Authorized Staff"
                description="Accounts registered directly under this purchasing center (no departments)"
                headerAction={
                  <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href={`${basePath}/users`}>
                      View All <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                }
              >
                {recentUsers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {recentUsers.slice(0, 5).map((u) => (
                      <div key={u.user_id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {u.full_name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{u.full_name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.roles && u.roles.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium">
                              {u.roles[0].name}
                            </span>
                          )}
                          <ActiveStatusBadge isActive={u.is_active} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No authorized accounts registered under this center yet.
                  </div>
                )}
              </AnalyticsPanel>
            </div>

            {/* Invariant & Scope Notice Card */}
            <div className="space-y-4">
              <AnalyticsPanel
                title="Domain Security Model"
                description="Direct Purchasing Center Architecture"
              >
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Zero-Department Invariant
                    </p>
                    Purchasing-center users belong directly to this center without departmental hierarchies.
                  </div>

                  <div className="p-3 rounded-lg bg-muted/60 border border-border">
                    <p className="font-semibold text-foreground mb-1">Domain Exclusivity</p>
                    Accounts in this center cannot operate simultaneously as federal or regional users.
                  </div>

                  <div className="p-3 rounded-lg bg-muted/60 border border-border">
                    <p className="font-semibold text-foreground mb-1">Isolated Workspace</p>
                    Center branding and administrative configurations apply only within this center&apos;s boundary.
                  </div>
                </div>
              </AnalyticsPanel>
            </div>
          </div>

          {/* Static Presentation Panels for Future Functionality (Clearly labeled "Coming soon", NO fake numbers!) */}
          <div className="border-t pt-6 space-y-4">
            <DashboardSectionHeader
              title="Future Procurement Capabilities"
              description="Presentation-only preview of operational modules planned for subsequent phases."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-dashed border-border bg-card/50 text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">Purchase Order Workflow</h4>
                <p className="text-xs text-muted-foreground">
                  Purchase requests, order fulfillment tracking, and procurement approval pipelines.
                </p>
                <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Coming soon
                </span>
              </div>

              <div className="p-5 rounded-xl border border-dashed border-border bg-card/50 text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Truck className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">Supplier Management</h4>
                <p className="text-xs text-muted-foreground">
                  Registered mineral vendors, supplier agreements, and compliance records.
                </p>
                <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Coming soon
                </span>
              </div>

              <div className="p-5 rounded-xl border border-dashed border-border bg-card/50 text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">Procurement Analytics</h4>
                <p className="text-xs text-muted-foreground">
                  Purchasing trends, mineral transaction ledgers, and operational reporting.
                </p>
                <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Coming soon
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: PROCUREMENT PREVIEW (STATIC PLACEHOLDER) ----------------- */}
      {activeTab === "procurement-preview" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-sm">
            <Clock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Procurement Operations — Coming Soon</p>
              <p className="text-xs mt-0.5 opacity-90">
                This preview represents future procurement lifecycle capabilities. No active transactions are recorded in this phase.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnalyticsPanel
              title="Purchase Orders Overview"
              description="Presentation preview of transaction order tracking"
            >
              <div className="py-12 text-center space-y-3 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">Order management module is not yet available.</p>
                <p className="text-xs max-w-sm mx-auto">
                  Procurement request intake and batch purchasing workflows will be enabled in subsequent releases.
                </p>
              </div>
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Procurement Approval Pipeline"
              description="Presentation preview of authorization milestones"
            >
              <div className="py-12 text-center space-y-3 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">Approval pipeline not yet enabled.</p>
                <p className="text-xs max-w-sm mx-auto">
                  Configurable threshold verification and purchase validations will appear here once implemented.
                </p>
              </div>
            </AnalyticsPanel>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: SUPPLIERS PREVIEW (STATIC PLACEHOLDER) ----------------- */}
      {activeTab === "suppliers-preview" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-sm">
            <Clock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Supplier Management & Logistics — Coming Soon</p>
              <p className="text-xs mt-0.5 opacity-90">
                Supplier registration, compliance verification, and delivery performance metrics are not yet implemented.
              </p>
            </div>
          </div>

          <AnalyticsPanel
            title="Supplier Registry Preview"
            description="Presentation placeholder for vendor directory"
          >
            <div className="py-16 text-center space-y-3 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">Supplier directory is not yet available.</p>
              <p className="text-xs max-w-md mx-auto">
                No mock supplier data is presented. Real vendor catalogs and supplier performance scores will be populated upon feature delivery.
              </p>
            </div>
          </AnalyticsPanel>
        </div>
      )}
    </div>
  );
}
