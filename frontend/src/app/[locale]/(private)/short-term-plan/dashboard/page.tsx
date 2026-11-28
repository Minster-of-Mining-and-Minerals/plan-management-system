import { PermissionGuard } from "@/utils/PermissionGuard";
import { ShortTermDashboardPageView } from "@/features/short-term-plan/ShortTermDashboardPageView";

export const metadata = {
  title: "Short-Term Plan Dashboard | Plan Management System",
  description: "Analytics dashboard for internal short-term plans, sectors, departments, and target achievements.",
};

export default function ShortTermPlanDashboardPage() {
  return (
    <PermissionGuard
      requireAny={[
        "SHORT_TERM_PLAN:VIEW",
        "SHORT_TERM_PLAN:CREATE",
        "SHORT_TERM_PLAN:EDIT",
        "SHORT_TERM_PLAN:ASSIGN",
        "SHORT_TERM_PLAN:REPORT",
      ]}
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">
          You do not have permission to view the Short-Term Plan Dashboard.
        </div>
      }
    >
      <ShortTermDashboardPageView />
    </PermissionGuard>
  );
}
