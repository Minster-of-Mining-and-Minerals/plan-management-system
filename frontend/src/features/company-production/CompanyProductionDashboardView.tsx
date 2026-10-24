"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import {
  Factory,
  TrendingUp,
  Target,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Plus,
  Scale,
  FileText,
  BarChart3,
  Layers,
  HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { CompanyProductionTabsHeader } from "./CompanyProductionTabsHeader";
import {
  useGetCompanyProductionDashboardQuery,
  useGetAssignmentsQuery,
  useGetProductionPerformanceQuery,
} from "@/redux/api/productionApi";
import type { CompanyProductionAssignment, CompanyProductionTarget } from "@/redux/types/production";

export function CompanyProductionDashboardView({ companyId: propCompanyId }: { companyId?: string }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();

  const companyId = propCompanyId || params?.id || session?.user?.company_id;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedItemId, setSelectedItemId] = useState<string>("all");

  const {
    data: dashboardData,
    isLoading,
    isFetching,
    refetch,
  } = useGetCompanyProductionDashboardQuery(
    { companyId: companyId as string },
    { skip: !companyId }
  );

  const { data: assignments = [] } = useGetAssignmentsQuery(
    { company_id: companyId as string, is_active: true },
    { skip: !companyId }
  );

  if (isLoading) {
    return <Loading01 />;
  }

  if (!companyId) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-bold">Unauthorized Company Context</h2>
        <p className="text-sm text-muted-foreground mt-1">
          No company context was identified for your active session.
        </p>
      </div>
    );
  }

  const performances = dashboardData?.performances || [];
  const recentReports = dashboardData?.recent_reports || [];

  // Filter performances if specific item selected
  const filteredPerformances = selectedItemId === "all"
    ? performances
    : performances.filter((p) => p.assignment.production_item_id === selectedItemId);

  // Aggregated Compliance
  let totalExpectedReports = 0;
  let totalSubmittedReports = 0;
  let totalMissingReports = 0;

  performances.forEach((p) => {
    if (p.performance.reporting_compliance) {
      totalExpectedReports += p.performance.reporting_compliance.expected_reports;
      totalSubmittedReports += p.performance.reporting_compliance.submitted_reports;
      totalMissingReports += p.performance.reporting_compliance.missing_reports;
    }
  });

  const overallComplianceRate = totalExpectedReports > 0
    ? Math.min(100, Math.round((totalSubmittedReports / totalExpectedReports) * 100))
    : 100;

  return (
    <div className="space-y-6">
      {/* ===================== HEADER ===================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Factory className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Company Production Workspace
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time tracking of mineral production actuals, dynamic target hierarchies, and daily reporting compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={`/companies/${companyId}/production/submit`}>
              <Plus className="h-4 w-4" />
              Submit Daily Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <CompanyProductionTabsHeader companyId={companyId} />

      {/* ===================== EMPTY STATE ===================== */}
      {performances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Scale className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No Production Reporting Configured
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Federal administrators have not yet assigned mineral production items or reporting targets to your company.
            Once configured, you will be able to submit scheduled reports and track performance against your targets here.
          </p>
        </div>
      ) : (
        <>
          {/* ===================== OVERVIEW KPI CARDS ===================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Assigned Items</span>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Factory className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {performances.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Active mineral production portfolios
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Reports Submitted</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {totalSubmittedReports}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Of {totalExpectedReports} scheduled reports to date
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Missing Submissions</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {totalMissingReports}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalMissingReports === 0 ? "Reporting calendar fully up to date" : "Pending daily report submissions"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Compliance Rate</span>
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <BarChart3 className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {overallComplianceRate}%
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${overallComplianceRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* ===================== FILTER BAR ===================== */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filter by Item:
              </span>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="h-9 px-3 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Assigned Items ({performances.length})</option>
                {performances.map((p) => (
                  <option
                    key={p.assignment.assignment_id}
                    value={p.assignment.production_item_id}
                  >
                    {p.performance.production_item?.name} ({p.assignment.productionItem?.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 font-mono text-xs">
                Calendar Year: {selectedYear}
              </Badge>
            </div>
          </div>

          {/* ===================== PRODUCTION ITEM COMMITMENT CARDS ===================== */}
          <div className="space-y-6">
            {filteredPerformances.map((itemPerf) => {
              const { assignment, performance } = itemPerf;
              const prodItem = performance.production_item;
              const unitSymbol = performance.display_unit?.symbol || performance.display_unit?.code || "";
              const achievement = performance.achievement_percentage;
              const isOverachieved = performance.is_overachieved;
              const targetQty = performance.target_quantity;
              const actualQty = performance.actual_quantity;
              const remainingQty = performance.remaining_quantity;
              const estimate = performance.projected_estimate;

              // Child targets breakdown if configured (e.g. Q1, Q2, Q3, Q4)
              const childTargets = (assignment.targets || []).filter(
                (t: CompanyProductionTarget) => t.target_period_type !== "year" && t.status === "published"
              );

              return (
                <div
                  key={assignment.assignment_id}
                  className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6"
                >
                  {/* Item Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/70">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-foreground">
                          {prodItem?.name}
                        </h2>
                        <Badge variant="outline" className="font-mono text-xs">
                          {prodItem?.code}
                        </Badge>
                        {performance.target_version && (
                          <Badge variant="secondary" className="text-xs">
                            Target v{performance.target_version}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize bg-primary/5 text-primary">
                          {assignment.reportingFrequency?.name || "Daily"} Reporting
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Allocation Depth: <strong className="capitalize">{assignment.target_allocation_depth}</strong>
                        {" • "}Default Reporting Unit: <strong>{assignment.defaultReportingUnit?.name || unitSymbol}</strong>
                        {" • "}Effective: <strong>{assignment.effective_from} to {assignment.effective_to || "Indefinite"}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="gap-2">
                        <Link href={`/companies/${companyId}/production/submit?item_id=${assignment.production_item_id}`}>
                          <Plus className="h-4 w-4" />
                          Submit Report
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="gap-1">
                        <Link href={`/companies/${companyId}/production/reports?item_id=${assignment.production_item_id}`}>
                          Reports
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Progress & Target Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Annual Target
                      </span>
                      <div className="text-xl font-bold text-foreground mt-1">
                        {targetQty !== null ? `${targetQty.toLocaleString()} ${unitSymbol}` : "No Target Configured"}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Cumulative Actual
                      </span>
                      <div className="text-xl font-bold text-primary mt-1">
                        {actualQty.toLocaleString()} {unitSymbol}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        From {performance.report_count} validated report(s)
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Remaining Target
                      </span>
                      <div className="text-xl font-bold text-foreground mt-1">
                        {remainingQty !== null ? (
                          remainingQty > 0 ? (
                            `${remainingQty.toLocaleString()} ${unitSymbol}`
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">Target Achieved</span>
                          )
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Target Achievement
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-xl font-bold ${isOverachieved ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                          {achievement !== null ? `${achievement}%` : "No Target"}
                        </span>
                        {isOverachieved && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] border-emerald-500/20">
                            Overachieved
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  {targetQty !== null && targetQty > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress against Annual Commitment</span>
                        <span className="font-semibold text-foreground">
                          {actualQty.toLocaleString()} / {targetQty.toLocaleString()} {unitSymbol} ({achievement}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5 border border-border">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOverachieved
                              ? "bg-emerald-500"
                              : achievement && achievement >= 75
                              ? "bg-primary"
                              : achievement && achievement >= 50
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, achievement || 0)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expected Pace & Projected Achievement (Explicitly Labeled) */}
                  {estimate && estimate.is_estimate && (
                    <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 p-3.5 rounded-xl text-xs">
                      <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{estimate.label || "Expected Pace & Performance Projection"}</span>
                          <Badge variant="outline" className="text-[10px] font-normal border-blue-300">
                            Calculated Estimate
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          At day {estimate.elapsed_days} of {estimate.total_period_days}, expected pace to date is{" "}
                          <strong>{estimate.expected_pace_to_date.toLocaleString()} {unitSymbol}</strong>.
                          Current actual is achieving{" "}
                          <strong>{estimate.pace_achievement_percentage ?? 0}%</strong> of expected elapsed-time pace.
                          Projected year-end production: <strong>{estimate.projected_period_end_actual.toLocaleString()} {unitSymbol}</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Target Hierarchy Breakdown (e.g. Quarterly allocations) */}
                  {childTargets.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5" />
                        Sub-Period Target Allocations ({assignment.target_allocation_depth})
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {childTargets.map((ct: CompanyProductionTarget) => (
                          <div
                            key={ct.target_id}
                            className="p-3.5 rounded-xl border border-border bg-card/60 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-foreground">
                                {ct.period_label}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {ct.target_period_type}
                              </Badge>
                            </div>
                            <div className="text-sm font-semibold text-primary">
                              {Number(ct.target_quantity).toLocaleString()} {unitSymbol}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {ct.period_start_date} → {ct.period_end_date}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ===================== RECENT REPORTS TABLE ===================== */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Recent Production Reports</h3>
                <p className="text-xs text-muted-foreground">
                  Latest validated and submitted reports for this company
                </p>
              </div>

              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link href={`/companies/${companyId}/production/reports`}>
                  View All Reports
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {recentReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No production reports have been submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Production Date</th>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Reported Quantity</th>
                      <th className="px-4 py-3">Base Quantity</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentReports.map((report) => (
                      <tr key={report.report_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium font-mono text-xs">
                          {report.report_date}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {report.productionItem?.name || "N/A"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {Number(report.quantity_reported).toLocaleString()}{" "}
                          {report.reportedUnit?.symbol || report.reportedUnit?.code}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {Number(report.normalized_quantity).toLocaleString()}{" "}
                          {report.productionItem?.baseUnit?.symbol || (report.productionItem as any)?.base_unit?.symbol || "base"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              report.status === "approved"
                                ? "default"
                                : report.status === "submitted"
                                ? "secondary"
                                : report.status === "rejected"
                                ? "destructive"
                                : "outline"
                            }
                            className="capitalize text-xs"
                          >
                            {report.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {report.submittedByUser?.full_name || "Self-Reported"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
