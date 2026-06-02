"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { useSession } from "next-auth/react";
import { performLogout } from "@/utils/logout";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { PHARMACY_NAVIGATION } from "@/pharmacy-navigation.config";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Pharmacy Dashboard",
  received: "Received Prescriptions",
  queue: "Dispensing Queue",
  completed: "Completed Prescriptions",
  notifications: "Notifications",
  profile: "Pharmacy Profile",
};

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isFirstLogin = session?.user?.is_first_logged_in;
  const isChangePasswordPage = pathname.includes("/change-password");

  useEffect(() => {
    if (status === "unauthenticated") performLogout();
  }, [status]);

  useEffect(() => {
    if (session?.user?.account_type && session.user.account_type !== "PHARMACY") {
      router.replace(session.user.home_route || "/profile");
    }
  }, [session, router]);

  useEffect(() => {
    if (status === "authenticated" && isFirstLogin && !isChangePasswordPage) {
      router.push("/change-password");
    }
  }, [status, isFirstLogin, isChangePasswordPage, router]);

  if (status === "loading" || status === "unauthenticated") return <Loading01 />;
  if (isFirstLogin && !isChangePasswordPage) return <Loading01 />;

  const segments = pathname.split("/").filter(Boolean);
  const key = segments[segments.length - 1] || "dashboard";
  const title = PAGE_TITLES[key] ?? "Pharmacy Portal";

  return (
    <SidebarProvider>
      {!isFirstLogin && (
        <AppSidebar
          navigation={PHARMACY_NAVIGATION}
          showPermissionFilter={false}
          profileHref="/pharmacy/profile"
        />
      )}
      <SidebarInset>
        <Header
          title={title}
          showSidebar={!isFirstLogin}
          notificationsHref="/pharmacy/notifications"
        />
        <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-background via-background to-section-accent-subtle-10/30 p-4 sm:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
