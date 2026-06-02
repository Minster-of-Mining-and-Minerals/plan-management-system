import { PharmacyPrescriptionDetailPage } from "@/features/pharmacy-portal/PharmacyPrescriptionDetailPage";

type Props = { params: Promise<{ id: string }> };

export default async function PharmacyPrescriptionDetailRoute({ params }: Props) {
  const { id } = await params;
  return <PharmacyPrescriptionDetailPage prescriptionId={id} />;
}
