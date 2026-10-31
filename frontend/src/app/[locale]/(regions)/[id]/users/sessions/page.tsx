"use client";

import { useParams } from "next/navigation";
import { UserSessionsAdminView } from "@/features/security-management/UserSessionsAdminView";

export default function RegionalUserSessionsPage() {
  const params = useParams();
  const regionId = params?.id as string;

  return (
    <div className="p-6">
      <UserSessionsAdminView
        domain="regional"
        regionId={regionId}
        title="Regional User Sessions & Device Control"
        description="Monitor and control active sessions and enforce device security within this regional administration"
      />
    </div>
  );
}

