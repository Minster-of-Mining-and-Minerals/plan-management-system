"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actionFeedback } from "@/components/action-feedback";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { FilterDropdown } from "../components/FilterDropdown";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface ReportsTabProps {
  state: PlanDashboardFiltersState;
}

export function ReportsTab({ state }: ReportsTabProps) {
  const { textPrimary, color } = useDashboardAppearance();
  const [reportType, setReportType] = useState("summary");
  const [localStructure, setLocalStructure] = useState("all");
  const [localDepartment, setLocalDepartment] = useState("all");
  const [localUser, setLocalUser] = useState("all");

  const structureOptions = [
    { value: "all", label: "All Structures" },
    ...state.data.structures.map((s) => ({ value: s.id, label: s.name })),
  ];

  const departmentOptions = [
    { value: "all", label: "All Departments" },
    ...state.data.departments
      .filter((d) => localStructure === "all" || d.structureId === localStructure)
      .map((d) => ({ value: d.id, label: d.name })),
  ];

  const userOptions = [
    { value: "all", label: "All Users" },
    ...state.data.users
      .filter((u) => localDepartment === "all" || u.departmentId === localDepartment)
      .map((u) => ({ value: u.id, label: u.name })),
  ];

  const buildExportPayload = () => {
    const structureFilter =
      localStructure === "all"
        ? state.data.structures
        : state.data.structures.filter((s) => s.id === localStructure);
    const departmentFilter =
      localDepartment === "all"
        ? state.data.departments
        : state.data.departments.filter((d) => d.id === localDepartment);
    const userFilter =
      localUser === "all"
        ? state.data.users
        : state.data.users.filter((u) => u.id === localUser);

    return {
      report_type: reportType,
      generated_at: state.data.generatedAt ?? new Date().toISOString(),
      filters: {
        structure_id: localStructure,
        department_id: localDepartment,
        user_id: localUser,
      },
      kpi: state.data.kpi,
      structures: structureFilter,
      departments: departmentFilter,
      users: userFilter,
      plans: state.data.plans,
      annual_timeline: state.data.annualTimeline,
      sharing: state.data.sharing,
      progress_tree: state.data.planTree,
    };
  };

  const downloadJson = (filename: string) => {
    const blob = new Blob([JSON.stringify(buildExportPayload(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: "json" | "csv") => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      downloadJson(`plan-execution-dashboard-${stamp}.json`);
      actionFeedback.success("Execution dashboard snapshot exported as JSON");
      return;
    }

    const rows = state.data.plans.map((plan) => ({
      draft_name: plan.draft_name,
      structure: plan.government_structure_name ?? "",
      status: plan.dashboard_status,
      execution_progress_percent: plan.execution_progress_percent ?? "",
      active_planning_year: plan.active_planning_year ?? "",
    }));
    const headers = Object.keys(
      rows[0] ?? {
        draft_name: "",
        structure: "",
        status: "",
        execution_progress_percent: "",
        active_planning_year: "",
      }
    );
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => JSON.stringify((row as Record<string, unknown>)[header] ?? "")).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `plan-execution-dashboard-${stamp}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    actionFeedback.success("Plan list exported as CSV");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: textPrimary }}>
          Reports
        </h2>
        <p className="text-sm text-muted-foreground">
          Export the current execution dashboard snapshot for offline analysis.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6 max-w-2xl">
        <div className="flex items-center gap-2 font-semibold" style={{ color: color("primary") }}>
          <FileText className="h-4 w-4" />
          Export Snapshot
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FilterDropdown
            label="Structure"
            value={localStructure}
            options={structureOptions}
            onChange={(v) => {
              setLocalStructure(v);
              setLocalDepartment("all");
              setLocalUser("all");
            }}
          />
          <FilterDropdown
            label="Department"
            value={localDepartment}
            options={departmentOptions}
            onChange={(v) => {
              setLocalDepartment(v);
              setLocalUser("all");
            }}
          />
          <FilterDropdown
            label="User"
            value={localUser}
            options={userOptions}
            onChange={setLocalUser}
          />
          <FilterDropdown
            label="Report Type"
            value={reportType}
            options={[
              { value: "summary", label: "Summary" },
              { value: "detailed", label: "Detailed" },
              { value: "performance", label: "Performance" },
              { value: "audit", label: "Audit" },
            ]}
            onChange={setReportType}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t">
          <Button
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => handleExport("json")}
          >
            <Play className="h-4 w-4" />
            Export JSON Snapshot
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleExport("csv")}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Plans CSV
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              handleExport("json");
            }}
          >
            <Download className="h-4 w-4" />
            Download Full Data
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 text-sm text-muted-foreground max-w-2xl">
        <p>
          JSON includes KPI summary, structures, departments, users, plan rows, annual timeline,
          sharing breakdown, and the focused execution hierarchy tree as shown on the Progress tab.
        </p>
      </div>
    </div>
  );
}
