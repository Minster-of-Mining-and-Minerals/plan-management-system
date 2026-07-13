"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import SocketNotificationProvider from "@/providers/SocketNotificationProvider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { RoutePermissionGuard } from "@/components/guards/RoutePermissionGuard";
import { SecuritySettingsBridge } from "@/components/guards/SecuritySettingsBridge";
import { useSession } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { AUTH_ROUTES, isChangePasswordPath } from "@/constants/authRoutes";
import Loading01 from "@/features/template/component/Loading/Loading01";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isLoading: isAuthLoading } = useAuth();

  const isFirstLogin = session?.user?.is_first_logged_in;
  const isChangePasswordPage = isChangePasswordPath(pathname);

  useEffect(() => {
    if (status === "unauthenticated") {
      notFound();
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && isFirstLogin && !isChangePasswordPage) {
      router.push(AUTH_ROUTES.changePassword);
    }
  }, [status, isFirstLogin, isChangePasswordPage, router]);

  if (
    status === "loading" ||
    status === "unauthenticated" ||
    isAuthLoading
  ) {
    return <Loading01 />;
  }

  if (isFirstLogin && !isChangePasswordPage) {
    return <Loading01 />;
  }

  const breadcrumb = pathname
    .split("/")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));

  const title = breadcrumb.join(" / ");

  return (
    <SidebarProvider>
      <SecuritySettingsBridge />
      {!isFirstLogin && <AppSidebar />}
      <SocketNotificationProvider>
      <SidebarInset>
        <Header title={title || "Dashboard"} />
        <div className="p-6">
          <RoutePermissionGuard>{children}</RoutePermissionGuard>
        </div>
      </SidebarInset>
      </SocketNotificationProvider>
    </SidebarProvider>
  );
}
