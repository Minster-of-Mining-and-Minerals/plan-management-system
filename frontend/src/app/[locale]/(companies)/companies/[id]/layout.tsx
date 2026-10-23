"use client";

import { useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import SocketNotificationProvider from "@/providers/SocketNotificationProvider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { CompanyAppSidebar } from "@/components/layout/company-app-sidebar";
import { Header } from "@/components/layout/header";
import { RoutePermissionGuard } from "@/components/guards/RoutePermissionGuard";
import { SecuritySettingsBridge } from "@/components/guards/SecuritySettingsBridge";
import { useSession, signOut } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { AUTH_ROUTES, isChangePasswordPath } from "@/constants/authRoutes";
import { useGetCompanyByIdQuery } from "@/redux/api/companyApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { AlertCircle, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DynamicCompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const requestedCompanyId = params?.id;

  const { data: session, status } = useSession();
  const { isLoading: isAuthLoading } = useAuth();

  const assignedCompanyId = session?.user?.company_id;
  const isFirstLogin = session?.user?.is_first_logged_in;
  const isChangePasswordPage = isChangePasswordPath(pathname);

  // 1. Fetch company metadata and active status
  const {
    data: company,
    isLoading: isCompanyLoading,
    isError: isCompanyError,
  } = useGetCompanyByIdQuery(requestedCompanyId, {
    skip:
      !requestedCompanyId ||
      !assignedCompanyId ||
      requestedCompanyId !== assignedCompanyId,
  });

  // 2. Unauthenticated check
  useEffect(() => {
    if (status === "unauthenticated") {
      notFound();
    }
  }, [status]);

  // 3. Domain separation and Company Ownership Invariant enforcement
  useEffect(() => {
    if (status === "authenticated") {
      // Federal or regional account attempting to enter company workspace -> redirect safely
      if (!assignedCompanyId) {
        if (session?.user?.region_id) {
          router.replace(`/regions/${session.user.region_id}` as any);
        } else {
          router.replace("/dashboard");
        }
        return;
      }

      // Company Ownership Invariant: requested company ID === authenticated user's assigned company ID
      if (requestedCompanyId && requestedCompanyId !== assignedCompanyId) {
        // Enforce strict isolation: immediately route back to user's assigned company
        router.replace(`/companies/${assignedCompanyId}` as any);
        return;
      }

      // Force first-time password change
      if (isFirstLogin && !isChangePasswordPage) {
        router.push(AUTH_ROUTES.changePassword);
      }
    }
  }, [
    status,
    assignedCompanyId,
    requestedCompanyId,
    isFirstLogin,
    isChangePasswordPage,
    session,
    router,
  ]);

  if (
    status === "loading" ||
    status === "unauthenticated" ||
    isAuthLoading ||
    isCompanyLoading
  ) {
    return <Loading01 />;
  }

  // Non-company user attempting to view company workspace
  if (!assignedCompanyId) {
    return <Loading01 />;
  }

  // Cross-company violation protection shell
  if (requestedCompanyId && requestedCompanyId !== assignedCompanyId) {
    return <Loading01 />;
  }

  if (isFirstLogin && !isChangePasswordPage) {
    return <Loading01 />;
  }

  // Handle missing or inactive company
  if (isCompanyError || (company && !company.is_active)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border shadow-lg text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center text-destructive">
            {company && !company.is_active ? (
              <AlertCircle className="w-8 h-8" />
            ) : (
              <ShieldAlert className="w-8 h-8" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {company && !company.is_active
                ? "Company Workspace Inactive"
                : "Company Not Found"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {company && !company.is_active
                ? `The workspace for "${company.name}" has been marked inactive by the administration.`
                : "The requested company workspace could not be found or verified."}
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
    .filter(
      (segment) => segment !== requestedCompanyId && segment !== "companies"
    )
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));

  const pageTitle =
    breadcrumb.length > 0 ? breadcrumb.join(" / ") : "Dashboard";

  return (
    <SidebarProvider>
      <SecuritySettingsBridge />
      {!isFirstLogin && <CompanyAppSidebar companyId={requestedCompanyId} />}
      <SocketNotificationProvider>
        <SidebarInset>
          <Header
            title={`${company?.name ? `${company.name} — ` : ""}${pageTitle}`}
          />
          <div className="p-6">
            <RoutePermissionGuard>{children}</RoutePermissionGuard>
          </div>
        </SidebarInset>
      </SocketNotificationProvider>
    </SidebarProvider>
  );
}
