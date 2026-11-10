"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useGetRegionalExecutionDashboardSummaryQuery,
  useGetRegionalExecutionDashboardProgressTreeQuery,
  useGetRegionalExecutionDashboardDepartmentUserQuery,
} from "@/redux/api/regionalPlanApi";
import {
  DEFAULT_REGIONAL_DASHBOARD_FILTERS,
  type RegionalDashboardFilters,
  type RegionalDashboardSectionId,
  type RegionalPlanDashboardState,
} from "../types";
import type {
  RegionalDashboardProgressNode,
  RegionalHierarchyStepConfig,
  RegionalDashboardKpiSummary,
} from "@/redux/types/regionalPlan";

export function useRegionalPlanDashboardFilters(regionId: string): RegionalPlanDashboardState {
  const [filters, setFilters] = useState<RegionalDashboardFilters>(DEFAULT_REGIONAL_DASHBOARD_FILTERS);
  const [activeSection, setActiveSection] = useState<RegionalDashboardSectionId>("overview");

  const updateFilter = useCallback(<K extends keyof RegionalDashboardFilters>(key: K, value: RegionalDashboardFilters[K]) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // If changing a hierarchy path selection at level L, clear selections at levels > L
      if (key === "selectedPathByLevel") {
        return next;
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_REGIONAL_DASHBOARD_FILTERS);
  }, []);

  // 1. Fetch Summary
  const summaryParams = useMemo(() => {
    return {
      region_id: regionId,
      master_plan_version_id: filters.masterPlanVersionId !== "auto" ? filters.masterPlanVersionId : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      search: filters.planSearch.trim() || undefined,
      sharing_mode: filters.sharingMode !== "all" ? filters.sharingMode : undefined,
    };
  }, [regionId, filters.masterPlanVersionId, filters.status, filters.planSearch, filters.sharingMode]);

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetRegionalExecutionDashboardSummaryQuery(summaryParams, {
    skip: !regionId,
  });

  // Determine active/focus master plan
  const focusMasterId = useMemo(() => {
    if (filters.masterPlanVersionId !== "auto") return filters.masterPlanVersionId;
    return summaryData?.focus_master_plan_version_id || summaryData?.plans?.[0]?.plan_version_id || undefined;
  }, [filters.masterPlanVersionId, summaryData]);

  // 2. Fetch Progress Tree
  const progressTreeParams = useMemo(() => {
    return {
      region_id: regionId,
      master_plan_version_id: focusMasterId,
      period_version_id: filters.periodVersionId !== "auto" ? filters.periodVersionId : undefined,
    };
  }, [regionId, focusMasterId, filters.periodVersionId]);

  const {
    data: progressTreeData,
    isLoading: isTreeLoading,
    isFetching: isTreeFetching,
    error: treeError,
    refetch: refetchTree,
  } = useGetRegionalExecutionDashboardProgressTreeQuery(progressTreeParams, {
    skip: !regionId,
  });

  // 3. Fetch Department & User Metrics
  const deptUserParams = useMemo(() => {
    return {
      region_id: regionId,
      master_plan_version_id: focusMasterId,
    };
  }, [regionId, focusMasterId]);

  const {
    data: deptUserData,
    isLoading: isDeptUserLoading,
    isFetching: isDeptUserFetching,
    error: deptUserError,
    refetch: refetchDeptUser,
  } = useGetRegionalExecutionDashboardDepartmentUserQuery(deptUserParams, {
    skip: !regionId,
  });

  const refetch = useCallback(() => {
    refetchSummary();
    refetchTree();
    refetchDeptUser();
  }, [refetchSummary, refetchTree, refetchDeptUser]);

  // Hierarchy configuration dynamically extracted
  const hierarchyConfig: RegionalHierarchyStepConfig[] = useMemo(() => {
    if (summaryData?.hierarchy_config && summaryData.hierarchy_config.length > 0) {
      return summaryData.hierarchy_config;
    }
    if (progressTreeData?.progress_tree?.hierarchy_config && progressTreeData.progress_tree.hierarchy_config.length > 0) {
      return progressTreeData.progress_tree.hierarchy_config;
    }
    return [
      { level: 1, name: "Strategic Focus", label: "Strategic Focus", node_type: "strategic", color_hex: "#059669" },
      { level: 2, name: "Goal", label: "Goal", node_type: "goal", color_hex: "#0d9488" },
      { level: 3, name: "KPI", label: "KPI", node_type: "kpi", allow_kpi: true, color_hex: "#d97706" },
    ];
  }, [summaryData, progressTreeData]);

  const treeNodes = useMemo(() => {
    return progressTreeData?.progress_tree?.nodes || [];
  }, [progressTreeData]);

  // Build dynamic cascading options for each level
  const levelNodeOptions = useMemo(() => {
    const options: Record<number, Array<{ id: string; title: string; progress: number }>> = {};

    // Helper to find a node by id in the tree
    function findNodeById(nodes: RegionalDashboardProgressNode[], id: string): RegionalDashboardProgressNode | null {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children && n.children.length > 0) {
          const res = findNodeById(n.children, id);
          if (res) return res;
        }
      }
      return null;
    }

    // Level 1 options: all root nodes
    options[1] = treeNodes.map((n) => ({ id: n.id, title: n.title, progress: n.progress }));

    // Subsequent levels: derived from selected parent at level L - 1
    const maxLevel = hierarchyConfig.length > 0 ? Math.max(...hierarchyConfig.map((h) => h.level)) : 5;
    for (let lvl = 2; lvl <= maxLevel; lvl++) {
      const parentSelectedId = filters.selectedPathByLevel[lvl - 1];
      if (parentSelectedId && parentSelectedId !== "all") {
        const parentNode = findNodeById(treeNodes, parentSelectedId);
        options[lvl] = (parentNode?.children || []).map((c) => ({
          id: c.id,
          title: c.title,
          progress: c.progress,
        }));
      } else {
        options[lvl] = [];
      }
    }

    return options;
  }, [treeNodes, filters.selectedPathByLevel, hierarchyConfig]);

  // Filter tree nodes recursively based on search, status, and path selection
  const filteredTreeNodes = useMemo(() => {
    const searchTerm = filters.planSearch.trim().toLowerCase();
    const statusTerm = filters.status;
    const pathKeys = Object.keys(filters.selectedPathByLevel)
      .map(Number)
      .sort((a, b) => b - a);
    const deepestSelectedLevel = pathKeys.find((lvl) => filters.selectedPathByLevel[lvl] && filters.selectedPathByLevel[lvl] !== "all");
    const deepestSelectedId = deepestSelectedLevel ? filters.selectedPathByLevel[deepestSelectedLevel] : null;

    function filterNode(node: RegionalDashboardProgressNode): RegionalDashboardProgressNode | null {
      // Check if matches deepest path selection if active
      if (deepestSelectedId && node.level && node.level < deepestSelectedLevel!) {
        // Parent must lead to selected node
        const filteredChildren = (node.children || [])
          .map(filterNode)
          .filter((c): c is RegionalDashboardProgressNode => c !== null);
        if (filteredChildren.length === 0) return null;
        return { ...node, children: filteredChildren };
      }

      if (deepestSelectedId && node.level === deepestSelectedLevel && node.id !== deepestSelectedId) {
        return null;
      }

      // Check search match
      const titleMatches = !searchTerm || node.title.toLowerCase().includes(searchTerm) || (node.target_unit && node.target_unit.toLowerCase().includes(searchTerm));
      const statusMatches = statusTerm === "all" || node.status === statusTerm;

      // Filter children
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter((c): c is RegionalDashboardProgressNode => c !== null);

      if (titleMatches && statusMatches) {
        return { ...node, children: filteredChildren };
      }

      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }

      return null;
    }

    return treeNodes.map(filterNode).filter((n): n is RegionalDashboardProgressNode => n !== null);
  }, [treeNodes, filters.planSearch, filters.status, filters.selectedPathByLevel]);

  // Filtered departments
  const departments = useMemo(() => deptUserData?.departments || [], [deptUserData]);
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (filters.status !== "all" && d.status !== filters.status) return false;
      if (filters.planSearch.trim()) {
        const query = filters.planSearch.trim().toLowerCase();
        if (!d.name.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [departments, filters.status, filters.planSearch]);

  // Filtered users
  const users = useMemo(() => deptUserData?.users || [], [deptUserData]);
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filters.departmentId !== "all" && u.departmentId !== filters.departmentId) return false;
      if (filters.userId !== "all" && u.id !== filters.userId) return false;
      if (filters.planSearch.trim()) {
        const query = filters.planSearch.trim().toLowerCase();
        const match = u.name.toLowerCase().includes(query) || u.role.toLowerCase().includes(query) || (u.departmentName && u.departmentName.toLowerCase().includes(query));
        if (!match) return false;
      }
      return true;
    });
  }, [users, filters.departmentId, filters.userId, filters.planSearch]);

  const kpi: RegionalDashboardKpiSummary = useMemo(() => {
    const selectedPlanRow = summaryData?.plans?.find(
      (p) => p.plan_version_id === focusMasterId
    );
    const planProgress = selectedPlanRow?.execution_progress_percent;
    const treeProgress = progressTreeData?.progress_tree?.execution_progress_percent;
    const avgProgress =
      planProgress ??
      treeProgress ??
      summaryData?.kpi?.averageProgress ??
      summaryData?.portfolio_progress_percent ??
      0;

    return summaryData?.kpi
      ? {
          ...summaryData.kpi,
          averageProgress: avgProgress,
        }
      : {
          totalPlans: summaryData?.total_plans || 0,
          activePlans: summaryData?.active_plans || 0,
          completedPlans: 0,
          inExecutionPlans: 0,
          sharedPlans: 0,
          exclusivePlans: 0,
          averageProgress: avgProgress,
          activeMilestones: summaryData?.active_milestones || 0,
          delayedKpis: summaryData?.delayed_kpis || 0,
        };
  }, [summaryData, focusMasterId, progressTreeData]);

  const aggregate_metrics = useMemo(() => {
    if (progressTreeData?.progress_tree?.aggregate_metrics) {
      return progressTreeData.progress_tree.aggregate_metrics;
    }
    if (progressTreeData?.aggregate_metrics) {
      return progressTreeData.aggregate_metrics;
    }
    if (summaryData?.aggregate_metrics) {
      return summaryData.aggregate_metrics;
    }

    let totalTarget = 0;
    let totalActual = 0;
    let sfs = 0;
    let goals = 0;
    let kpis = 0;
    let tasks = 0;
    let completed = 0;
    let incomplete = 0;
    let reported = 0;
    let unreported = 0;
    let pendingApproval = 0;
    let pendingValidation = 0;
    let approved = 0;
    let rejected = 0;
    let draft = 0;

    function traverse(nodes: RegionalDashboardProgressNode[]) {
      for (const n of nodes) {
        if (n.progress >= 100) completed++;
        else incomplete++;

        const lvl = n.level || 1;
        const isLeaf = !(n.children && n.children.length > 0);
        if (lvl === 1) sfs++;
        else if (lvl === 2) goals++;
        else if (lvl === 3 || n.target_unit) kpis++;
        else tasks++;

        if (lvl === 1) {
          totalTarget += Number(n.computed_target ?? n.period_target ?? n.annual_target ?? 0);
          totalActual += Number(n.computed_actual ?? n.period_actual ?? n.annual_actual ?? 0);
        }

        if (isLeaf || lvl >= 3) {
          const isRep = n.reporting_status === "reported" || n.period_actual != null || n.annual_actual != null;
          if (isRep) reported++;
          else unreported++;

          const st = n.workflow_status || n.period_actual_status;
          if (st === "submitted") pendingApproval++;
          else if (st === "approved" && n.is_validation_required) pendingValidation++;
          else if (st === "validated" || (st === "approved" && !n.is_validation_required)) approved++;
          else if (st === "rejected") rejected++;
          else if (st === "draft") draft++;
        }

        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      }
    }
    traverse(treeNodes);

    const totalKpisAll = kpis > 0 ? kpis : (reported + unreported);
    const repPct = totalKpisAll > 0 ? Math.round((reported / totalKpisAll) * 100) : 0;
    const remaining = Math.max(0, totalTarget - totalActual);
    const variance = totalActual - totalTarget;
    const variancePct = totalTarget > 0 ? Math.round((variance / totalTarget) * 100) : 0;
    const achPct = progressTreeData?.progress_tree?.execution_progress_percent ?? summaryData?.portfolio_progress_percent ?? 0;

    return {
      total_sf: sfs,
      total_goals: goals,
      total_kpis: kpis,
      total_tasks: tasks,
      total_nodes: treeNodes.length,
      total_target: Math.round(totalTarget * 100) / 100,
      total_actual: Math.round(totalActual * 100) / 100,
      remaining_target: Math.round(remaining * 100) / 100,
      achievement_percent: achPct,
      completed_nodes: completed,
      incomplete_nodes: incomplete,
      reported_kpis: reported,
      unreported_kpis: unreported,
      reporting_completion_percent: repPct,
      pending_approval_count: pendingApproval,
      pending_validation_count: pendingValidation,
      approved_count: approved,
      rejected_count: rejected,
      draft_count: draft,
      variance: Math.round(variance * 100) / 100,
      variance_percent: variancePct,
    };
  }, [progressTreeData, summaryData, treeNodes]);

  const isLoading = isSummaryLoading && !summaryData;
  const isFetching = isSummaryFetching || isTreeFetching || isDeptUserFetching;
  const error = summaryError ? "Failed to load regional execution dashboard" : treeError ? "Failed to load execution tree" : deptUserError ? "Failed to load department metrics" : null;

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    activeSection,
    setActiveSection,
    regionId,

    summaryData,
    kpi,
    aggregate_metrics,
    plans: summaryData?.plans || [],
    departments,
    users,
    treeNodes,
    availablePeriods: progressTreeData?.progress_tree?.available_periods || [],
    currentPeriodLabel: progressTreeData?.progress_tree?.period_label ?? null,
    currentPeriodPhase: progressTreeData?.progress_tree?.period_phase ?? null,
    currentPlanningYear: progressTreeData?.progress_tree?.planning_year ?? null,
    hierarchyConfig,
    annualTimeline: summaryData?.annual_timeline || [],
    performanceDistribution: summaryData?.performance_distribution || { excellent: 0, good: 0, average: 0, at_risk: 0 },
    statusDistribution: summaryData?.status_distribution || { active: 0, completed: 0, delayed: 0, draft: 0 },
    sharing: summaryData?.sharing || { shared: [], exclusive: [] },

    filteredDepartments,
    filteredUsers,
    filteredTreeNodes,
    levelNodeOptions,

    isLoading,
    isFetching,
    error,
    refetch,
  };
}

