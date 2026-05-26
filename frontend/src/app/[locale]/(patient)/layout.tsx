"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { useSession } from "next-auth/react";
import { performLogout } from "@/utils/logout";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { PATIENT_NAVIGATION } from "@/patient-navigation.config";
import { MOCK_NOTIFICATIONS } from "@/features/patient-portal/data/mockPatientPortalData";

const PATIENT_PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  appointments: "Appointments",
  "lab-results": "Lab Results",
  prescriptions: "Prescriptions",
  "medical-history": "Medical History",
  telemedicine: "Telemedicine",
  notifications: "Notifications",
  family: "Family Health",
  billing: "Billing & Payments",
  "ai-health": "AI Health Assistant",
  profile: "Profile & Settings",
};

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isFirstLogin = session?.user?.is_first_logged_in;
  const isChangePasswordPage = pathname.includes("/change-password");

  useEffect(() => {
    if (status === "unauthenticated") {
      performLogout();
    }
  }, [status]);

  useEffect(() => {
    if (session?.user?.account_type === "INTERNAL") {
      router.replace("/profile");
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

  if (isFirstLogin && !isChangePasswordPage) {
    return <Loading01 />;
  }

  const segments = pathname.split("/").filter(Boolean);
  const patientSegment = segments.find((s) => s === "patient")
    ? segments[segments.indexOf("patient") + 1]
    : undefined;
  const title = patientSegment
    ? PATIENT_PAGE_TITLES[patientSegment] ?? patientSegment.replace(/-/g, " ")
    : "Patient Portal";
  const unreadNotifications = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <SidebarProvider>
      {!isFirstLogin && (
        <AppSidebar
          navigation={PATIENT_NAVIGATION}
          showPermissionFilter={false}
          profileHref="/patient/profile"
        />
      )}
      <SidebarInset>
        <Header
          title={title}
          showSidebar={!isFirstLogin}
          notificationsHref="/patient/notifications"
          notificationCount={unreadNotifications}
        />
        <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-background via-background to-section-accent-subtle-10/30 p-4 sm:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
