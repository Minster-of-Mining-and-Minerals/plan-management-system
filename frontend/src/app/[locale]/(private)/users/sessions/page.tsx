"use client";

import { UserSessionsAdminView } from "@/features/security-management/UserSessionsAdminView";

export default function FederalUserSessionsPage() {
  return (
    <div className="p-6">
      <UserSessionsAdminView
        domain="federal"
        title="Federal User Sessions & Security"
        description="Monitor, manage, terminate, and restrict active user sessions and devices across federal institutions"
      />
    </div>
  );
}

