import React from "react";
import IssueDetailView from "@/features/issue-management/IssueDetailView";

interface IssueDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IssueDetailPage({ params }: IssueDetailPageProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <IssueDetailView issueId={id} />
    </div>
  );
}
