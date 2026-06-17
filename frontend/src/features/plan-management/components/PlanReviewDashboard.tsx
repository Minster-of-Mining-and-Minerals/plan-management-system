"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Button } from "@/components/ui/button";
import type { FilterField } from "@/types/tableLayout";
import { useGetPlanReviewDashboardQuery } from "@/redux/api/planApi";
import {
  useGetIssueCategoriesQuery,
  useGetIssuePrioritiesQuery,
} from "@/redux/api/issueApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { Issue } from "@/redux/types/issue";
import { ISSUE_ENTITY_TYPE_LABELS } from "@/redux/types/issue";
import { IssueStatusBadge } from "@/features/issue-management/components/IssueStatusBadge";
import { IssueDashboardStatsCards } from "@/features/issue-management/components/IssueDashboardStatsCards";
import { IssueStatus } from "@/redux/types/issue";
import { format } from "date-fns";

interface PlanReviewDashboardProps {
  masterVersionId: string;
}

export function PlanReviewDashboard({ masterVersionId }: PlanReviewDashboardProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [raisedByFilter, setRaisedByFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");

  const query = {
    masterId: masterVersionId,
    status: statusFilter || undefined,
    issue_category_id: categoryFilter || undefined,
    issue_priority_id: priorityFilter || undefined,
    raised_by: raisedByFilter || undefined,
    assigned_to: assignedToFilter || undefined,
  };

  const { data, isLoading, refetch } = useGetPlanReviewDashboardQuery(query);
  const { data: categories = [] } = useGetIssueCategoriesQuery({ is_active: true });
  const { data: priorities = [] } = useGetIssuePrioritiesQuery();
  const { data: users = [] } = useGetUsersQuery({ page: 1, limit: 200 });

  const issues = data?.issues ?? [];
  const stats = data?.stats;

  const columns: ColumnDef<Issue>[] = useMemo(
    () => [
      {
        accessorKey: "issue_number",
        header: "Issue #",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.issue_number}</span>
        ),
      },
      { accessorKey: "title", header: "Title" },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => row.original.category?.name || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <IssueStatusBadge status={row.original.status} />,
      },
      {
        id: "entity",
        header: "Entity",
        cell: ({ row }) => ISSUE_ENTITY_TYPE_LABELS[row.original.entity_type],
      },
      {
        id: "raiser",
        header: "Raised By",
        cell: ({ row }) => row.original.raiser?.full_name || "—",
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => format(new Date(row.original.created_at), "dd MMM yyyy"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/issues/${row.original.issue_id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router]
  );

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All statuses",
      value: statusFilter || "all",
      onChange: (v: string) => {
        setStatusFilter(v === "all" ? "" : v);
        refetch();
      },
      options: [
        { label: "All", value: "all" },
        { label: "Submitted", value: "submitted" },
        { label: "Under Review", value: "under_review" },
        { label: "Accepted", value: "accepted" },
        { label: "Rejected", value: "rejected" },
        { label: "Resolved", value: "resolved" },
        { label: "Closed", value: "closed" },
      ],
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      placeholder: "All categories",
      value: categoryFilter || "all",
      onChange: (v: string) => setCategoryFilter(v === "all" ? "" : v),
      options: [
        { label: "All", value: "all" },
        ...categories.map((c) => ({ label: c.name, value: c.issue_category_id })),
      ],
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      placeholder: "All priorities",
      value: priorityFilter || "all",
      onChange: (v: string) => setPriorityFilter(v === "all" ? "" : v),
      options: [
        { label: "All", value: "all" },
        ...priorities.map((p) => ({ label: p.label, value: p.issue_priority_id })),
      ],
    },
    {
      key: "raised_by",
      label: "Creator",
      type: "select",
      placeholder: "All creators",
      value: raisedByFilter || "all",
      onChange: (v: string) => setRaisedByFilter(v === "all" ? "" : v),
      options: [
        { label: "All", value: "all" },
        ...users.map((u) => ({ label: u.full_name, value: u.user_id })),
      ],
    },
    {
      key: "assigned_to",
      label: "Assigned User",
      type: "select",
      placeholder: "All assignees",
      value: assignedToFilter || "all",
      onChange: (v: string) => setAssignedToFilter(v === "all" ? "" : v),
      options: [
        { label: "All", value: "all" },
        ...users.map((u) => ({ label: u.full_name, value: u.user_id })),
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Track issues raised during plan review. Manage decisions through the Issue Module.
        </p>
      </div>

      <IssueDashboardStatsCards
        stats={stats}
        isLoading={isLoading}
        activeStatus={(statusFilter as IssueStatus) || "all"}
        onStatusClick={(s) => setStatusFilter(s === "all" ? "" : s)}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {filters.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
            >
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={issues} isLoading={isLoading} />
    </div>
  );
}
