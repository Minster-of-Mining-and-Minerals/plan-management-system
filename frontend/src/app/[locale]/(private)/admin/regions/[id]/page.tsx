import { RegionDetail } from "@/features/regional-management/RegionDetail";

export const metadata = {
  title: "Region Details & Management | Plan Management System",
  description: "Manage regional organizational structure, users, and branding settings.",
};

export default async function RegionDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return <RegionDetail regionId={id} />;
}
