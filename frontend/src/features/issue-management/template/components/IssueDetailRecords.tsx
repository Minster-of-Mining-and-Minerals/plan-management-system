"use client";

import type { Issue } from "@/redux/types/issue";
import { IssueFormResponsesDisplay } from "../../components/IssueFormResponsesDisplay";

interface IssueDetailRecordsProps {
  issue: Issue;
}

function RecordBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}

export function IssueDetailRecords({ issue }: IssueDetailRecordsProps) {
  const hasFormResponses = (issue.formResponses?.length ?? 0) > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Issue records</p>

      {hasFormResponses ? (
        <div className="space-y-3">
          <IssueFormResponsesDisplay
            responses={issue.formResponses!}
            attachments={issue.attachments}
          />
        </div>
      ) : (
        <>
          <RecordBlock label="Description" value={issue.description} />
          <RecordBlock label="Justification" value={issue.justification} />
        </>
      )}

      <RecordBlock label="Review response" value={issue.response} />
      <RecordBlock label="Rejection reason" value={issue.rejection_reason} />
      <RecordBlock label="Resolution notes" value={issue.resolution_notes} />

      {(issue.current_value || issue.suggested_value) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RecordBlock label="Current value" value={issue.current_value} />
          <RecordBlock label="Suggested value" value={issue.suggested_value} />
        </div>
      )}
    </div>
  );
}
