"use client";

import { useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import SocketNotificationProvider from "@/providers/SocketNotificationProvider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { RegionalAppSidebar } from "@/components/layout/regional-app-sidebar";
import { Header } from "@/components/layout/header";
import { RoutePermissionGuard } from "@/components/guards/RoutePermissionGuard";
import { SecuritySettingsBridge } from "@/components/guards/SecuritySettingsBridge";
import { useSession } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { AUTH_ROUTES, isChangePasswordPath } from "@/constants/authRoutes";
import { useGetRegionByIdQuery } from "@/redux/api/regionApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { AlertCircle, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export default function DynamicRegionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const requestedRegionId = params?.id;

  const { data: session, status } = useSession();
  const { isLoading: isAuthLoading } = useAuth();

  const assignedRegionId = session?.user?.region_id;
  const isFirstLogin = session?.user?.is_first_logged_in;
  const isChangePasswordPage = isChangePasswordPath(pathname);

  // 1. Fetch region metadata and active status
  const {
    data: region,
    isLoading: isRegionLoading,
    isError: isRegionError,
  } = useGetRegionByIdQuery(requestedRegionId, {
    skip: !requestedRegionId || !assignedRegionId || requestedRegionId !== assignedRegionId,
  });

  // 2. Unauthenticated check
  useEffect(() => {
    if (status === "unauthenticated") {
      notFound();
    }
  }, [status]);

  // 3. Domain separation and Region Ownership Invariant enforcement
  useEffect(() => {
    if (status === "authenticated") {
      // Federal account attempting to enter regional workspace -> redirect to federal dashboard
      if (!assignedRegionId) {
        router.replace("/dashboard");
        return;
      }

      // Region Ownership Invariant: requested region ID === authenticated user's assigned region ID
      if (requestedRegionId && requestedRegionId !== assignedRegionId) {
        // Enforce strict isolation: immediately route back to user's assigned region
        const isRegionsPrefixed = pathname.includes("/regions/");
        const targetPath = isRegionsPrefixed
          ? `/regions/${assignedRegionId}`
          : `/${assignedRegionId}`;
        router.replace(targetPath as any);
        return;
      }

      // Force first-time password change
      if (isFirstLogin && !isChangePasswordPage) {
        router.push(AUTH_ROUTES.changePassword);
      }
    }
  }, [
    status,
    assignedRegionId,
    requestedRegionId,
    isFirstLogin,
    isChangePasswordPage,
    pathname,
    router,
  ]);

  if (
    status === "loading" ||
    status === "unauthenticated" ||
    isAuthLoading ||
    isRegionLoading
  ) {
    return <Loading01 />;
  }

  // Federal user attempting to view regional workspace
  if (!assignedRegionId) {
    return <Loading01 />;
  }

  // Cross-region violation protection shell
  if (requestedRegionId && requestedRegionId !== assignedRegionId) {
    return <Loading01 />;
  }

  if (isFirstLogin && !isChangePasswordPage) {
    return <Loading01 />;
  }

  // Handle missing or inactive region
  if (isRegionError || (region && !region.is_active)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border shadow-lg text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center text-destructive">
            {region && !region.is_active ? (
              <AlertCircle className="w-8 h-8" />
            ) : (
              <ShieldAlert className="w-8 h-8" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {region && !region.is_active
                ? "Regional Workspace Inactive"
                : "Region Not Found"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {region && !region.is_active
                ? `The workspace for "${region.name}" has been marked inactive by the administration.`
                : "The requested regional administration could not be found or verified."}
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
    .filter((segment) => segment !== requestedRegionId && segment !== "regions")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));

  const pageTitle = breadcrumb.length > 0 ? breadcrumb.join(" / ") : "Dashboard";

  return (
    <SidebarProvider>
      <SecuritySettingsBridge />
      {!isFirstLogin && <RegionalAppSidebar regionId={requestedRegionId} />}
      <SocketNotificationProvider>
        <SidebarInset>
          <Header title={`${region?.name ? `${region.name} — ` : ""}${pageTitle}`} />
          <div className="p-6">
            <RoutePermissionGuard>{children}</RoutePermissionGuard>
          </div>
        </SidebarInset>
      </SocketNotificationProvider>
    </SidebarProvider>
  );
}
