"use client";

import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/common/PermissionGuard";

type Props = {
  disabled?: boolean;
  showSendToPharmacy?: boolean;
  hasForwardedPrescriptions?: boolean;
  onBack: () => void;
  onSendToPharmacy: () => void;
};

export function ScheduleWorkflowActions({
  disabled,
  showSendToPharmacy,
  hasForwardedPrescriptions,
  onBack,
  onSendToPharmacy,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to patient
      </Button>

      {showSendToPharmacy && (
        <PermissionGuard requireAny={["PHARMACY_PRESCRIPTION:SEND"]} fallback={null}>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={onSendToPharmacy}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {hasForwardedPrescriptions
              ? "Manage pharmacy forwarding"
              : "Send to pharmacy"}
          </Button>
        </PermissionGuard>
      )}
    </div>
  );
}
