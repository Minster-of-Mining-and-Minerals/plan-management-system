"use client";

import { PublicNavbar } from "@/features/public/components/PublicNavbar";
import { EnterpriseFooter } from "@/features/public/components/EnterpriseFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <main>{children}</main>
      <EnterpriseFooter />
    </div>
  );
}
