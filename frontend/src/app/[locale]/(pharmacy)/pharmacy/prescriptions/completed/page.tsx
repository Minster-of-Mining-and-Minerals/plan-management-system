import { PharmacyPrescriptionList } from "@/features/pharmacy-portal/PharmacyPrescriptionList";

export default function PharmacyCompletedPage() {
  return (
    <PharmacyPrescriptionList
      title="Completed prescriptions"
      description="Fulfilled and completed dispensing records"
      pharmacy_status="completed"
    />
  );
}
