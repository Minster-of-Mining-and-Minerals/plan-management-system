"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useGetRegionalAssignedRequirementsQuery,
  useGetNationalPublishedRecordsQuery,
} from "@/redux/api/nationalReportingApi";
import { useGetRegionByIdQuery } from "@/redux/api/regionApi";
import { NationalRegionDetailView } from "@/features/national-reporting/NationalRegionDetailView";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NationalRegionDetailPage() {
  const params = useParams<{ regionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const regionId = params?.regionId;
  const yearParam = searchParams.get("year");
  const periodParam = searchParams.get("period");

  const [reportingYear, setReportingYear] = useState<number>(
    yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()
  );
  const [periodLabel, setPeriodLabel] = useState<string>(periodParam || "all");

  const { data: region, isLoading: isRegionLoading } = useGetRegionByIdQuery(
    regionId || "",
    { skip: !regionId }
  );

  const { data: assignments = [], isLoading: isAssignmentsLoading } =
    useGetRegionalAssignedRequirementsQuery(
      { regionId: regionId || "" },
      { skip: !regionId }
    );

  const { data: publishedRecords = [], isLoading: isRecordsLoading } =
    useGetNationalPublishedRecordsQuery(
      {
        region_id: regionId || undefined,
        reporting_year: reportingYear,
        reporting_period_label: periodLabel !== "all" ? periodLabel : undefined,
      },
      { skip: !regionId }
    );

  if (isRegionLoading || isAssignmentsLoading || isRecordsLoading) {
    return <Loading01 />;
  }

  if (!regionId || !region) {
    return (
      <div className="p-8 space-y-4 text-center">
        <div className="inline-flex p-3 rounded-full bg-amber-50 text-amber-600 mb-2">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Region Not Found
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The requested regional state could not be retrieved or is not configured for national reporting.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/national-reporting?tab=dashboard")}
          className="text-xs"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to National Dashboard
        </Button>
      </div>
    );
  }

  return (
    <NationalRegionDetailView
      region={region}
      assignments={assignments}
      publishedRecords={publishedRecords}
      reportingYear={reportingYear}
      periodLabel={periodLabel}
      onYearChange={setReportingYear}
      onPeriodChange={setPeriodLabel}
      onBack={() => router.push("/national-reporting?tab=dashboard")}
    />
  );
}
