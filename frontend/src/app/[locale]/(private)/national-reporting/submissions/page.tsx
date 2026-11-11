import { NationalReportingView } from "@/features/national-reporting/NationalReportingView";

export const metadata = {
  title: "Published Submissions | National Reporting",
  description: "Monitor and review validated regional national reporting submissions.",
};

export default function NationalReportingSubmissionsPage() {
  return <NationalReportingView defaultTab="submissions" />;
}

