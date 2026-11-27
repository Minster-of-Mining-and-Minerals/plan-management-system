import { ShortTermPlanView } from "@/features/short-term-plan/ShortTermPlanView";

export const metadata = {
  title: "Short-Term Plan & KPI Reporting | Plan Management System",
  description: "Manage 3-month and 5-month internal sector short-term KPIs, cascading assignments, and narrative/numeric reporting.",
};

export default function ShortTermPlanPage() {
  return <ShortTermPlanView />;
}
