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
import { useGetPharmacyPortalUnreadCountQuery } from "@/redux/api/pharmacyPortalApi";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  prescriptions: "Prescriptions",
  notifications: "Notifications",
  profile: "Profile",
};

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: unreadCount = 0 } = useGetPharmacyPortalUnreadCountQuery(undefined, {
    skip: status !== "authenticated",
    pollingInterval: 60_000,
  });

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
  const pharmacyIdx = segments.indexOf("pharmacy");
  const section =
    pharmacyIdx >= 0 ? segments[pharmacyIdx + 1] || "dashboard" : "dashboard";
  const title = PAGE_TITLES[section] ?? "Pharmacy Portal";

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
          notificationCount={unreadCount}
        />
        <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-background via-background to-section-accent-subtle-10/30 p-4 sm:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
