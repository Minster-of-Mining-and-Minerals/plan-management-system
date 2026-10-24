import { DailyReportView } from "@/features/gold-purchasing/DailyReportView";

export const metadata = {
  title: "Daily Gold Purchasing Report | Plan Management System",
  description: "View itemized transaction totals, unit breakdowns, and submit daily gold reports.",
};

export default async function DailyReportPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return <DailyReportView centerId={id} />;
}
