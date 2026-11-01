"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { RegionalNationalReportingView } from "@/features/regional-national-reporting/RegionalNationalReportingView";
import Loading01 from "@/features/template/component/Loading/Loading01";

export default function RegionalNationalReportingPage() {
  const params = useParams<{ id: string }>();
  const { data: session, status } = useSession();

  const regionId = params?.id || session?.user?.region_id;

  if (status === "loading") {
    return <Loading01 />;
  }

  if (!regionId) {
    return (
      <div className="p-8 text-center text-slate-500">
        No regional identifier found in the current workspace.
      </div>
    );
  }

  return <RegionalNationalReportingView regionId={regionId} />;
}

