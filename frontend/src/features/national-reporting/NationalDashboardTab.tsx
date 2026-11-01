"use client";

import React, { useState } from "react";
import { useGetNationalDashboardSummaryQuery } from "@/redux/api/nationalReportingApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Globe,
  Layers,
  Building,
  Scale,
} from "lucide-react";

export function NationalDashboardTab() {
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear));
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  const { data: summary, isLoading } = useGetNationalDashboardSummaryQuery({
    reporting_year: yearFilter !== "all" ? parseInt(yearFilter, 10) : undefined,
    reporting_period_label: periodFilter !== "all" ? periodFilter : undefined,
  });

  const kpis = summary?.kpis || {
    totalRequirementsCount: 0,
    totalAssignmentsCount: 0,
    totalAssignedRegionsCount: 0,
    mappedAssignmentsCount: 0,
    confirmedAssignmentsCount: 0,
    totalPublishedSubmissions: 0,
    missingSubmissionsCount: 0,
    overallNationalComplianceRate: 0,
  };

  const regionalCompliance = summary?.regionalCompliance || [];
  const requirementSummaries = summary?.requirementSummaries || [];

  const chartData = regionalCompliance.map((r) => ({
    name: r.regionName,
    assigned: r.assignedRequirementsCount,
    submitted: r.publishedSubmissionsCount,
    compliance: r.complianceRate,
  }));

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Monitoring Window:
          </span>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-950">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
              <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[150px] bg-slate-50 dark:bg-slate-950">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Full Year Aggregated</SelectItem>
              <SelectItem value="Q1">Quarter 1 (Q1)</SelectItem>
              <SelectItem value="Q2">Quarter 2 (Q2)</SelectItem>
              <SelectItem value="Q3">Quarter 3 (Q3)</SelectItem>
              <SelectItem value="Q4">Quarter 4 (Q4)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-slate-500">
          Federated data refreshed live from PostgreSQL
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">
              National Requirements
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {kpis.totalRequirementsCount}
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">
              Regional Assignments
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {kpis.totalAssignmentsCount}
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">
              Validated Submissions
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {kpis.totalPublishedSubmissions}
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">
              National Compliance
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">
              {kpis.overallNationalComplianceRate}%
            </div>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">
              Missing Submissions
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {kpis.missingSubmissionsCount}
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts & Regional Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Submissions Comparison Chart */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-600" />
              Regional Submission Compliance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                No regional assignments available for chart display.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        val,
                        name === "assigned" ? "Assigned Requirements" : "Validated Submissions",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="assigned" name="Assigned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="submitted" name="Validated & Published" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Reporting Compliance Matrix */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building className="h-4 w-4 text-emerald-600" />
              Regional Reporting Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Region</th>
                    <th className="px-4 py-3 text-center">Assigned</th>
                    <th className="px-4 py-3 text-center">Submitted</th>
                    <th className="px-4 py-3 text-center">Missing</th>
                    <th className="px-4 py-3">Compliance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {regionalCompliance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No regional data found.
                      </td>
                    </tr>
                  ) : (
                    regionalCompliance.map((r) => (
                      <tr key={r.regionId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {r.regionName}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-medium">
                          {r.assignedRequirementsCount}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {r.publishedSubmissionsCount}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-amber-600">
                          {r.missingSubmissionsCount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  r.complianceRate === 100
                                    ? "bg-emerald-600"
                                    : r.complianceRate >= 50
                                    ? "bg-teal-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${Math.min(100, r.complianceRate)}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {r.complianceRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Standardized National Indicators & Commodity Aggregates */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Scale className="h-5 w-5 text-emerald-600" />
          Standardized National Indicator Aggregates
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requirementSummaries.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
              No national indicators configured with regional assignments.
            </div>
          ) : (
            requirementSummaries.map((req) => (
              <Card
                key={req.requirementId}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      {req.code}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {req.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {req.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  {/* Warning if Incomplete National Data */}
                  {!req.isCompleteData ? (
                    <div className="flex items-center gap-1.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        Incomplete Aggregate: {req.submittedRegionsCount} of {req.assignedRegionsCount} regions reported ({req.dataCompletenessPercent}%)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>100% Complete: All {req.assignedRegionsCount} assigned regional states submitted</span>
                    </div>
                  )}

                  {/* Standardized Actual & Target Values */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        National Actual
                      </span>
                      <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                        {req.nationalTotalActual != null
                          ? req.nationalTotalActual.toLocaleString()
                          : "—"}{" "}
                        <span className="text-xs font-sans font-medium text-slate-500">
                          {req.expectedUnit}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        National Target
                      </span>
                      <div className="text-lg font-bold font-mono text-slate-700 dark:text-slate-300">
                        {req.nationalTotalTarget != null
                          ? req.nationalTotalTarget.toLocaleString()
                          : "—"}{" "}
                        <span className="text-xs font-sans font-medium text-slate-500">
                          {req.expectedUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Regional Contribution Pills */}
                  {req.submissions.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Regional Submissions:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {req.submissions.map((sub) => (
                          <span
                            key={sub.publishedRecordId}
                            className="inline-flex items-center gap-1 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded"
                          >
                            <span className="font-sans font-medium">{sub.regionName}:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {sub.standardizedActual?.toLocaleString() || sub.reportedActual}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

