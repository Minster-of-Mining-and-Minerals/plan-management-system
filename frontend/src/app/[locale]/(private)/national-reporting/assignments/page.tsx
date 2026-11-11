import { NationalReportingView } from "@/features/national-reporting/NationalReportingView";

export const metadata = {
  title: "Regional Assignments | National Reporting",
  description: "Assign national reporting mandates to regional states and configure lock periods.",
};

export default function NationalReportingAssignmentsPage() {
  return <NationalReportingView defaultTab="assignments" />;
}

