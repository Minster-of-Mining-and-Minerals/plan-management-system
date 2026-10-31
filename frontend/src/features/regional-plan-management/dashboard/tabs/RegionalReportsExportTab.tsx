"use client";

import React from "react";
import { FileSpreadsheet, Download, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RegionalPlanDashboardState } from "../types";

interface RegionalReportsExportTabProps {
  state: RegionalPlanDashboardState;
}

export function RegionalReportsExportTab({ state }: RegionalReportsExportTabProps) {
  const {
    kpi,
    plans,
    departments,
    users,
    filteredTreeNodes,
    annualTimeline,
    regionId,
  } = state;

  const exportToJson = () => {
    const reportData = {
      region_id: regionId,
      exported_at: new Date().toISOString(),
      kpi,
      plans,
      departments,
      users,
      nodes_count: filteredTreeNodes.length,
      annual_timeline: annualTimeline,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `regional-plan-dashboard-${regionId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCsv = () => {
    // Generate CSV of directorates and milestones
    const headers = [
      "Directorate ID",
      "Directorate Name",
      "Level",
      "Assigned Milestones",
      "Reported Milestones",
      "Progress Percent",
      "Status",
    ];

    const rows = departments.map((d) => [
      d.id,
      `"${d.name.replace(/"/g, '""')}"`,
      d.level,
      d.assignedNodeCount ?? d.assigned_nodes_count ?? 0,
      d.reportedNodeCount ?? d.reported_nodes_count ?? 0,
      d.progress ?? d.avg_progress ?? 0,
      d.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `regional-directorates-${regionId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Regional Execution Reports & Data Export
            </h2>
            <p className="text-xs text-muted-foreground">
              Download live metrics, directorate scorecards, and hierarchical rollup datasets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={exportToCsv} className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportToJson} className="h-8 text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </Button>
        </div>
      </div>

      {/* Snapshot Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Plans in Snapshot
          </span>
          <div className="text-2xl font-bold text-foreground">{plans.length}</div>
          <p className="text-xs text-muted-foreground">
            {kpi.inExecutionPlans} actively executing frameworks
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Directorates
          </span>
          <div className="text-2xl font-bold text-emerald-700">{departments.length}</div>
          <p className="text-xs text-muted-foreground">
            Confirmed reporting units in this regional boundary
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Staff Members
          </span>
          <div className="text-2xl font-bold text-teal-700">{users.length}</div>
          <p className="text-xs text-muted-foreground">
            Regional personnel with operational assignments
          </p>
        </div>
      </div>
    </div>
  );
}

