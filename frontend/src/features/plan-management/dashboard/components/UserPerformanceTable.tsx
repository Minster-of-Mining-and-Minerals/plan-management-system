"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { UserAvatar } from "@/components/common/UserAvatar";
import { matchesSearchQuery } from "@/utils/tableUtils";
import type { FilterField } from "@/types/tableLayout";
import type { DashboardUser, PerformanceLevel } from "../types";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { DashboardTableLayout } from "./DashboardTableLayout";
import { DashboardPerformanceBar } from "./DashboardPerformanceBar";
import { DashboardPerformanceBadge } from "./DashboardPerformanceBadge";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface UserPerformanceTableProps {
  state: PlanDashboardFiltersState;
}

const PERFORMANCE_FILTER_OPTIONS: Array<{ label: string; value: PerformanceLevel }> = [
  { label: "Excellent", value: "excellent" },
  { label: "Good", value: "good" },
  { label: "Average", value: "average" },
  { label: "At Risk", value: "at-risk" },
];

export function UserPerformanceTable({ state }: UserPerformanceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [performanceFilter, setPerformanceFilter] = useState("");
  const [progressFilter, setProgressFilter] = useState("");
  const { performanceColor } = useDashboardAppearance();

  const structureNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const structure of state.data.structures) {
      map.set(structure.id, structure.name);
    }
    return map;
  }, [state.data.structures]);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const department of state.data.departments) {
      map.set(department.id, department.name);
    }
    return map;
  }, [state.data.departments]);

  const columns: ColumnDef<DashboardUser>[] = useMemo(
    () => [
      {
        id: "avatar",
        header: "",
        cell: ({ row }) => (
          <UserAvatar name={row.original.name} className="h-9 w-9" />
        ),
      },
      {
        accessorKey: "name",
        header: "Assignee",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{row.original.name}</span>
            {row.original.email && (
              <span className="text-[11px] text-muted-foreground">{row.original.email}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground font-medium">
            {row.getValue("role")}
          </span>
        ),
      },
      {
        id: "department",
        header: "Department",
        cell: ({ row }) => {
          const dept =
            row.original.departmentName ||
            (row.original.departmentId ? departmentNameById.get(row.original.departmentId) : null);
          return (
            <span className="text-xs text-foreground font-medium">
              {dept || <span className="text-muted-foreground italic">—</span>}
            </span>
          );
        },
      },
      {
        id: "structure",
        header: "Structure / Sector",
        cell: ({ row }) => {
          const struct =
            row.original.structureName ||
            (row.original.structureId ? structureNameById.get(row.original.structureId) : null);
          return (
            <span className="text-xs text-muted-foreground">
              {struct || <span className="italic">—</span>}
            </span>
          );
        },
      },
      {
        accessorKey: "assignedNodeCount",
        header: "Assigned Nodes",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{row.original.assignedNodeCount}</span>
        ),
      },
      {
        id: "reported",
        header: "Reporting Coverage",
        cell: ({ row }) => {
          const total = row.original.assignedNodeCount;
          const rep = row.original.reportedNodeCount;
          const rate =
            row.original.reportingRate ??
            (total > 0 ? Math.round((rep / total) * 100) : 0);
          return (
            <div className="space-y-1">
              <span className="tabular-nums text-xs font-medium">
                {rep}/{total}{" "}
                <span className="text-muted-foreground font-normal">({rate}%)</span>
              </span>
              <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, rate)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: "achievement",
        header: "Achievement",
        cell: ({ row }) => {
          const user = row.original;
          if (!user.has_progress || user.achievementPercent == null) {
            return (
              <span className="inline-flex items-center rounded-md bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground italic">
                Not started
              </span>
            );
          }
          return (
            <div className="min-w-[120px] space-y-1">
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: performanceColor(user.achievementPercent) }}
              >
                {user.achievementPercent}%
              </span>
              <DashboardPerformanceBar
                value={user.achievementPercent}
                showValue={false}
                size="sm"
                performancePercent={user.achievementPercent}
              />
            </div>
          );
        },
      },
      {
        id: "performance",
        header: "Performance",
        cell: ({ row }) =>
          row.original.has_progress ? (
            <DashboardPerformanceBadge
              level={row.original.performance}
              percent={row.original.achievementPercent}
            />
          ) : (
            <span className="text-xs text-muted-foreground italic">Pending</span>
          ),
      },
    ],
    [departmentNameById, structureNameById, performanceColor]
  );

  const filteredData = useMemo(() => {
    return state.filteredUsers.filter((user) => {
      if (
        performanceFilter &&
        user.has_progress &&
        user.performance !== performanceFilter
      ) {
        return false;
      }
      if (performanceFilter && !user.has_progress) {
        return false;
      }
      if (progressFilter === "started" && !user.has_progress) {
        return false;
      }
      if (progressFilter === "not_started" && user.has_progress) {
        return false;
      }
      const deptName =
        user.departmentName ||
        (user.departmentId ? departmentNameById.get(user.departmentId) : "") ||
        "";
      const structName =
        user.structureName ||
        (user.structureId ? structureNameById.get(user.structureId) : "") ||
        "";
      return matchesSearchQuery(searchQuery, [
        user.name,
        user.role,
        user.email || "",
        deptName,
        structName,
      ]);
    });
  }, [state.filteredUsers, performanceFilter, progressFilter, searchQuery]);

  const filters: FilterField[] = [
    {
      key: "progress",
      label: "Reporting Status",
      type: "multiselect",
      placeholder: "All statuses",
      value: progressFilter,
      onChange: setProgressFilter,
      options: [
        { label: "Has achievement", value: "started" },
        { label: "Not started", value: "not_started" },
      ],
    },
    {
      key: "performance",
      label: "Performance Band",
      type: "multiselect",
      placeholder: "All bands",
      value: performanceFilter,
      onChange: setPerformanceFilter,
      options: PERFORMANCE_FILTER_OPTIONS,
    },
  ];

  return (
    <DashboardTableLayout
      title="User Performance"
      description="Assignee achievement on nodes in the focused execution period"
      filters={filters}
      filterColumnsPerRow={2}
      searchPlaceholder="Search by name or role..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <DataTable
        columns={columns}
        data={filteredData}
        resetKey={`${searchQuery}-${performanceFilter}-${progressFilter}-${state.filters.structureId}-${state.filters.departmentId}`}
        defaultPageSize={10}
      />
    </DashboardTableLayout>
  );
}
