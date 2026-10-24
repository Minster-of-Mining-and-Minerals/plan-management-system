import { PurchaseRegisterView } from "@/features/gold-purchasing/PurchaseRegisterView";

export const metadata = {
  title: "Gold Purchase Register | Plan Management System",
  description: "View and filter all gold purchase transactions recorded by this purchasing center.",
};

export default async function PurchasesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return <PurchaseRegisterView centerId={id} />;
}
