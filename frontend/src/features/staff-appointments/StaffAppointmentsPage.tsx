"use client";

import DetailHeader from "@/components/common/DetailHeader";
import { StaffAppointmentsTable } from "./StaffAppointmentsTable";
import { WorkflowSummaryCards } from "@/features/medical-workflow/WorkflowSummaryCards";

export default function StaffAppointmentsPage() {
  return (
    <div className="space-y-6">
      <DetailHeader breadcrumbs={[{ title: "Appointments" }]} />
      <WorkflowSummaryCards />
      <StaffAppointmentsTable />
    </div>
  );
}
