"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_DASHBOARD_FILTERS,
  type DashboardFilters,
  type PlanDashboardData,
} from "../types";
import {
  MOCK_DEPARTMENTS,
  MOCK_PLAN_TREE,
  MOCK_STRUCTURES,
  MOCK_USERS,
} from "../mockData";

/**
 * Mock-only filter hook. Replace `data` with RTK Query / API when integrating.
 */
export function usePlanDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [activeSection, setActiveSection] = useState<
    import("../types").DashboardSectionId
  >("overview");

  const data: PlanDashboardData = useMemo(
    () => ({
      structures: MOCK_STRUCTURES,
      departments: MOCK_DEPARTMENTS,
      users: MOCK_USERS,
      planTree: MOCK_PLAN_TREE,
      isLoading: false,
      error: null,
    }),
    []
  );

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
  };
}

export type PlanDashboardFiltersState = ReturnType<typeof usePlanDashboardFilters>;
