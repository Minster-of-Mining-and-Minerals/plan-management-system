import { PurchaseDetailView } from "@/features/gold-purchasing/PurchaseDetailView";

export const metadata = {
  title: "Purchase Details | Plan Management System",
  description: "View verified gold purchase receipt details and auditable transaction snapshots.",
};

export default async function FederalPurchaseDetailPage({
  params,
}: {
  params: Promise<{ purchaseId: string; locale: string }>;
}) {
  const { purchaseId } = await params;
  return <PurchaseDetailView purchaseId={purchaseId} isFederalOversight={true} />;
}
