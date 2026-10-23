import { PurchasingCenterList } from "@/features/purchasing-center-management/PurchasingCenterList";

export const metadata = {
  title: "Purchasing Centers Administration | Plan Management System",
  description: "Manage mineral purchasing centers, accounts, and system branding.",
};

export default function PurchasingCentersPage() {
  return <PurchasingCenterList />;
}
