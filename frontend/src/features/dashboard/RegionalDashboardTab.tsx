"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  MapPin,
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Globe2,
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
import { useGetRegionsQuery, useGetRegionalRolesQuery } from "@/redux/api/regionApi";
import { RegionalDashboardView } from "@/features/regional-management/RegionalDashboardView";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  AnalyticsPanel,
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { SimpleBarChart } from "@/features/plan-management/dashboard/components/SimpleBarChart";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function RegionalDashboardTab() {
  const { data: session } = useSession();
  const user = session?.user;
  const isRegionalUser = Boolean(user?.region_id);

  // Fetch list of all regions (for federal or multi-regional oversight)
  const {
    data: regions = [],
    isLoading: isRegionsLoading,
    isFetching: isRegionsFetching,
    refetch: refetchRegions,
  } = useGetRegionsQuery();

  const { data: regionalRoles = [] } = useGetRegionalRolesQuery();

  // If the user has a specific region assigned, default to that; otherwise default to first available region
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");

  const activeRegionId = useMemo(() => {
    if (user?.region_id) return user.region_id;
    if (selectedRegionId) return selectedRegionId;
    if (regions.length > 0) return regions[0].region_id;
    return "";
  }, [user?.region_id, selectedRegionId, regions]);

  const activeRegion = useMemo(() => {
    return regions.find((r) => r.region_id === activeRegionId);
  }, [regions, activeRegionId]);

  const totalRegions = regions.length;
  const activeRegionsCount = regions.filter((r) => r.is_active).length;

  if (isRegionsLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ----------------- REGIONAL SCOPE HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <MapPin className="h-6 w-6 text-emerald-600" />
              Regional Management Dashboard
            </h2>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              Live Domain Data
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Regional state mining administrative oversight, plan execution tracking, and departmental capacity.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isRegionalUser && regions.length > 0 && (
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">Select Region:</span>
              <Select
                value={activeRegionId}
                onValueChange={(val) => setSelectedRegionId(val)}
              >
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none text-xs font-semibold focus:ring-0 min-w-[180px]">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((reg) => (
                    <SelectItem key={reg.region_id} value={reg.region_id} className="text-xs">
                      {reg.name} ({reg.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchRegions()}
            disabled={isRegionsFetching}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegionsFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ----------------- NATIONAL REGIONAL ROSTER OVERVIEW ----------------- */}
      {!isRegionalUser && (
        <div className="space-y-4">
          <DashboardSectionHeader
            title="National Regional Administration Overview"
            description="Federation-wide summary of active regional mineral bureaus and administrative infrastructure."
            badge="Federation Roster"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Registered Regions"
              value={totalRegions}
              subtitle="Regional state mining authorities"
              icon={Building2}
              accent="secondary"
            />
            <KpiCard
              title="Active Administrations"
              value={activeRegionsCount}
              subtitle={`${totalRegions > 0 ? Math.round((activeRegionsCount / totalRegions) * 100) : 0}% operational coverage`}
              icon={CheckCircle2}
              accent="success"
            />
            <KpiCard
              title="Regional Roles Configured"
              value={regionalRoles.length}
              subtitle="Cross-regional RBAC profiles"
              icon={Users}
              accent="secondary"
            />
            <KpiCard
              title="Selected Jurisdiction"
              value={activeRegion?.code || "None"}
              subtitle={activeRegion?.name || "No region selected"}
              icon={MapPin}
              accent="accent"
            />
          </div>
        </div>
      )}

      {/* ----------------- LIVE REGIONAL DASHBOARD DEEP DIVE ----------------- */}
      {activeRegionId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <DashboardSectionHeader
              title={`Jurisdiction Execution: ${activeRegion?.name || "Regional State"}`}
              description="Live regional execution dashboard, user deployment rates, and departmental scorecard."
              badge="Live Telemetry"
            />
          </div>

          <RegionalDashboardView
            overrideRegionId={activeRegionId}
            hideHeaderNavigation={true}
          />
        </div>
      ) : (
        <div className="p-8 text-center border rounded-2xl bg-muted/20 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-sm font-medium">No regional jurisdictions available for your account scope.</p>
        </div>
      )}

      {/* ----------------- STATIC PREVIEW SECTION (CROSS-REGIONAL FORECASTING) ----------------- */}
      <div className="space-y-4 pt-6 border-t border-dashed border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <DashboardSectionHeader
            title="Static Preview: Multi-Regional Mineral Production Forecast"
            description="Future cross-regional production telemetry and geological survey reporting interface."
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
            The charts below depict the intended user experience for federation-level cross-regional mineral output quotas and geological survey submissions.
            These figures are curated demonstration datasets. Real telemetry will connect dynamically once the future backend endpoint <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GET /api/v1/regions/analytics/production-forecast</code> is deployed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsPanel
            title="Forecasted Gold Production by Region"
            description="Estimated seasonal production distribution across principal artisanal & industrial zones."
            headerAction={<Badge variant="secondary">Demo Dataset</Badge>}
          >
            <SimpleBarChart
              title="Regional Output (MT)"
              description="Forecasted metric tons"
              valueSuffix=" MT"
              items={[
                { label: "Oromia", value: 4.8 },
                { label: "Benishangul", value: 3.9 },
                { label: "Tigray", value: 2.1 },
                { label: "Sidama", value: 1.4 },
                { label: "Amhara", value: 1.1 },
                { label: "Gambela", value: 0.8 },
              ]}
            />
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Regional Compliance & Reporting Timeliness"
            description="Simulated percentage of regional environmental and mineral shipment reports filed on time."
            headerAction={<Badge variant="secondary">Demo Dataset</Badge>}
          >
            <SimpleBarChart
              title="On-Time Reporting Rate"
              description="Submission punctuality percentage"
              valueSuffix="%"
              items={[
                { label: "Oromia", value: 92 },
                { label: "Benishangul", value: 85 },
                { label: "Tigray", value: 78 },
                { label: "Sidama", value: 88 },
                { label: "Amhara", value: 74 },
                { label: "Gambela", value: 68 },
              ]}
            />
          </AnalyticsPanel>
        </div>
      </div>
    </div>
  );
}
