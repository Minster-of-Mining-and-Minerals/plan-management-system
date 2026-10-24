import { FederalReportMonitoringView } from "@/features/gold-purchasing/FederalReportMonitoringView";

export const metadata = {
  title: "Federal Daily Report Monitoring | Plan Management System",
  description: "Monitor daily gold purchasing report completion, submission status, and reconciliation across all purchasing centers.",
};

export default function FederalReportMonitoringPage() {
  return <FederalReportMonitoringView />;
}
