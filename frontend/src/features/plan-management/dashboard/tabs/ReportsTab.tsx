"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { FilterDropdown } from "../components/FilterDropdown";

interface ReportsTabProps {
  state: PlanDashboardFiltersState;
}

export function ReportsTab({ state }: ReportsTabProps) {
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

  const handleMockAction = (action: string) => {
    toast.info(`${action} — UI template only. Connect report API to enable.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Report builder layout — generate and export controls are non-functional placeholders.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6 max-w-2xl">
        <div className="flex items-center gap-2 text-golden-dark font-semibold">
          <FileText className="h-4 w-4" />
          Generate Report
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
            onClick={() => handleMockAction("Generate Report")}
          >
            <Play className="h-4 w-4" />
            Generate Report
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleMockAction("Export PDF")}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleMockAction("Export Excel")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground max-w-2xl">
        Report preview area — connect PDF/Excel generation service and analytics engine here.
      </div>
    </div>
  );
}
