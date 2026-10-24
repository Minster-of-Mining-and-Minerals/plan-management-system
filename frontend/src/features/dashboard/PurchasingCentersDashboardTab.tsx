"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Coins,
  Store,
  Scale,
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  FileCheck2,
  BarChart3,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetPurchasingCentersQuery } from "@/redux/api/purchasingCenterApi";
import { useGetFederalGoldOversightQuery } from "@/redux/api/goldApi";
import { FederalOversightView } from "@/features/gold-purchasing/FederalOversightView";
import { PurchasingCenterDashboardView } from "@/features/purchasing-center-management/PurchasingCenterDashboardView";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  AnalyticsPanel,
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { SimpleBarChart } from "@/features/plan-management/dashboard/components/SimpleBarChart";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function PurchasingCentersDashboardTab() {
  const { data: session } = useSession();
  const sessionUser = session?.user as
    | (Record<string, unknown> & {
        purchasing_center_id?: string;
        name?: string;
        email?: string;
      })
    | undefined;

  const userCenterId = sessionUser?.purchasing_center_id;
  const isCenterUser = Boolean(userCenterId);

  // Fetch purchasing centers registry
  const {
    data: centers = [],
    isLoading: isCentersLoading,
    isFetching: isCentersFetching,
    refetch: refetchCenters,
  } = useGetPurchasingCentersQuery();

  // Mode: "federal_overview" or "center_detail"
  const [viewMode, setViewMode] = useState<"overview" | "drilldown">(
    isCenterUser ? "drilldown" : "overview"
  );
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");

  const activeCenterId = useMemo(() => {
    if (userCenterId) return userCenterId;
    if (selectedCenterId) return selectedCenterId;
    if (centers.length > 0) return centers[0].purchasing_center_id;
    return "";
  }, [userCenterId, selectedCenterId, centers]);

  const activeCenter = useMemo(() => {
    return centers.find((c) => c.purchasing_center_id === activeCenterId);
  }, [centers, activeCenterId]);

  if (isCentersLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ----------------- PURCHASING CENTERS SCOPE HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Coins className="h-6 w-6 text-amber-500" />
              Gold Purchasing Centers Dashboard
            </h2>
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              Live Operations Data
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gold intake monitoring, canonical mass rollups, seller registry distributions, and daily operations compliance.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isCenterUser && centers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-2xs">
                <Button
                  variant={viewMode === "overview" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("overview")}
                  className="h-7 text-xs px-2.5 rounded-md"
                >
                  Federal Overview
                </Button>
                <Button
                  variant={viewMode === "drilldown" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("drilldown")}
                  className="h-7 text-xs px-2.5 rounded-md"
                >
                  Center Drilldown
                </Button>
              </div>

              {viewMode === "drilldown" && (
                <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1 shadow-xs">
                  <span className="text-xs font-medium text-muted-foreground">Center:</span>
                  <Select
                    value={activeCenterId}
                    onValueChange={(val) => setSelectedCenterId(val)}
                  >
                    <SelectTrigger className="h-7 border-none bg-transparent shadow-none text-xs font-semibold focus:ring-0 min-w-[180px]">
                      <SelectValue placeholder="Select center" />
                    </SelectTrigger>
                    <SelectContent>
                      {centers.map((c) => (
                        <SelectItem key={c.purchasing_center_id} value={c.purchasing_center_id} className="text-xs">
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCenters()}
            disabled={isCentersFetching}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCentersFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ----------------- PRIMARY CONTENT VIEW ----------------- */}
      {!isCenterUser && viewMode === "overview" ? (
        // Federal oversight view (includes today's national performance, seller distribution, center progress)
        <FederalOversightView />
      ) : activeCenterId ? (
        // Single Center deep-dive view
        <div className="space-y-4">
          <DashboardSectionHeader
            title={`Center Operations: ${activeCenter?.name || "Purchasing Center"}`}
            description="Live gold transactions, daily batch summaries, user capacity, and period intakes."
            badge="Live Telemetry"
          />
          <PurchasingCenterDashboardView
            overrideCenterId={activeCenterId}
            hideHeaderNavigation={true}
          />
        </div>
      ) : (
        <div className="p-8 text-center border rounded-2xl bg-muted/20 text-muted-foreground">
          <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-sm font-medium">No purchasing center records available for your account scope.</p>
        </div>
      )}

      {/* ----------------- STATIC PREVIEW SECTION (GLOBAL GOLD MARKET BENCHMARKS) ----------------- */}
      <div className="space-y-4 pt-6 border-t border-dashed border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <DashboardSectionHeader
            title="Static Preview: International Gold Market Benchmarks & Central Bank Premiums"
            description="Future LBMA spot price feed integration and National Bank of Ethiopia artisan incentive models."
            badge="Static Preview"
          />
          <Badge variant="outline" className="w-fit bg-amber-50 text-amber-700 border-amber-300 font-semibold px-2.5 py-1">
            Static Preview — Non-Production Preview
          </Badge>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-xs text-amber-900 leading-relaxed space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            Static Demonstration Notice
          </p>
          <p>
            The charts below show the anticipated integration with international gold market price feeds (LBMA Gold PM Fix) and official National Bank of Ethiopia purchase premiums.
            These are mock benchmarks. Live pricing telemetry will be hooked up once the backend financial feed integration service <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GET /api/v1/gold/market-benchmarks</code> is implemented.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsPanel
            title="LBMA Gold Spot Reference Price"
            description="Simulated 5-day international benchmark pricing in USD / Troy Ounce."
            headerAction={<Badge variant="secondary">Demo Feed</Badge>}
          >
            <SimpleBarChart
              title="LBMA Spot (USD/oz)"
              description="Daily PM Fix"
              valueSuffix=" USD"
              items={[
                { label: "Mon", value: 2724 },
                { label: "Tue", value: 2738 },
                { label: "Wed", value: 2745 },
                { label: "Thu", value: 2732 },
                { label: "Fri", value: 2750 },
              ]}
            />
          </AnalyticsPanel>

          <AnalyticsPanel
            title="NBE Artisan Gold Premium Incentive Rate"
            description="Simulated percentage incentive offered above international conversion rates to curb contraband."
            headerAction={<Badge variant="secondary">Demo Feed</Badge>}
          >
            <SimpleBarChart
              title="Incentive Rate (%)"
              description="NBE purchase premium"
              valueSuffix="%"
              items={[
                { label: "Standard Grade", value: 35 },
                { label: "High Purity (>92%)", value: 40 },
                { label: "Cooperative Direct", value: 42 },
                { label: "ASM Priority Zone", value: 45 },
              ]}
            />
          </AnalyticsPanel>
        </div>
      </div>
    </div>
  );
}
