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
import {
  useGetFederalGoldOversightQuery,
} from "@/redux/api/goldApi";
import { FederalOversightView } from "@/features/gold-purchasing/FederalOversightView";
import { PurchasingCenterDashboardView } from "@/features/purchasing-center-management/PurchasingCenterDashboardView";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
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
    </div>
  );
}
