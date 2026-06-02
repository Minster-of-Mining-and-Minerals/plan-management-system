import { PharmacyDetailPage } from "@/features/pharmacy-management/PharmacyDetailPage";

type Props = { params: Promise<{ id: string }> };

export default async function PharmacyDetailRoute({ params }: Props) {
  const { id } = await params;
  return <PharmacyDetailPage pharmacyId={id} />;
}
