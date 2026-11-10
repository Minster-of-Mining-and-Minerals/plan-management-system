"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  useGetRegionalAssignedRequirementsQuery,
  useGetRegionNationalReportingConfigQuery,
} from "@/redux/api/nationalReportingApi";
import { RegionalKpiDetailView } from "@/features/regional-national-reporting/RegionalKpiDetailView";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function RegionalKpiDetailPage() {
  const params = useParams<{ id: string; assignmentId: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();

  const regionId = params?.id || session?.user?.region_id;
  const assignmentId = params?.assignmentId;

  const { data: assignments = [], isLoading } =
    useGetRegionalAssignedRequirementsQuery(
      { regionId: regionId || "" },
      { skip: !regionId }
    );

  const { data: regionConfig } = useGetRegionNationalReportingConfigQuery(
    regionId || "",
    { skip: !regionId }
  );

  const isFormReportingActive = regionConfig
    ? Boolean(regionConfig.is_form_reporting_effective)
    : true;

  if (status === "loading" || isLoading) {
    return <Loading01 />;
  }

  if (!regionId || !assignmentId) {
    return (
      <div className="p-8 text-center text-slate-500">
        Missing required parameters for KPI detail view.
      </div>
    );
  }

  const assignment = assignments.find((a) => a.assignment_id === assignmentId);

  if (!assignment) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          KPI Mandate Not Found
        </h2>
        <p className="text-xs text-slate-500">
          The requested national indicator mandate could not be found or has not been assigned to your region.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(`/${params?.id ? params.id : regionId}/national-reporting`)}
          className="text-xs"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Return to National Reporting
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <RegionalKpiDetailView
        assignment={assignment}
        regionId={regionId}
        onBack={() => router.back()}
        isFormReportingActive={isFormReportingActive}
      />
    </div>
  );
}
