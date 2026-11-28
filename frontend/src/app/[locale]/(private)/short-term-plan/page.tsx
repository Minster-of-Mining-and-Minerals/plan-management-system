import { PermissionGuard } from "@/utils/PermissionGuard";
import { ShortTermPlanView } from "@/features/short-term-plan/ShortTermPlanView";

export const metadata = {
  title: "Short-Term Plan & KPI Reporting | Plan Management System",
  description: "Manage 3-month and 5-month internal sector short-term KPIs, cascading assignments, and narrative/numeric reporting.",
};

export default function ShortTermPlanPage() {
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
          You do not have permission to access Short-Term Plans.
        </div>
      }
    >
      <ShortTermPlanView />
    </PermissionGuard>
  );
}
