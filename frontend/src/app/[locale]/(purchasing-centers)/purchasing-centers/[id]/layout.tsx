"use client";

import { useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import SocketNotificationProvider from "@/providers/SocketNotificationProvider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PurchasingCenterAppSidebar } from "@/components/layout/purchasing-center-app-sidebar";
import { Header } from "@/components/layout/header";
import { RoutePermissionGuard } from "@/components/guards/RoutePermissionGuard";
import { SecuritySettingsBridge } from "@/components/guards/SecuritySettingsBridge";
import { useSession } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { AUTH_ROUTES, isChangePasswordPath } from "@/constants/authRoutes";
import { useGetPurchasingCenterByIdQuery } from "@/redux/api/purchasingCenterApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { AlertCircle, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export default function DynamicPurchasingCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const requestedCenterId = params?.id;

  const { data: session, status } = useSession();
  const { isLoading: isAuthLoading, roles } = useAuth();
  const isSuperAdmin = roles?.some((r) => String(r).toLowerCase() === "super admin");

  const sessionUser = session?.user as (Record<string, unknown> & { purchasing_center_id?: string }) | undefined;
  const assignedCenterId = sessionUser?.purchasing_center_id;
  const isFirstLogin = session?.user?.is_first_logged_in;
  const isChangePasswordPage = isChangePasswordPath(pathname);

  // 1. Fetch purchasing center metadata
  const {
    data: center,
    isLoading: isCenterLoading,
    isError: isCenterError,
  } = useGetPurchasingCenterByIdQuery(requestedCenterId, {
    skip: !requestedCenterId,
  });

  // 2. Unauthenticated check
  useEffect(() => {
    if (status === "unauthenticated") {
      notFound();
    }
  }, [status]);

  // 3. Domain separation and Center Ownership Invariant enforcement
  useEffect(() => {
    if (status === "authenticated") {
      // If user belongs to a purchasing center: strictly enforce requestedCenterId === assignedCenterId
      if (assignedCenterId) {
        if (requestedCenterId && requestedCenterId !== assignedCenterId) {
          // Immediately redirect to user's assigned center
          router.replace(`/purchasing-centers/${assignedCenterId}`);
          return;
        }
      } else if (!isSuperAdmin) {
        // Federal user without super admin trying to access purchasing center workspace
        router.replace("/dashboard");
        return;
      }

      // Force first-time password change
      if (isFirstLogin && !isChangePasswordPage) {
        router.push(AUTH_ROUTES.changePassword);
      }
    }
  }, [
    status,
    assignedCenterId,
    requestedCenterId,
    isSuperAdmin,
    isFirstLogin,
    isChangePasswordPage,
    router,
  ]);

  if (
    status === "loading" ||
    status === "unauthenticated" ||
    isAuthLoading ||
    isCenterLoading
  ) {
    return <Loading01 />;
  }

  // Cross-center violation protection shell
  if (assignedCenterId && requestedCenterId && requestedCenterId !== assignedCenterId) {
    return <Loading01 />;
  }

  if (isFirstLogin && !isChangePasswordPage) {
    return <Loading01 />;
  }

  // Handle missing or inactive purchasing center
  if (isCenterError || (center && !center.is_active)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border shadow-lg text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center text-destructive">
            {center && !center.is_active ? (
              <AlertCircle className="w-8 h-8" />
            ) : (
              <ShieldAlert className="w-8 h-8" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {center && !center.is_active
                ? "Purchasing Center Inactive"
                : "Center Not Found"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {center && !center.is_active
                ? `The workspace for "${center.name}" has been marked inactive by the administration.`
                : "The requested purchasing center could not be found or verified."}
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumb = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== requestedCenterId && segment !== "purchasing-centers")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));

  const pageTitle = breadcrumb.length > 0 ? breadcrumb.join(" / ") : "Dashboard";

  return (
    <SidebarProvider>
      <SecuritySettingsBridge />
      {!isFirstLogin && <PurchasingCenterAppSidebar centerId={requestedCenterId} />}
      <SocketNotificationProvider>
        <SidebarInset>
          <Header title={`${center?.name ? `${center.name} — ` : ""}${pageTitle}`} />
          <div className="p-6">
            <RoutePermissionGuard>{children}</RoutePermissionGuard>
          </div>
        </SidebarInset>
      </SocketNotificationProvider>
    </SidebarProvider>
  );
}
