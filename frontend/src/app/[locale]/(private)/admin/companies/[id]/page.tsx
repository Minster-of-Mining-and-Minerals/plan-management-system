import { CompanyDetail } from "@/features/company-management/CompanyDetail";

export const metadata = {
  title: "Company Details & Management | Plan Management System",
  description: "Manage company organizational structure, users, and branding settings.",
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return <CompanyDetail companyId={id} />;
}
