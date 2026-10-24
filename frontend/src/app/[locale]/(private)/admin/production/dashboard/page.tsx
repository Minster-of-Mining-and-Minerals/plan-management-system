import { FederalProductionDashboardView } from "@/features/production/FederalProductionDashboardView";

export const metadata = {
  title: "Federal Production Dashboard | Plan Management System",
  description: "Monitor nationwide company production actuals, dynamic target hierarchies, compliance, and achievement rates.",
};

export default function FederalProductionDashboardPage() {
  return <FederalProductionDashboardView />;
}
