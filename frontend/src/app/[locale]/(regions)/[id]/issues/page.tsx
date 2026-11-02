"use client";

import React, { useState, use } from "react";
import {
  useGetRegionalIssuesQuery,
  useGetRegionalIssueDashboardQuery,
  useGetRegionalIssuePrioritiesQuery,
  useGetRegionalIssueCategoriesQuery,
} from "@/redux/api/regionalIssueApi";
import { RegionalIssueDashboardCards } from "@/features/regional-issues/RegionalIssueDashboardCards";
import { RegionalIssuesList } from "@/features/regional-issues/RegionalIssuesList";
import { RegionalIssueStatus } from "@/redux/types/regionalIssue";

export default function RegionalIssuesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const regionId = resolvedParams.id;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: stats, isLoading: isStatsLoading } = useGetRegionalIssueDashboardQuery(regionId, {
    skip: !regionId,
  });

  const { data: priorities = [] } = useGetRegionalIssuePrioritiesQuery();
  const { data: categories = [] } = useGetRegionalIssueCategoriesQuery();

  const queryParams = {
    regionId,
    page,
    limit: 15,
    status: statusFilter !== "all" && statusFilter !== "escalated" ? (statusFilter as RegionalIssueStatus) : undefined,
    escalation_status: statusFilter === "escalated" ? ("escalated" as any) : undefined,
    priority_id: priorityFilter !== "all" ? priorityFilter : undefined,
    category_id: categoryFilter !== "all" ? categoryFilter : undefined,
    search: search ? search.trim() : undefined,
  };

  const { data: issuesData, isLoading: isIssuesLoading } = useGetRegionalIssuesQuery(queryParams, {
    skip: !regionId,
  });

  const handleStatusClick = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Regional Issue Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Track, review, and resolve departmental and planning issues within your region.
        </p>
      </div>

      <RegionalIssueDashboardCards
        stats={stats}
        isLoading={isStatsLoading}
        activeStatus={statusFilter}
        onStatusClick={handleStatusClick}
      />

      <RegionalIssuesList
        regionId={regionId}
        issues={issuesData?.data || []}
        total={issuesData?.pagination?.total || 0}
        page={page}
        limit={15}
        totalPages={issuesData?.pagination?.totalPages || 1}
        isLoading={isIssuesLoading}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onResetFilters={handleResetFilters}
        priorities={priorities}
        categories={categories}
      />
    </div>
  );
}

