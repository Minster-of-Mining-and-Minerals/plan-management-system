import { HistoricalReportsView } from "@/features/gold-purchasing/HistoricalReportsView";

export const metadata = {
  title: "Historical Gold Reports | Plan Management System",
  description: "Register of submitted historical daily gold purchasing reports.",
};

export default async function HistoricalReportsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return <HistoricalReportsView centerId={id} />;
}
