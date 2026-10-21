"use client";

import { useMemo, useState, useEffect } from "react";
import {
  useGetPlanExecutionDashboardOverviewQuery,
  useGetPlanExecutionDashboardProgressTreeQuery,
  useGetPlanExecutionDashboardDepartmentUserQuery,
} from "@/redux/api/planApi";
import {
  DEFAULT_DASHBOARD_FILTERS,
  type DashboardFilters,
  type PlanDashboardData,
  type DashboardSectionId,
} from "../types";

export function usePlanDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [activeSection, setActiveSection] = useState<DashboardSectionId>("overview");

  // Track sections opened so data is retained without repeated redundant fetching
  const [hasOpenedProgress, setHasOpenedProgress] = useState(false);
  const [hasOpenedDeptUser, setHasOpenedDeptUser] = useState(false);

  const isDeptUserSection =
    activeSection === "department" ||
    activeSection === "user" ||
    activeSection === "structure" ||
    activeSection === "reports";

  useEffect(() => {
    if (activeSection === "progress") {
      setHasOpenedProgress(true);
    }
  }, [activeSection]);

  useEffect(() => {
    if (isDeptUserSection) {
      setHasOpenedDeptUser(true);
    }
  }, [isDeptUserSection]);

  // 1. Initial Overview Query: Only Overview filters (independent of focus plan or focus period)
  const overviewParams = useMemo(() => {
    return {
      government_structure_id:
        filters.structureId !== "all" ? filters.structureId : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      sharing_mode: filters.sharingMode !== "all" ? filters.sharingMode : undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    };
  }, [filters.structureId, filters.status, filters.sharingMode, filters.dateFrom, filters.dateTo]);

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    isFetching: isOverviewFetching,
    error: overviewError,
    refetch: refetchOverview,
  } = useGetPlanExecutionDashboardOverviewQuery(overviewParams);

  // 2. Progressive Progress Tree Query: Only fetches when Progress tab is opened
  const focusMasterId =
    filters.masterPlanVersionId !== "auto"
      ? filters.masterPlanVersionId
      : overviewData?.focus_master_plan_version_id ?? undefined;

  const progressTreeParams = useMemo(() => {
    return {
      master_plan_version_id: focusMasterId,
      period_version_id:
        filters.periodVersionId !== "auto" ? filters.periodVersionId : undefined,
      government_structure_id:
        filters.structureId !== "all" ? filters.structureId : undefined,
    };
  }, [focusMasterId, filters.periodVersionId, filters.structureId]);

  const shouldFetchProgressTree =
    (hasOpenedProgress || activeSection === "progress") && !isOverviewLoading;

  const {
    data: progressTreeData,
    isLoading: isProgressTreeLoading,
    isFetching: isProgressTreeFetching,
    error: progressTreeError,
    refetch: refetchProgressTree,
  } = useGetPlanExecutionDashboardProgressTreeQuery(progressTreeParams, {
    skip: !shouldFetchProgressTree,
  });

  // 3. Progressive Department & User Metrics Query: Only fetches when relevant tab is active
  const shouldFetchDeptUser =
    (hasOpenedDeptUser || isDeptUserSection) && !isOverviewLoading;

  const {
    data: deptUserData,
    isLoading: isDeptUserLoading,
    isFetching: isDeptUserFetching,
    error: deptUserError,
    refetch: refetchDeptUser,
  } = useGetPlanExecutionDashboardDepartmentUserQuery(overviewParams, {
    skip: !shouldFetchDeptUser,
  });

  // Unified dashboard state composed from progressive queries
  const data: PlanDashboardData = useMemo(() => {
    if (!overviewData && isOverviewLoading) {
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
          period_version_id: null,
          period_phase: null,
          available_periods: [],
          focus_master_plan_version_id: null,
        },
        annualTimeline: [],
        sharing: { shared: [], exclusive: [] },
        generatedAt: null,
        isLoading: true,
        isFetching: isOverviewFetching,
        error: null,
        progressLoading: false,
        progressFetching: false,
        progressError: null,
        deptUserLoading: false,
        deptUserFetching: false,
        deptUserError: null,
      };
    }

    return {
      kpi: overviewData?.kpi ?? {
        totalPlans: 0,
        activePlans: 0,
        completedPlans: 0,
        inExecutionPlans: 0,
        sharedPlans: 0,
        exclusivePlans: 0,
        averageProgress: null,
      },
      plans: overviewData?.plans ?? [],
      structures: overviewData?.structures ?? deptUserData?.structures ?? [],
      departments: deptUserData?.departments ?? [],
      users: deptUserData?.users ?? [],
      planTree: progressTreeData?.progress_tree?.nodes ?? [],
      progressMeta: {
        period_label: progressTreeData?.progress_tree?.period_label ?? null,
        planning_year: progressTreeData?.progress_tree?.planning_year ?? null,
        period_version_id: progressTreeData?.progress_tree?.period_version_id ?? null,
        period_phase: progressTreeData?.progress_tree?.period_phase ?? null,
        available_periods: progressTreeData?.progress_tree?.available_periods ?? [],
        focus_master_plan_version_id:
          progressTreeData?.focus_master_plan_version_id ??
          overviewData?.focus_master_plan_version_id ??
          null,
      },
      annualTimeline: overviewData?.annual_timeline ?? [],
      sharing: overviewData?.sharing ?? { shared: [], exclusive: [] },
      generatedAt: overviewData?.generated_at ?? null,
      isLoading: isOverviewLoading,
      isFetching: isOverviewFetching,
      error: overviewError ? "Failed to load execution dashboard" : null,
      progressLoading: isProgressTreeLoading,
      progressFetching: isProgressTreeFetching,
      progressError: progressTreeError ? "Failed to load plan execution hierarchy" : null,
      deptUserLoading: isDeptUserLoading,
      deptUserFetching: isDeptUserFetching,
      deptUserError: deptUserError ? "Failed to load department and assignee metrics" : null,
    };
  }, [
    overviewData,
    isOverviewLoading,
    isOverviewFetching,
    overviewError,
    deptUserData,
    isDeptUserLoading,
    isDeptUserFetching,
    deptUserError,
    progressTreeData,
    isProgressTreeLoading,
    isProgressTreeFetching,
    progressTreeError,
  ]);

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
      // Changing focus plan resets period so backend can pick the active one again.
      if (key === "masterPlanVersionId") {
        next.periodVersionId = "auto";
      }
      return next;
    });
  };

  const resetFilters = () => setFilters(DEFAULT_DASHBOARD_FILTERS);

  const refetch = () => {
    refetchOverview();
    if (hasOpenedProgress || activeSection === "progress") {
      refetchProgressTree();
    }
    if (hasOpenedDeptUser || isDeptUserSection) {
      refetchDeptUser();
    }
  };

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
    refetchProgressTree,
    refetchDeptUser,
  };
}

export type PlanDashboardFiltersState = ReturnType<typeof usePlanDashboardFilters>;
