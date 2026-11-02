"use client";

import React, { use } from "react";
import { useGetRegionalIssueByIdQuery } from "@/redux/api/regionalIssueApi";
import { RegionalIssueDetailView } from "@/features/regional-issues/RegionalIssueDetailView";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function RegionalIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const resolvedParams = use(params);
  const regionId = resolvedParams.id;
  const issueId = resolvedParams.issueId;

  const {
    data: issue,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetRegionalIssueByIdQuery(
    { regionId, issueId },
    { skip: !regionId || !issueId }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loading01 />
      </div>
    );
  }

  if (isError || !issue) {
    const errorMsg = (error as any)?.data?.message || "Regional issue not found or access denied.";
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Unable to Load Issue</h2>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Link href={`/${regionId}/issues`}>
          <Button variant="outline">Back to Regional Issues</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2">
      <RegionalIssueDetailView
        regionId={regionId}
        issue={issue}
        onRefresh={refetch}
      />
    </div>
  );
}

