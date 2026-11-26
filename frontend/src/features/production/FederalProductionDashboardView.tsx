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
  Target,
  Award,
  Factory,
  ShieldCheck,
  BarChart3,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetFederalProductionDashboardQuery,
  useGetProductionItemsQuery,
} from "@/redux/api/productionApi";
import { useGetCompaniesQuery } from "@/redux/api/companyApi";

export function FederalProductionDashboardView() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      const cCode = a.company?.code || "";
      const iName = a.production_item?.name || "";
      const perf = a.performance;
      const actual = Number(perf?.actual_quantity || 0);
      const target = Number(perf?.target_quantity || 0);
      const ach = perf?.achievement_percentage ?? (target > 0 ? (actual / target) * 100 : 0);

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !cName.toLowerCase().includes(q) &&
          !cCode.toLowerCase().includes(q) &&
          !iName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === "active" && actual <= 0) return false;
      if (statusFilter === "completed" && ach < 100) return false;
      if (statusFilter === "on_track" && (ach < 70 || ach >= 100)) return false;
      if (statusFilter === "moderate" && (ach < 40 || ach >= 70)) return false;
      if (statusFilter === "at_risk" && (ach >= 40 || target <= 0)) return false;

      return true;
    });
  }, [dashboard, search, statusFilter]);

  if (isLoading) {
    return <Loading01 />;
  }

  const kpis = dashboard?.kpis || {
    active_assignments: 0,
    reporting_companies: 0,
    active_production_items: 0,
    companies_with_reports: 0,
    companies_with_targets: 0,
    total_target_quantity: 0,
    total_actual_quantity: 0,
    net_variance: 0,
    overall_achievement_percentage: 0,
    total_expected_reports: 0,
    total_submitted_reports: 0,
    overall_compliance_rate: 100,
    completed_count: 0,
    on_track_count: 0,
    moderate_count: 0,
    at_risk_count: 0,
  };

  const totalTarget = Number(kpis.total_target_quantity || 0);
  const totalActual = Number(kpis.total_actual_quantity || 0);
  const achievementPct = Number(kpis.overall_achievement_percentage || 0);
  const netVariance = Number(kpis.net_variance ?? (totalActual - totalTarget));
  const complianceRate = Number(kpis.overall_compliance_rate ?? 100);

  const recentReportColumns: ColumnDef<any>[] = [
    {
      accessorKey: "report_date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-xs">{row.original.report_date}</span>
      ),
    },
    {
      id: "company",
      header: "Company",
      cell: ({ row }) => (
        <span className="font-medium text-foreground text-xs">{row.original.company?.name}</span>
      ),
    },
    {
      id: "item",
      header: "Item",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.productionItem?.name}</span>
      ),
    },
    {
      id: "quantity_reported",
      header: "Reported Quantity",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-xs">
          {Number(row.original.quantity_reported).toLocaleString()}{" "}
          {row.original.reportedUnit?.symbol}
        </span>
      ),
    },
    {
      id: "normalized_quantity",
      header: "Normalized Base",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs">
          {Number(row.original.normalized_quantity).toLocaleString()} base
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={
              s === "approved"
                ? "default"
                : s === "rejected"
                ? "destructive"
                : "secondary"
            }
            className="capitalize text-[10px]"
          >
            {s}
          </Badge>
        );
      },
    },
  ];

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
              National oversight of mineral and commodity production reporting, target compliance, and achievement statistics.
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

      {/* Target Achievement & Portfolio KPI Suite (6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* 1. Approved Target */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Approved Target</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Target className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono truncate">
            {totalTarget.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            National annual commitment
          </p>
        </div>

        {/* 2. Total Extracted Output */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Total Extracted</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono truncate">
            {totalActual.toLocaleString()}
          </div>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 truncate">
            Verified yield reported
          </p>
        </div>

        {/* 3. Overall Achievement Rate */}
        <div
          className={`rounded-xl border p-4 shadow-sm space-y-1 ${
            achievementPct >= 100
              ? "border-emerald-300 bg-emerald-500/5"
              : achievementPct >= 70
              ? "border-teal-300 bg-teal-500/5"
              : achievementPct >= 40
              ? "border-amber-300 bg-amber-500/5"
              : "border-rose-300 bg-rose-500/5"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Achievement Rate</span>
            <span
              className={`p-1.5 rounded-lg ${
                achievementPct >= 100
                  ? "bg-emerald-500/15 text-emerald-600"
                  : achievementPct >= 70
                  ? "bg-teal-500/15 text-teal-600"
                  : achievementPct >= 40
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-rose-500/15 text-rose-600"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
            </span>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight font-mono ${
              achievementPct >= 100
                ? "text-emerald-700 dark:text-emerald-300"
                : achievementPct >= 70
                ? "text-teal-700 dark:text-teal-300"
                : achievementPct >= 40
                ? "text-amber-700 dark:text-amber-300"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {achievementPct.toFixed(1)}%
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {achievementPct >= 100
              ? "Exceeding Target"
              : achievementPct >= 70
              ? "On Pace"
              : achievementPct >= 40
              ? "Moderate Progress"
              : "At Risk / Deficit"}
          </p>
        </div>

        {/* 4. Reporting Compliance */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Compliance Rate</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {complianceRate}%
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {kpis.total_submitted_reports || 0}/{kpis.total_expected_reports || 0} scheduled reports
          </p>
        </div>

        {/* 5. Reporting Companies */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Mining Companies</span>
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Building2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {kpis.reporting_companies}
          </div>
          <p className="text-[10px] text-teal-600 font-semibold truncate">
            {kpis.companies_with_reports || 0} actively reporting output
          </p>
        </div>

        {/* 6. Active Concessions */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Concessions</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Scale className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {kpis.active_assignments}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            Across {kpis.active_production_items} commodities
          </p>
        </div>
      </div>

      {/* National Concession Target Completion Progress Bar */}
      <div
        className={`rounded-2xl border p-5 shadow-sm space-y-3 transition-colors ${
          achievementPct >= 100
            ? "border-emerald-300/70 bg-gradient-to-r from-emerald-500/10 via-card to-card"
            : achievementPct >= 70
            ? "border-teal-300/70 bg-gradient-to-r from-teal-500/10 via-card to-card"
            : achievementPct >= 40
            ? "border-amber-300/70 bg-gradient-to-r from-amber-500/10 via-card to-card"
            : "border-rose-300/70 bg-gradient-to-r from-rose-500/10 via-card to-card"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground text-sm">
              National Production Target Aggregation
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground font-mono">
              {totalActual.toLocaleString()} of {totalTarget.toLocaleString()} Base Output Units Extracted
            </span>
          </div>

          <Badge
            variant="outline"
            className={`font-semibold text-xs ${
              achievementPct >= 100
                ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950"
                : achievementPct >= 70
                ? "border-teal-500 text-teal-700 bg-teal-50 dark:bg-teal-950"
                : achievementPct >= 40
                ? "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950"
                : "border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950"
            }`}
          >
            {achievementPct >= 100
              ? `Target Surpassed (${achievementPct.toFixed(1)}%)`
              : achievementPct >= 70
              ? `On Schedule (${achievementPct.toFixed(1)}%)`
              : achievementPct >= 40
              ? `Moderate Progress (${achievementPct.toFixed(1)}%)`
              : `At Risk / Early Phase (${achievementPct.toFixed(1)}%)`}
          </Badge>
        </div>

        {/* Dynamic Red-to-Green Progress Bar */}
        <div className="w-full h-4 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-700 shadow-inner">
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              achievementPct >= 100
                ? "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 shadow-sm"
                : achievementPct >= 70
                ? "bg-gradient-to-r from-lime-500 to-emerald-500 shadow-sm"
                : achievementPct >= 40
                ? "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 shadow-sm"
                : "bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 shadow-sm"
            }`}
            style={{
              width: `${Math.min(100, Math.max(2, achievementPct))}%`,
            }}
          />
        </div>

        {/* Portfolio Status Distribution Footnote */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Completed: <strong>{kpis.completed_count || 0}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              On Track: <strong>{kpis.on_track_count || 0}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              In Progress: <strong>{kpis.moderate_count || 0}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              At Risk: <strong>{kpis.at_risk_count || 0}</strong>
            </span>
          </div>

          <span className="font-mono text-[10px]">
            {kpis.companies_with_reports || 0} of {kpis.reporting_companies} companies reporting active actuals
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company name or mineral item..."
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
            <option value="all">All Companies ({companies.length})</option>
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
            <option value="all">All Production Items ({items.length})</option>
            {items.map((i) => (
              <option key={i.production_item_id} value={i.production_item_id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        {/* Health / Reporting Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 h-9"
          >
            <option value="all">All Execution Health</option>
            <option value="active">Active Reports Only</option>
            <option value="completed">Completed (&ge;100%)</option>
            <option value="on_track">On Track (70% - 99%)</option>
            <option value="moderate">In Progress (40% - 69%)</option>
            <option value="at_risk">At Risk (&lt;40%)</option>
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
              const hasReportedData = (perf.actual_quantity || 0) > 0;

              return (
                <div
                  key={a.assignment_id}
                  className={`rounded-xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                    hasReportedData
                      ? "border-teal-500/50 bg-gradient-to-br from-teal-500/5 via-card to-card ring-1 ring-teal-500/20"
                      : "bg-card"
                  }`}
                >
                  <div>
                    {/* Top Company & Item Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-teal-600" />
                            {a.company?.name}
                          </h3>
                          {hasReportedData && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] font-semibold">
                              Reported Output
                            </Badge>
                          )}
                        </div>
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

          <DataTable columns={recentReportColumns} data={dashboard.recent_reports} />
        </div>
      )}
    </div>
  );
}
