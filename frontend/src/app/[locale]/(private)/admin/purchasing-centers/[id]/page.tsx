import { PurchasingCenterDetail } from "@/features/purchasing-center-management/PurchasingCenterDetail";

export const metadata = {
  title: "Purchasing Center Details & Management | Plan Management System",
  description: "Manage purchasing center accounts, roles, permissions, and branding settings.",
};

export default async function PurchasingCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return <PurchasingCenterDetail centerId={id} />;
}
