"use client";

import { useParams } from "next/navigation";
import { RegionalDepartmentDetail } from "@/features/regional-management/RegionalDepartmentDetail";

export default function DynamicRegionalDepartmentDetailPage() {
  const params = useParams<{ departmentId: string }>();
  const departmentId = params?.departmentId || "";

  return <RegionalDepartmentDetail departmentId={departmentId} />;
}
