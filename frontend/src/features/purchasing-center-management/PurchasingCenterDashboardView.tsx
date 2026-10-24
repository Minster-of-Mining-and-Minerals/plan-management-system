"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  Users,
  Store,
  ArrowRight,
  Activity,
  Coins,
  Scale,
  Calendar,
  FileCheck2,
  HardHat,
  Building2,
  TrendingUp,
  Clock,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useBranding } from "@/providers/BrandingProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { useGetPurchasingCenterDashboardQuery } from "@/redux/api/purchasingCenterApi";
import { useGetGoldCenterDashboardQuery } from "@/redux/api/goldApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  AnalyticsPanel,
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { useDashboardAppearance } from "@/features/plan-management/dashboard/hooks/useDashboardAppearance";

export interface PurchasingCenterDashboardViewProps {
  overrideCenterId?: string;
  hideHeaderNavigation?: boolean;
}

export function PurchasingCenterDashboardView({
  overrideCenterId,
  hideHeaderNavigation = false,
}: PurchasingCenterDashboardViewProps = {}) {
  const { data: session } = useSession();
  const { branding, logoPrimaryUrl } = useBranding();
  const { can } = usePermissions();
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  const { tone } = useDashboardAppearance();
  const primaryTone = tone("primary");

  const sessionUser = session?.user as
    | (Record<string, unknown> & {
        purchasing_center_id?: string;
        name?: string;
        email?: string;
      })
    | undefined;
  const activeCenterId = overrideCenterId || params?.id || sessionUser?.purchasing_center_id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/purchasing-center";

  // 1. Fetch purchasing center base metadata & user counts
  const {
    data: baseData,
    isLoading: isBaseLoading,
  } = useGetPurchasingCenterDashboardQuery(
    activeCenterId ? { purchasing_center_id: activeCenterId } : undefined
  );

  // 2. Fetch live gold purchasing dashboard aggregates
  const {
    data: goldData,
    isLoading: isGoldLoading,
  } = useGetGoldCenterDashboardQuery(
    activeCenterId ? { purchasing_center_id: activeCenterId } : undefined
  );

  if (isBaseLoading || isGoldLoading) {
    return <Loading01 />;
  }

  const centerInfo = baseData?.purchasing_center || goldData?.purchasing_center;
  const userCounts = baseData?.counts?.users;
  const today = goldData?.today;
  const period = goldData?.period_summary;
  const recentPurchases = goldData?.recent_purchases || [];
  const dailyTrends = goldData?.daily_trends || [];

  return (
    <div className="space-y-8">
      {/* ----------------- HEADER & WELCOME HERO ----------------- */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-sm relative overflow-hidden transition-all duration-300"
        style={{
          background: primaryTone.gradientBackground,
          borderColor: primaryTone.borderColor,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-background/95 border border-border shadow-md flex items-center justify-center p-2 shrink-0">
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
                <Coins className="h-8 w-8 text-amber-500" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {centerInfo?.name || "Gold Purchasing Center"}
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-semibold uppercase bg-background/80"
                  style={{
                    borderColor: primaryTone.borderColor,
                    color: primaryTone.color,
                  }}
                >
                  {centerInfo?.code || "PC"}
                </Badge>
                {centerInfo && <ActiveStatusBadge isActive={centerInfo.is_active} />}
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {centerInfo?.description ||
                  branding.system_tagline ||
                  "Operational Gold Purchasing Registry, Dynamic Unit Measurement, and Daily Reporting."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {can("GOLD_PURCHASES:CREATE") && (
              <Button asChild size="default" className="gap-2 shadow-sm font-semibold">
                <Link href={`${basePath}/purchases/new`}>
                  <PlusCircle className="h-4 w-4" />
                  Record Purchase
                </Link>
              </Button>
            )}

            {can("GOLD_REPORTS:READ") && (
              <Button asChild variant="outline" size="default" className="gap-2 bg-background/80 backdrop-blur-sm">
                <Link href={`${basePath}/reports/daily`}>
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  Today's Report
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

      {/* ----------------- TODAY'S PURCHASING OPERATIONS ----------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <DashboardSectionHeader
            title="Today's Purchasing Operations"
            description={`Live gold purchase volume and daily reporting status for business date: ${today?.business_date || "Today"}`}
          />
          <Badge
            variant={today?.report_status === "submitted" ? "default" : "outline"}
            className={
              today?.report_status === "submitted"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 py-1 px-3 text-xs"
                : today?.report_status === "unsubmitted"
                ? "border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-500/10 gap-1.5 py-1 px-3 text-xs"
                : "border-muted-foreground text-muted-foreground gap-1.5 py-1 px-3 text-xs"
            }
          >
            {today?.report_status === "submitted" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Daily Report Submitted
              </>
            ) : today?.report_status === "unsubmitted" ? (
              <>
                <AlertCircle className="h-3.5 w-3.5" /> Report Pending Submission
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" /> No Purchases Today
              </>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Today's Purchases"
            value={today?.purchases_count?.toLocaleString() || "0"}
            subtitle="Individual transactions recorded today"
            icon={Coins}
            accent="primary"
          />
          <KpiCard
            title="Today's Gold Quantity"
            value={`${(today?.canonical_quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Canonical weight (grams base)"
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title="Today's Total Value"
            value={`${(today?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
            subtitle="Total purchasing payout today"
            icon={DollarSign}
            accent="warning"
          />
          <KpiCard
            title="Daily Report Status"
            value={
              today?.report_status === "submitted"
                ? "Submitted"
                : today?.report_status === "unsubmitted"
                ? "Pending"
                : "Ready"
            }
            subtitle={
              today?.submitted_at
                ? `Submitted at ${new Date(today.submitted_at).toLocaleTimeString()}`
                : "Eligible purchases dynamically tracked"
            }
            icon={FileCheck2}
            accent={today?.report_status === "submitted" ? "success" : "info"}
          />
        </div>
      </div>

      {/* ----------------- CUMULATIVE PERIOD SUMMARY ----------------- */}
      <div className="space-y-4">
        <DashboardSectionHeader
          title="Cumulative Purchasing Statistics"
          description="Total gold acquired, canonical weight rollups, and distinct seller attribution"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Gold Purchases"
            value={period?.total_purchases?.toLocaleString() || "0"}
            subtitle="All completed purchasing records"
            icon={Coins}
            accent="primary"
          />
          <KpiCard
            title="Total Canonical Gold"
            value={`${(period?.total_canonical_quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Aggregated standard base unit"
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title="Total Purchase Payout"
            value={`${(period?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
            subtitle="Total value disbursed to sellers"
            icon={TrendingUp}
            accent="warning"
          />
          <KpiCard
            title="Sellers Served"
            value={period?.distinct_sellers?.total?.toLocaleString() || "0"}
            subtitle={`${period?.distinct_sellers?.companies || 0} Companies • ${period?.distinct_sellers?.asm || 0} ASM Miners`}
            icon={Users}
            accent="info"
          />
        </div>
      </div>

      {/* ----------------- BREAKDOWNS: UNIT BREAKDOWN & SELLER DISTRIBUTION ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Breakdown */}
        <AnalyticsPanel
          title="Recorded Quantity by Measurement Unit"
          description="Non-lossy totals displayed per configurable unit"
          headerAction={
            <Badge variant="outline" className="text-xs">
              {period?.unit_breakdown?.length || 0} Unit{period?.unit_breakdown?.length === 1 ? "" : "s"} Used
            </Badge>
          }
        >
          {period?.unit_breakdown && period.unit_breakdown.length > 0 ? (
            <div className="divide-y divide-border">
              {period.unit_breakdown.map((u) => (
                <div key={u.code} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs uppercase">
                      {u.symbol}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.purchase_count} transaction{u.purchase_count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono text-foreground">
                      {u.total_quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{" "}
                      <span className="text-xs font-normal text-muted-foreground">{u.symbol}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No purchase records found for the selected period.
            </div>
          )}
        </AnalyticsPanel>

        {/* Seller Distribution: Company vs ASM */}
        <AnalyticsPanel
          title="Seller Sourcing Distribution"
          description="Gold volume and transaction attribution between Companies and ASM Miners"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Company Card */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Companies</h4>
                  <p className="text-xs text-muted-foreground">Registered corporate suppliers</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold font-mono text-foreground">
                  {(period?.seller_distribution?.company?.canonical_quantity || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{" "}
                  <span className="text-xs font-normal text-muted-foreground">g</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {period?.seller_distribution?.company?.count || 0} transactions •{" "}
                  {(period?.seller_distribution?.company?.amount || 0).toLocaleString()} ETB
                </p>
              </div>
            </div>

            {/* ASM Miner Card */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <HardHat className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">ASM Miners</h4>
                  <p className="text-xs text-muted-foreground">Artisanal & small-scale miners</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold font-mono text-foreground">
                  {(period?.seller_distribution?.asm?.canonical_quantity || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{" "}
                  <span className="text-xs font-normal text-muted-foreground">g</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {period?.seller_distribution?.asm?.count || 0} transactions •{" "}
                  {(period?.seller_distribution?.asm?.amount || 0).toLocaleString()} ETB
                </p>
              </div>
            </div>
          </div>
        </AnalyticsPanel>
      </div>

      {/* ----------------- RECENT GOLD PURCHASES REGISTER ----------------- */}
      <AnalyticsPanel
        title="Recent Gold Purchases"
        description="Latest purchasing transactions recorded by this purchasing center"
        headerAction={
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link href={`${basePath}/purchases`}>
              View Full Register <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        {recentPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Seller</th>
                  <th className="py-3 px-4 font-semibold">Quantity</th>
                  <th className="py-3 px-4 font-semibold">Base (g)</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPurchases.map((p) => (
                  <tr key={p.purchase_id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {p.purchase_reference}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {p.business_date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            p.seller_type === "company"
                              ? "text-sky-600 dark:text-sky-400 border-sky-400/30 text-[10px]"
                              : "text-amber-600 dark:text-amber-400 border-amber-400/30 text-[10px]"
                          }
                        >
                          {p.seller_type === "company" ? "Company" : "ASM"}
                        </Badge>
                        <span className="font-medium text-foreground">{p.seller_name_snapshot}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {parseFloat(String(p.quantity)).toLocaleString()}{" "}
                      <span className="text-xs text-muted-foreground">{p.unit_code_snapshot}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {parseFloat(String(p.quantity_in_canonical_unit)).toLocaleString()} g
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">
                      {parseFloat(String(p.total_amount)).toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={p.status === "completed" ? "default" : "destructive"}
                        className={
                          p.status === "completed"
                            ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                            : "text-[11px]"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                        <Link href={`${basePath}/purchases/${p.purchase_id}`}>
                          Details <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm space-y-3">
            <Coins className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p>No gold purchase records have been registered yet.</p>
            {can("GOLD_PURCHASES:CREATE") && (
              <Button asChild size="sm" className="gap-2">
                <Link href={`${basePath}/purchases/new`}>
                  <PlusCircle className="h-4 w-4" /> Record First Purchase
                </Link>
              </Button>
            )}
          </div>
        )}
      </AnalyticsPanel>

      {/* ----------------- CENTER ACCOUNTS SUMMARY ----------------- */}
      <AnalyticsPanel
        title="Purchasing Center Staff & Accounts"
        description="Direct center users (no departments or hierarchical structures)"
        headerAction={
          can("PURCHASING_CENTER_USERS:READ") ? (
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link href={`${basePath}/users`}>
                Manage Staff <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Total Staff Accounts</p>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {userCounts?.total || 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Active Staff</p>
            <p className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {userCounts?.active || 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Direct Membership</p>
            <p className="text-sm font-semibold mt-1 text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Center Bound
            </p>
          </div>
        </div>
      </AnalyticsPanel>
    </div>
  );
}
