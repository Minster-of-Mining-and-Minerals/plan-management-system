import { PharmacyPrescriptionList } from "@/features/pharmacy-portal/PharmacyPrescriptionList";

export default function PharmacyQueuePage() {
  return (
    <PharmacyPrescriptionList
      title="Dispensing queue"
      description="Prescriptions being reviewed or prepared"
      queue
    />
  );
}
