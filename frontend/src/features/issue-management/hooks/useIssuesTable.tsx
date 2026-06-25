"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterField } from "@/types/tableLayout";
import {
  useGetIssuesQuery,
  useGetIssueDashboardQuery,
  useGetIssueCategoriesQuery,
  useGetIssuePrioritiesQuery,
} from "@/redux/api/issueApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import {
  Issue,
  IssueListScope,
  IssueStatus,
  ISSUE_ENTITY_TYPE_LABELS,
} from "@/redux/types/issue";
import { IssueStatusBadge } from "../components/IssueStatusBadge";
import { format } from "date-fns";

interface UseIssuesTableOptions {
  listScope: IssueListScope;
}

export function useIssuesTable({ listScope }: UseIssuesTableOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [raisedByFilter, setRaisedByFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const search = searchParams.get("search") || "";
  const statusFromUrl = searchParams.get("status") || "";

  useEffect(() => {
    setStatusFilter(statusFromUrl);
  }, [statusFromUrl]);

  useEffect(() => {
    if (listScope === "mine") {
      setRaisedByFilter("");
      setAssignedToFilter("");
    }
  }, [listScope]);

  const resetKey = `${listScope}-${search}-${statusFilter}-${categoryFilter}-${priorityFilter}-${raisedByFilter}-${assignedToFilter}-${dateRange.from}-${dateRange.to}`;

  useEffect(() => {
    setPageIndex(0);
  }, [resetKey]);

  const listQuery = {
    page: pageIndex + 1,
    limit: pageSize,
    list_scope: listScope,
    search: search || undefined,
    status: (statusFilter || undefined) as IssueStatus | undefined,
    issue_category_id: categoryFilter || undefined,
    issue_priority_id: priorityFilter || undefined,
    raised_by: raisedByFilter || undefined,
    assigned_to: assignedToFilter || undefined,
    date_from: dateRange.from || undefined,
    date_to: dateRange.to || undefined,
  };

  const dashboardQuery = {
    list_scope: listScope,
    issue_category_id: categoryFilter || undefined,
    issue_priority_id: priorityFilter || undefined,
    raised_by: raisedByFilter || undefined,
    assigned_to: assignedToFilter || undefined,
    date_from: dateRange.from || undefined,
    date_to: dateRange.to || undefined,
  };

  const { data: listResponse, isLoading } = useGetIssuesQuery(listQuery);
  const { data: stats, isLoading: statsLoading } = useGetIssueDashboardQuery(dashboardQuery);
  const { data: categories = [] } = useGetIssueCategoriesQuery({ is_active: true });
  const { data: priorities = [] } = useGetIssuePrioritiesQuery();
  const { data: users = [] } = useGetUsersQuery({ page: 1, limit: 200 });

  const issues = listResponse?.data ?? [];
  const totalRows = listResponse?.pagination.total ?? 0;

  const columns: ColumnDef<Issue>[] = useMemo(
    () => [
      {
        accessorKey: "issue_number",
        header: "Issue #",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.issue_number}</span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <span className="font-medium line-clamp-1">{row.original.title}</span>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => row.original.category?.name || "—",
      },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <span
            className="text-sm font-medium"
            style={{ color: row.original.priority?.color_hex || undefined }}
          >
            {row.original.priority?.label || "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <IssueStatusBadge status={row.original.status} />,
      },
      {
        id: "entity",
        header: "Entity",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.entity_type
              ? ISSUE_ENTITY_TYPE_LABELS[row.original.entity_type]
              : "—"}
          </span>
        ),
      },
      {
        id: "raiser",
        header: "Raised By",
        cell: ({ row }) => row.original.raiser?.full_name || "—",
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) =>
          format(new Date(row.original.created_at), "dd MMM yyyy"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            title="View"
            onClick={() => router.push(`/issues/${row.original.issue_id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router]
  );

  const filters: FilterField[] = useMemo(() => {
    const baseFilters: FilterField[] = [
      {
        key: "status",
        label: "Status",
        type: "select",
        placeholder: "All statuses",
        value: statusFilter || "all",
        onChange: (value: string) => setStatusFilter(value === "all" ? "" : value),
        options: [
          { label: "All statuses", value: "all" },
          { label: "Submitted", value: "submitted" },
          { label: "Under Review", value: "under_review" },
          { label: "Accepted", value: "accepted" },
          { label: "Rejected", value: "rejected" },
          { label: "Resolved", value: "resolved" },
          { label: "Closed", value: "closed" },
        ],
      },
      {
        key: "issue_category_id",
        label: "Category",
        type: "select",
        placeholder: "All categories",
        value: categoryFilter || "all",
        onChange: (value: string) => setCategoryFilter(value === "all" ? "" : value),
        options: [
          { label: "All categories", value: "all" },
          ...categories.map((c) => ({
            label: c.name,
            value: c.issue_category_id,
          })),
        ],
      },
      {
        key: "issue_priority_id",
        label: "Priority",
        type: "select",
        placeholder: "All priorities",
        value: priorityFilter || "all",
        onChange: (value: string) => setPriorityFilter(value === "all" ? "" : value),
        options: [
          { label: "All priorities", value: "all" },
          ...priorities.map((p) => ({
            label: p.label,
            value: p.issue_priority_id,
          })),
        ],
      },
    ];

    if (listScope === "global") {
      baseFilters.push(
        {
          key: "raised_by",
          label: "Creator",
          type: "select",
          placeholder: "All creators",
          value: raisedByFilter || "all",
          onChange: (value: string) => setRaisedByFilter(value === "all" ? "" : value),
          options: [
            { label: "All creators", value: "all" },
            ...users.map((u) => ({
              label: u.full_name,
              value: u.user_id,
            })),
          ],
        },
        {
          key: "assigned_to",
          label: "Assigned To",
          type: "select",
          placeholder: "All assignees",
          value: assignedToFilter || "all",
          onChange: (value: string) => setAssignedToFilter(value === "all" ? "" : value),
          options: [
            { label: "All assignees", value: "all" },
            ...users.map((u) => ({
              label: u.full_name,
              value: u.user_id,
            })),
          ],
        }
      );
    }

    baseFilters.push({
      key: "created_at",
      label: "Date Range",
      type: "daterange",
      value: dateRange,
      onChange: (value: { from?: string; to?: string }) => setDateRange(value || {}),
    });

    return baseFilters;
  }, [
    listScope,
    statusFilter,
    categoryFilter,
    priorityFilter,
    raisedByFilter,
    assignedToFilter,
    dateRange,
    categories,
    priorities,
    users,
  ]);

  const handleStatusClick = (next: IssueStatus | "all") => {
    setStatusFilter(next === "all" ? "" : next);
    setPageIndex(0);
  };

  return {
    issues,
    totalRows,
    isLoading,
    stats,
    statsLoading,
    columns,
    filters,
    resetKey,
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
    statusFilter,
    listScope,
    handleStatusClick,
  };
}
