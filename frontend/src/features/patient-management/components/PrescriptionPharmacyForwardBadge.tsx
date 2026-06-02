"use client";

import { Badge } from "@/components/ui/badge";
import type { SchedulePrescriptionForward } from "@/redux/types/pharmacy";

type Props = {
  forward?: SchedulePrescriptionForward | null;
  className?: string;
};

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  reviewing: "Reviewing",
  preparing: "Preparing",
  partially_dispensed: "Partially dispensed",
  dispensed: "Dispensed",
  unavailable: "Unavailable",
  rejected: "Rejected",
  completed: "Completed",
};

export function PrescriptionPharmacyForwardBadge({ forward, className }: Props) {
  if (!forward?.is_forwarded && !forward?.forward_id) return null;

  const pharmacyStatus = forward.pharmacy_status
    ? STATUS_LABELS[forward.pharmacy_status] || forward.pharmacy_status
    : null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <Badge variant="secondary" className="text-xs">
        Sent to pharmacy
      </Badge>
      {forward.pharmacy_name && (
        <Badge variant="outline" className="text-xs">
          {forward.pharmacy_name}
        </Badge>
      )}
      {pharmacyStatus && (
        <Badge variant="outline" className="text-xs capitalize">
          {pharmacyStatus}
        </Badge>
      )}
      {forward.sent_at && (
        <span className="text-xs text-muted-foreground">
          {new Date(forward.sent_at).toLocaleString()}
        </span>
      )}
    </div>
  );
}
