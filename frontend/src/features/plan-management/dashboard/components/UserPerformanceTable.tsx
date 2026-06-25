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
        header: "Full Name",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("role")}</span>
        ),
      },
      {
        id: "department",
        header: "Department",
        cell: ({ row }) =>
          row.original.departmentId
            ? departmentNameById.get(row.original.departmentId) ?? "—"
            : "—",
      },
      {
        id: "structure",
        header: "Structure",
        cell: ({ row }) =>
          row.original.structureId
            ? structureNameById.get(row.original.structureId) ?? "—"
            : "—",
      },
      {
        accessorKey: "assignedNodeCount",
        header: "Assigned",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.assignedNodeCount}</span>
        ),
      },
      {
        id: "reported",
        header: "Reported",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.reportedNodeCount}/{row.original.assignedNodeCount}
          </span>
        ),
      },
      {
        id: "achievement",
        header: "Achievement",
        cell: ({ row }) => {
          const user = row.original;
          if (!user.has_progress || user.achievementPercent == null) {
            return <span className="text-muted-foreground italic">Not started</span>;
          }
          return (
            <div className="min-w-[120px] space-y-1">
              <span
                className="text-sm font-semibold tabular-nums"
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
            <span className="text-xs text-muted-foreground">—</span>
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
      return matchesSearchQuery(searchQuery, [user.name, user.role]);
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
