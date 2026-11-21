import { LicenseDirectoryView } from "@/features/license-management/LicenseDirectoryView";

export const metadata = {
  title: "Mining Licenses Directory | Plan Management System",
  description: "Browse, filter and inspect all mining and exploration licenses across Ethiopia.",
};

export default function LicenseDirectoryPage() {
  return <LicenseDirectoryView />;
}
