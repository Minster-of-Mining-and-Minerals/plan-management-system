"use client";

import { useParams } from "next/navigation";
import { UserSessionsAdminView } from "@/features/security-management/UserSessionsAdminView";

export default function PurchasingCenterUserSessionsPage() {
  const params = useParams();
  const centerId = params?.id as string;

  return (
    <div className="p-6">
      <UserSessionsAdminView
        domain="purchasing_center"
        purchasingCenterId={centerId}
        title="Purchasing Center Sessions & Device Control"
        description="Monitor active operator sessions and restrict unauthorized hardware at this purchasing station"
      />
    </div>
  );
}

