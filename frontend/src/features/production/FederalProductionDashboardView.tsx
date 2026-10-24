"use client";

import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  Scale,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetFederalProductionDashboardQuery,
  useGetProductionItemsQuery,
} from "@/redux/api/productionApi";
import { useGetCompaniesQuery } from "@/redux/api/companyApi";

export function FederalProductionDashboardView() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState("");

  const queryParams = useMemo(() => {
    const p: any = {};
    if (selectedCompanyId !== "all") p.company_id = selectedCompanyId;
    if (selectedItemId !== "all") p.production_item_id = selectedItemId;
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    return p;
  }, [selectedCompanyId, selectedItemId, startDate, endDate]);

  const { data: dashboard, isLoading, refetch } = useGetFederalProductionDashboardQuery(queryParams);
  const { data: companies = [] } = useGetCompaniesQuery();
  const { data: items = [] } = useGetProductionItemsQuery();

  const filteredAssignments = useMemo(() => {
    if (!dashboard?.assignments) return [];
    return dashboard.assignments.filter((a) => {
      const cName = a.company?.name || "";
      const iName = a.production_item?.name || "";
      return (
        !search.trim() ||
        cName.toLowerCase().includes(search.toLowerCase()) ||
        iName.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [dashboard, search]);

  if (isLoading) {
    return <Loading01 />;
  }

  const kpis = dashboard?.kpis || {
    active_assignments: 0,
    reporting_companies: 0,
    active_production_items: 0,
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/20 p-2 backdrop-blur-sm">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">
                Federal Company Production Dashboard
              </h1>
            </div>
            <p className="mt-1 text-sm text-teal-100">
              National oversight of mineral and commodity production reporting, target compliance, and achievement.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Analytics
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Reporting Companies</span>
            <Building2 className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {kpis.reporting_companies}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Active mining enterprises</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Item Assignments</span>
            <Scale className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {kpis.active_assignments}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Production schedules running</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Monitored Commodities</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {kpis.active_production_items}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Configured in national registry</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Recent Submissions</span>
            <Clock className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {dashboard?.recent_reports?.length || 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Production reports in window</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company or production item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 h-9"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 h-9"
          >
            <option value="all">All Production Items</option>
            {items.map((i) => (
              <option key={i.production_item_id} value={i.production_item_id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 text-xs"
          />
          <Input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Company Performance Breakdown Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Company Production Progress & Target Compliance</h2>
          <span className="text-xs text-muted-foreground">
            Showing {filteredAssignments.length} assigned production flows
          </span>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center bg-card/40">
            <Scale className="mx-auto h-12 w-12 text-muted-foreground/30 mb-2" />
            <h3 className="font-semibold text-base">No production assignments match criteria</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try resetting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredAssignments.map((a) => {
              const perf = a.performance;
              const hasTarget = perf.has_target && perf.target_quantity !== null;
              const achievement = perf.achievement_percentage || 0;
              const unitSymbol = perf.display_unit?.symbol || "units";

              return (
                <div
                  key={a.assignment_id}
                  className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Company & Item Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-teal-600" />
                          {a.company?.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
                            {a.company?.code}
                          </Badge>
                          <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                            {a.production_item?.name}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge variant="secondary" className="capitalize text-[11px]">
                          {a.reporting_frequency?.name || "Daily"} Reporting
                        </Badge>
                        <span className="block text-[10px] text-muted-foreground mt-1 capitalize">
                          {a.target_allocation_depth.replace("_", " ")} targets
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Figures */}
                    <div className="mt-4 p-4 rounded-xl bg-muted/30 border space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-xs text-muted-foreground block">
                            Cumulative Actual ({perf.period.period_label}):
                          </span>
                          <span className="text-2xl font-black text-foreground">
                            {perf.actual_quantity.toLocaleString()}{" "}
                            <span className="text-xs font-normal text-muted-foreground">{unitSymbol}</span>
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">Target:</span>
                          <span className="text-lg font-bold text-foreground">
                            {hasTarget ? `${perf.target_quantity?.toLocaleString()} ${unitSymbol}` : "Unset"}
                          </span>
                        </div>
                      </div>

                      {/* Achievement Progress Bar */}
                      {hasTarget && (
                        <div className="space-y-1.5">
                          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                perf.is_overachieved
                                  ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                  : achievement >= 75
                                  ? "bg-emerald-500"
                                  : achievement >= 40
                                  ? "bg-amber-500"
                                  : "bg-teal-500"
                              }`}
                              style={{ width: `${Math.min(100, achievement)}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-xs font-semibold">
                            <span className={perf.is_overachieved ? "text-emerald-600 font-bold" : "text-foreground"}>
                              {achievement}% Achieved {perf.is_overachieved && "★ Overachieved"}
                            </span>
                            <span className="text-muted-foreground">
                              {perf.remaining_quantity !== null && perf.remaining_quantity > 0
                                ? `${perf.remaining_quantity.toLocaleString()} ${unitSymbol} remaining`
                                : "Target Met"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Projected Estimate Badge (clearly labeled as estimate) */}
                    {perf.projected_estimate && (
                      <div className="mt-3 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Calculated Expectation: Expected Pace to Date</span>
                        </div>
                        <div className="mt-1 flex justify-between text-indigo-700 dark:text-indigo-300">
                          <span>
                            Pace: {perf.projected_estimate.expected_pace_to_date.toLocaleString()} {unitSymbol} ({perf.projected_estimate.elapsed_days}/{perf.projected_estimate.total_period_days} days)
                          </span>
                          <span className="font-semibold">
                            Pace Performance: {perf.projected_estimate.pace_achievement_percentage || 0}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reporting Compliance Footer */}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Reports Submitted:</span>
                        <span className="font-bold text-foreground">
                          {perf.reporting_compliance?.submitted_reports || perf.report_count}
                        </span>
                      </div>
                      {perf.reporting_compliance && perf.reporting_compliance.expected_reports > 0 && (
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Expected / Missing:</span>
                          <span className="font-bold text-foreground">
                            {perf.reporting_compliance.expected_reports} /{" "}
                            <span className={perf.reporting_compliance.missing_reports > 0 ? "text-destructive font-bold" : ""}>
                              {perf.reporting_compliance.missing_reports} missing
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Compliance Rate:</span>
                      <Badge
                        variant={
                          (perf.reporting_compliance?.compliance_rate || 0) >= 90
                            ? "default"
                            : "outline"
                        }
                      >
                        {perf.reporting_compliance?.compliance_rate || 100}%
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Production Reports Feed */}
      {dashboard?.recent_reports && dashboard.recent_reports.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-teal-600" />
            Recent Production Report Submissions
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3 text-right">Reported Quantity</th>
                  <th className="py-2.5 px-3 text-right">Normalized Base</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dashboard.recent_reports.map((r) => (
                  <tr key={r.report_id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 font-mono font-medium">{r.report_date}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{r.company?.name}</td>
                    <td className="py-2.5 px-3">{r.productionItem?.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {Number(r.quantity_reported).toLocaleString()} {r.reportedUnit?.symbol}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {Number(r.normalized_quantity).toLocaleString()} base
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          r.status === "approved"
                            ? "default"
                            : r.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                        className="capitalize text-[10px]"
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
