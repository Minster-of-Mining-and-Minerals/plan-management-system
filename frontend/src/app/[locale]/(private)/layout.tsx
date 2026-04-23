"use client";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Convert "/user/new" → ["User", "New"]
  const breadcrumb = pathname
    .split("/")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));

  // If only "/dashboard" → show just "Dashboard"
  const title = breadcrumb.join(" / ");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header title={title || "Dashboard"} />
        <div className="p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
