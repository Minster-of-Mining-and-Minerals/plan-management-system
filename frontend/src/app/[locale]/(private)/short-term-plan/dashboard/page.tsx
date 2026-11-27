import { ShortTermDashboardPageView } from "@/features/short-term-plan/ShortTermDashboardPageView";

export const metadata = {
  title: "Short-Term Plan Dashboard | Plan Management System",
  description: "Analytics dashboard for internal short-term plans, sectors, departments, and target achievements.",
};

export default function ShortTermPlanDashboardPage() {
  return <ShortTermDashboardPageView />;
}
