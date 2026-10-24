import { PurchaseRegisterView } from "@/features/gold-purchasing/PurchaseRegisterView";

export const metadata = {
  title: "Cross-Center Purchases Register | Plan Management System",
  description: "View and filter all gold purchase transactions recorded across all purchasing centers.",
};

export default function FederalPurchasesPage() {
  return <PurchaseRegisterView isFederalOversight={true} />;
}
