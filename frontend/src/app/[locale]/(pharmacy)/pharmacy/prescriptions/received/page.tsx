import { PharmacyPrescriptionList } from "@/features/pharmacy-portal/PharmacyPrescriptionList";

export default function PharmacyReceivedPage() {
  return (
    <PharmacyPrescriptionList
      title="Received prescriptions"
      description="New prescriptions sent from the hospital"
      pharmacy_status="received"
    />
  );
}
