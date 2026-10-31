"use client";

import { useParams } from "next/navigation";
import { UserSessionsAdminView } from "@/features/security-management/UserSessionsAdminView";

export default function CompanyUserSessionsPage() {
  const params = useParams();
  const companyId = params?.id as string;

  return (
    <div className="p-6">
      <UserSessionsAdminView
        domain="company"
        companyId={companyId}
        title="Company User Sessions & Device Control"
        description="Monitor and manage active employee sessions and authorized devices for this enterprise"
      />
    </div>
  );
}

