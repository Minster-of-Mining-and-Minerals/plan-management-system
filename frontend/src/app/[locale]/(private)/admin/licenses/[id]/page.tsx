import { LicenseDetailView } from "@/features/license-management/LicenseDetailView";

export const metadata = {
  title: "Mining License Details & GIS Boundary | Plan Management System",
  description: "View license coordinates, validity period, administrative boundaries and production reporting assignments.",
};

export default async function LicenseDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return <LicenseDetailView licenseId={id} />;
}
