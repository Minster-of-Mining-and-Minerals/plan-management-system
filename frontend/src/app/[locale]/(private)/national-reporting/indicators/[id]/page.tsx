"use client";

import React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useGetNationalDashboardSummaryQuery,
  useGetNationalRequirementByIdQuery,
} from "@/redux/api/nationalReportingApi";
import {
  NationalIndicatorDetailView,
  NationalIndicatorDetailData,
} from "@/features/national-reporting/NationalIndicatorDetailView";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NationalIndicatorDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const indicatorId = params?.id;
  const yearParam = searchParams.get("year");
  const periodParam = searchParams.get("period");

  const reportingYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const periodLabel = periodParam || "all";

  // Fetch summary to get full aggregates and regional breakdown
  const { data: summary, isLoading: isSummaryLoading } = useGetNationalDashboardSummaryQuery({
    reporting_year: reportingYear,
    reporting_period_label: periodLabel !== "all" ? periodLabel : undefined,
  });

  // Also fetch requirement directly as fallback
  const { data: requirement, isLoading: isReqLoading } = useGetNationalRequirementByIdQuery(
    indicatorId || "",
    { skip: !indicatorId }
  );

  if (isSummaryLoading || isReqLoading) {
    return <Loading01 />;
  }

  if (!indicatorId) {
    return (
      <div className="p-8 text-center text-slate-500">
        No indicator identifier provided.
      </div>
    );
  }

  // Find in summary requirementSummaries
  const summaryItem = summary?.requirementSummaries?.find(
    (s) => s.requirementId === indicatorId
  );

  let indicatorData: NationalIndicatorDetailData | null = null;

  if (summaryItem) {
    indicatorData = summaryItem;
  } else if (requirement) {
    // Fallback construct from requirement
    indicatorData = {
      requirementId: requirement.requirement_id,
      code: requirement.code,
      title: requirement.title,
      description: requirement.description,
      category: requirement.category,
      expectedUnit: requirement.expected_unit,
      frequency: requirement.frequency,
      assignedRegionsCount: requirement.assignments?.length || 0,
      submittedRegionsCount: 0,
      isCompleteData: false,
      dataCompletenessPercent: 0,
      nationalTotalTarget: 0,
      nationalTotalActual: 0,
      achievementRate: 0,
      assignedRegions: (requirement.assignments || []).map((a) => ({
        assignmentId: a.assignment_id,
        regionId: a.region_id,
        regionName: a.region?.name || "Unknown Region",
        regionCode: a.region?.code || "",
        isMandatory: a.is_mandatory,
        status: "pending_submission",
        submissionMethod: a.region?.national_reporting_method || "form_based",
        reportedActual: null,
        plannedTarget: null,
        localUnit: requirement.expected_unit,
        standardizedActual: null,
        standardizedTarget: null,
        standardizedUnit: requirement.expected_unit,
        achievementPercent: null,
      })),
    };
  }

  if (!indicatorData) {
    return (
      <div className="p-8 space-y-4 text-center">
        <div className="inline-flex p-3 rounded-full bg-amber-50 text-amber-600 mb-2">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Indicator Not Found
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The requested national indicator could not be retrieved. It may have been removed or is not assigned in the current cycle.
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
    <NationalIndicatorDetailView
      indicator={indicatorData}
      onBack={() => router.push("/national-reporting?tab=dashboard")}
      reportingYear={reportingYear}
      periodLabel={periodLabel}
    />
  );
}

