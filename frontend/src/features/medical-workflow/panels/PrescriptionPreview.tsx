"use client";

import { PrescriptionCreationPanel } from "@/features/prescription-workflow/PrescriptionCreationPanel";
import type { PrescriptionRecord } from "@/redux/types/prescription";

type Props = {
  appointmentId: string;
  patientId: string;
  patientName?: string;
  onClose?: () => void;
  onConfirm: (prescription: PrescriptionRecord) => void;
  isSubmitting?: boolean;
};

export function PrescriptionPreview({
  appointmentId,
  patientId,
  patientName,
  onClose,
  onConfirm,
  isSubmitting,
}: Props) {
  return (
    <PrescriptionCreationPanel
      appointmentId={appointmentId}
      patientId={patientId}
      patientName={patientName}
      onClose={onClose}
      onLegacyConfirm={onConfirm}
    />
  );
}
