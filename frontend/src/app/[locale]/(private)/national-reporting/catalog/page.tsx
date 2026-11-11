import { NationalReportingView } from "@/features/national-reporting/NationalReportingView";

export const metadata = {
  title: "Requirements Catalog & Units | National Reporting",
  description: "Define national reporting requirements, standardized indicators, and unit configurations.",
};

export default function NationalReportingCatalogPage() {
  return <NationalReportingView defaultTab="requirements" />;
}
