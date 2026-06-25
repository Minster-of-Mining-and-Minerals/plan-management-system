"use client";

import { useMemo, useState } from "react";
import { useGetPlanExecutionDashboardQuery } from "@/redux/api/planApi";
import {
  DEFAULT_DASHBOARD_FILTERS,
  type DashboardFilters,
  type PlanDashboardData,
} from "../types";

export function usePlanDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [activeSection, setActiveSection] = useState<
    import("../types").DashboardSectionId
  >("overview");

  const queryParams = useMemo(() => {
    const masterPlanVersionId =
      filters.masterPlanVersionId !== "auto"
        ? filters.masterPlanVersionId
        : undefined;

    return {
      government_structure_id:
        filters.structureId !== "all" ? filters.structureId : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      sharing_mode: filters.sharingMode !== "all" ? filters.sharingMode : undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      master_plan_version_id: masterPlanVersionId,
    };
  }, [filters]);

  const {
    data: apiData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPlanExecutionDashboardQuery(queryParams);

  const data: PlanDashboardData = useMemo(() => {
    if (!apiData) {
      return {
        kpi: {
          totalPlans: 0,
          activePlans: 0,
          completedPlans: 0,
          inExecutionPlans: 0,
          sharedPlans: 0,
          exclusivePlans: 0,
          averageProgress: null,
        },
        plans: [],
        structures: [],
        departments: [],
        users: [],
        planTree: [],
        progressMeta: {
          period_label: null,
          planning_year: null,
          focus_master_plan_version_id: null,
        },
        annualTimeline: [],
        sharing: { shared: [], exclusive: [] },
        generatedAt: null,
        isLoading,
        isFetching,
        error: error ? "Failed to load execution dashboard" : null,
      };
    }

    return {
      kpi: apiData.kpi,
      plans: apiData.plans,
      structures: apiData.structures,
      departments: apiData.departments,
      users: apiData.users,
      planTree: apiData.progress_tree.nodes,
      progressMeta: {
        period_label: apiData.progress_tree.period_label,
        planning_year: apiData.progress_tree.planning_year,
        focus_master_plan_version_id: apiData.focus_master_plan_version_id,
      },
      annualTimeline: apiData.annual_timeline,
      sharing: apiData.sharing,
      generatedAt: apiData.generated_at,
      isLoading,
      isFetching,
      error: null,
    };
  }, [apiData, isLoading, isFetching, error]);

  const filteredDepartments = useMemo(() => {
    return data.departments.filter((dept) => {
      if (filters.structureId !== "all" && dept.structureId !== filters.structureId) {
        return false;
      }
      if (filters.status !== "all" && dept.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [data.departments, filters.structureId, filters.status]);

  const filteredUsers = useMemo(() => {
    return data.users.filter((user) => {
      if (filters.structureId !== "all" && user.structureId !== filters.structureId) {
        return false;
      }
      if (filters.departmentId !== "all" && user.departmentId !== filters.departmentId) {
        return false;
      }
      if (filters.userId !== "all" && user.id !== filters.userId) {
        return false;
      }
      return true;
    });
  }, [data.users, filters.structureId, filters.departmentId, filters.userId]);

  const departmentOptions = useMemo(() => {
    if (filters.structureId === "all") return data.departments;
    return data.departments.filter((d) => d.structureId === filters.structureId);
  }, [data.departments, filters.structureId]);

  const userOptions = useMemo(() => {
    let users = data.users;
    if (filters.structureId !== "all") {
      users = users.filter((u) => u.structureId === filters.structureId);
    }
    if (filters.departmentId !== "all") {
      users = users.filter((u) => u.departmentId === filters.departmentId);
    }
    return users;
  }, [data.users, filters.structureId, filters.departmentId]);

  const executionPlanOptions = useMemo(
    () => data.plans.filter((plan) => plan.process_started_at),
    [data.plans]
  );

  const updateFilter = <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "structureId") {
        next.departmentId = "all";
        next.userId = "all";
      }
      if (key === "departmentId") {
        next.userId = "all";
      }
      return next;
    });
  };

  const resetFilters = () => setFilters(DEFAULT_DASHBOARD_FILTERS);

  return {
    filters,
    updateFilter,
    resetFilters,
    activeSection,
    setActiveSection,
    data,
    filteredDepartments,
    filteredUsers,
    departmentOptions,
    userOptions,
    executionPlanOptions,
    refetch,
  };
}

export type PlanDashboardFiltersState = ReturnType<typeof usePlanDashboardFilters>;
