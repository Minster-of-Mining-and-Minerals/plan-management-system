"use client";

import { useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import SocketNotificationProvider from "@/providers/SocketNotificationProvider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { CompanyAppSidebar } from "@/components/layout/company-app-sidebar";
import { Header } from "@/components/layout/header";
import { RoutePermissionGuard } from "@/components/guards/RoutePermissionGuard";
import { SecuritySettingsBridge } from "@/components/guards/SecuritySettingsBridge";
import { useSession, signOut } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/usePermissions";
import { AUTH_ROUTES, isChangePasswordPath } from "@/constants/authRoutes";
import { useGetCompanyByIdQuery } from "@/redux/api/companyApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { AlertCircle, ShieldAlert, LogOut, ArrowLeft } from "lucide-react";
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
  const { isLoading: isAuthLoading, roles } = useAuth();
  const { permissions: userPermissions } = usePermissions();

  const isSuperAdmin = roles?.some(
    (r) =>
      String(r).toLowerCase() === "super admin" ||
      String(r).toLowerCase() === "superadmin"
  );
  const canManageCompanies =
    userPermissions.includes("COMPANIES:READ") ||
    userPermissions.includes("COMPANIES:MANAGE");

  const isAuthorizedAdmin = Boolean(isSuperAdmin || canManageCompanies);
  const assignedCompanyId = session?.user?.company_id;
  const isFirstLogin = session?.user?.is_first_logged_in;
  const isChangePasswordPage = isChangePasswordPath(pathname);

  // 1. Fetch company metadata and active status
  const {
    data: company,
    isLoading: isCompanyLoading,
    isError: isCompanyError,
  } = useGetCompanyByIdQuery(requestedCompanyId, {
    skip: !requestedCompanyId,
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
      // If user belongs to a specific company: strictly enforce requestedCompanyId === assignedCompanyId
      if (assignedCompanyId) {
        if (requestedCompanyId && requestedCompanyId !== assignedCompanyId) {
          // Immediately route back to user's assigned company
          router.replace(`/companies/${assignedCompanyId}` as any);
          return;
        }
      } else if (!isAuthorizedAdmin) {
        // Federal or regional account WITHOUT admin privileges attempting to enter company workspace -> redirect safely
        if (session?.user?.region_id) {
          router.replace(`/regions/${session.user.region_id}` as any);
        } else {
          router.replace("/dashboard");
        }
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
    isAuthorizedAdmin,
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

  // Non-company user attempting to view company workspace without administrative preview authorization
  if (!assignedCompanyId && !isAuthorizedAdmin) {
    return <Loading01 />;
  }

  // Cross-company violation protection shell (company users cannot jump to another company)
  if (assignedCompanyId && requestedCompanyId && requestedCompanyId !== assignedCompanyId) {
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

  const isAdminPreview = !assignedCompanyId && isAuthorizedAdmin;

  return (
    <SidebarProvider>
      <SecuritySettingsBridge />
      {!isFirstLogin && <CompanyAppSidebar companyId={requestedCompanyId} />}
      <SocketNotificationProvider>
        <SidebarInset>
          <Header
            title={`${company?.name ? `${company.name} — ` : ""}${pageTitle}`}
          />
          {isAdminPreview && (
            <div className="mx-6 mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Administrator Preview Mode:</strong> You are viewing the operational company workspace for{" "}
                  <strong className="underline underline-offset-2">{company?.name || "Company"}</strong>.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 gap-1.5"
              >
                <Link href={`/admin/companies/${requestedCompanyId}`}>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to Admin View
                </Link>
              </Button>
            </div>
          )}
          <div className="p-6">
            <RoutePermissionGuard>{children}</RoutePermissionGuard>
          </div>
        </SidebarInset>
      </SocketNotificationProvider>
    </SidebarProvider>
  );
}
