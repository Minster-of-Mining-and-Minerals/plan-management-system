"use client";

import { format } from "date-fns";
import type { Issue } from "@/redux/types/issue";
import { ISSUE_ENTITY_TYPE_LABELS } from "@/redux/types/issue";
import { PriorityBadge } from "./PriorityBadge";

interface IssueDetailOverviewProps {
  issue: Issue;
}

function OverviewItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

export function IssueDetailOverview({ issue }: IssueDetailOverviewProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Overview</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewItem label="Category" value={issue.category?.name || "—"} />
        <OverviewItem
          label="Priority"
          value={<PriorityBadge priority={issue.priority} />}
        />
        <OverviewItem
          label="Form container"
          value={issue.formConfigContainer?.name || "—"}
        />
        <OverviewItem label="Raised by" value={issue.raiser?.full_name || "—"} />
        <OverviewItem
          label="Assigned to"
          value={issue.assignee?.full_name || "Unassigned"}
        />
        <OverviewItem
          label="Related entity"
          value={
            issue.entity_type && issue.entity_id ? (
              <>
                {ISSUE_ENTITY_TYPE_LABELS[issue.entity_type]} ·{" "}
                <span className="font-mono text-xs">{issue.entity_id}</span>
              </>
            ) : (
              "—"
            )
          }
        />
        <OverviewItem
          label="Created"
          value={format(new Date(issue.created_at), "dd MMM yyyy HH:mm")}
        />
        {issue.resolved_at ? (
          <OverviewItem
            label="Resolved"
            value={format(new Date(issue.resolved_at), "dd MMM yyyy HH:mm")}
          />
        ) : null}
        {issue.closed_at ? (
          <OverviewItem
            label="Closed"
            value={format(new Date(issue.closed_at), "dd MMM yyyy HH:mm")}
          />
        ) : null}
      </div>
    </div>
  );
}
