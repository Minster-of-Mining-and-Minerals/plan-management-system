"use client";

import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { format } from "date-fns";
import { useGetIssuesQuery } from "@/redux/api/issueApi";
import { IssueStatusBadge } from "./IssueStatusBadge";
import { AnalyticsPanel } from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import type { IssueListScope } from "@/redux/types/issue";

interface IssueRecentListPanelProps {
  limit?: number;
  className?: string;
  listScope?: IssueListScope;
}

export function IssueRecentListPanel({
  limit = 8,
  className,
  listScope = "mine",
}: IssueRecentListPanelProps) {
  const router = useRouter();
  const { data: recentResponse, isLoading } = useGetIssuesQuery({
    page: 1,
    limit,
    sort_by: "created_at",
    sort_order: "DESC",
    list_scope: listScope,
  });

  const recentIssues = recentResponse?.data ?? [];

  return (
    <AnalyticsPanel
      title="Recent Issues"
      description="Latest activity in your scope"
      icon={Clock3}
      variant="gradient"
      tone="info"
      className={className}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading recent issues…</p>
      ) : recentIssues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues in your scope yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {recentIssues.map((issue) => (
            <li key={issue.issue_id}>
              <button
                type="button"
                onClick={() => router.push(`/issues/${issue.issue_id}`)}
                className="flex w-full flex-col gap-1 py-3 text-left transition hover:bg-muted/40 -mx-2 px-2 rounded-lg"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {issue.issue_number}
                  </span>
                  <IssueStatusBadge status={issue.status} />
                </div>
                <p className="font-medium text-sm line-clamp-2">{issue.title}</p>
                <p className="text-xs text-muted-foreground">
                  {issue.category?.name ?? "Uncategorized"}
                  {issue.priority?.label ? ` · ${issue.priority.label}` : ""}
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {format(new Date(issue.created_at), "dd MMM yyyy")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AnalyticsPanel>
  );
}
