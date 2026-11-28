import { PermissionGuard } from "@/utils/PermissionGuard";
import { ShortTermKpiDetailView } from "@/features/short-term-plan/ShortTermKpiDetailView";

export const metadata = {
  title: "Short-Term KPI Detail | Plan Management System",
  description: "Analytics, assignment hierarchy, and Ethiopian-calendar-locked reporting for short-term KPIs.",
};

export default async function ShortTermKpiDetailPage({
  params,
}: {
  params: Promise<{ kpiId: string }>;
}) {
  const { kpiId } = await params;

  return (
    <PermissionGuard
      requireAny={[
        "SHORT_TERM_PLAN:VIEW",
        "SHORT_TERM_PLAN:REPORT",
        "SHORT_TERM_PLAN:CREATE",
        "SHORT_TERM_PLAN:EDIT",
        "SHORT_TERM_PLAN:ASSIGN",
      ]}
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">
          You do not have permission to view this Short-Term KPI.
        </div>
      }
    >
      <ShortTermKpiDetailView kpiId={kpiId} />
    </PermissionGuard>
  );
}
