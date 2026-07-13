"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { useSession } from "next-auth/react";
import { performLogout } from "@/utils/logout";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyPermission } from "@/lib/permissions";
import { useGetUnreadNotificationCountQuery } from "@/redux/api/notificationApi";
import { useInternalNavigation } from "@/hooks/useInternalNavigation";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { permissions, isLoaded } = useAuth();
  const isFirstLogin = session?.user?.is_first_logged_in;
  const canReceiveClinical = hasAnyPermission(permissions, [
    "PATIENTS:RECEIVE_APPOINTMENT",
    "PATIENTS:RECEIVE_PATIENT",
  ]);

  const { data: unreadCount = 0 } = useGetUnreadNotificationCountQuery(
    undefined,
    {
      skip: !isLoaded || !canReceiveClinical,
      pollingInterval: canReceiveClinical ? 30_000 : 0,
    }
  );

  const navigation = useInternalNavigation();
  const showSidebar = isLoaded && permissions.length > 0;
  const isChangePasswordPage = pathname.includes("/change-password");

  useEffect(() => {
    if (status === "unauthenticated") {
      performLogout();
    }
  }, [status]);

  useEffect(() => {
    if (session?.user?.account_type === "PATIENT") {
      router.replace("/patient/profile");
    } else if (session?.user?.account_type === "PHARMACY") {
      router.replace("/pharmacy/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    if (status === "authenticated" && isFirstLogin && !isChangePasswordPage) {
      router.push("/change-password");
    }
  }, [status, isFirstLogin, isChangePasswordPage, router]);

  if (status === "loading" || status === "unauthenticated") {
    return <Loading01 />;
  }

  // If first login and not on change password page, show loading while redirecting
  if (isFirstLogin && !isChangePasswordPage) {
    return <Loading01 />;
  }

  // Convert "/user/new" → ["User", "New"]
  const breadcrumb = pathname
    .split("/")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));

  // If only "/dashboard" → show just "Dashboard"
  const title = breadcrumb.join(" / ");

  return (
    <SidebarProvider>
      {!isFirstLogin && showSidebar && <AppSidebar navigation={navigation} />}
      <SidebarInset>
        <Header
          title={title || "Profile"}
          showSidebar={showSidebar}
          notificationsHref={
            canReceiveClinical ? "/notifications" : undefined
          }
          notificationCount={canReceiveClinical ? unreadCount : 0}
        />
        <div className="p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
