import { CompanyList } from "@/features/company-management/CompanyList";

export const metadata = {
  title: "Company Administration | Plan Management System",
  description: "Manage independent mining and exploration companies, departments, user accounts, and branding.",
};

export default function CompaniesPage() {
  return <CompanyList />;
}
