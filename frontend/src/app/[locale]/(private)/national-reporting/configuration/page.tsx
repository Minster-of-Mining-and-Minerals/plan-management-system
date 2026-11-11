import { NationalReportingView } from "@/features/national-reporting/NationalReportingView";

export const metadata = {
  title: "National Reporting Configuration | Plan Management System",
  description: "Configure reporting categories, measurement categories, and national unit conversion matrices.",
};

export default function NationalReportingConfigurationPage() {
  return <NationalReportingView defaultTab="configuration" />;
}

