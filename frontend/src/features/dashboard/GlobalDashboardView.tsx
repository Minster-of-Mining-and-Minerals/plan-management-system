"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, ListTree, MapPin, Building2, Coins, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PlanDashboardView from "@/features/plan-management/dashboard/PlanDashboardView";
import IssueDashboardOverview from "@/features/issue-management/IssueDashboardOverview";
import { RegionalDashboardTab } from "@/features/dashboard/RegionalDashboardTab";
import { CompaniesDashboardTab } from "@/features/dashboard/CompaniesDashboardTab";
import { PurchasingCentersDashboardTab } from "@/features/dashboard/PurchasingCentersDashboardTab";
import { InspectionDashboardTab } from "@/features/dashboard/InspectionDashboardTab";
import { usePermissions } from "@/hooks/usePermissions";
import { ISSUE_VIEW_PERMISSIONS } from "@/utils/issuePermissionUtils";

export type DashboardTab =
  | "plan"
  | "issues"
  | "regional"
  | "companies"
  | "purchasing_centers"
  | "inspection";

export default function GlobalDashboardView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { canAny } = usePermissions();

  const user = session?.user as
    | (Record<string, unknown> & {
        region_id?: string;
        company_id?: string;
        purchasing_center_id?: string;
      })
    | undefined;

  const canViewIssues = canAny(ISSUE_VIEW_PERMISSIONS);
  const canViewRegional =
    canAny([
      "REGIONS:READ",
      "REGIONS:MANAGE",
      "REGIONAL_DASHBOARD:READ",
      "REGIONAL_STRUCTURES:READ",
    ]) || Boolean(user?.region_id);
  const canViewCompanies =
    canAny([
      "COMPANIES:READ",
      "COMPANIES:MANAGE",
      "COMPANY_DASHBOARD:READ",
      "COMPANY_STRUCTURES:READ",
    ]) || Boolean(user?.company_id);
  const canViewPurchasingCenters =
    canAny([
      "PURCHASING_CENTERS:READ",
      "PURCHASING_CENTERS:MANAGE",
      "GOLD_PURCHASES:READ",
      "GOLD_PURCHASES:READ_ALL",
      "PURCHASING_CENTER_DASHBOARD:VIEW",
      "GOLD_REPORTS:READ",
    ]) || Boolean(user?.purchasing_center_id);
  const isInternalFederal =
    !user?.region_id && !user?.company_id && !user?.purchasing_center_id;
  const canViewInspection =
    isInternalFederal &&
    canAny([
      "INSPECTION_ANALYTICS:READ",
      "INSPECTION_ANALYTICS:MANAGE",
      "INSPECTIONS:READ",
      "INSPECTIONS:MANAGE",
    ]);

  const requestedTab = searchParams.get("tab") as DashboardTab | null;

  let activeTab: DashboardTab = "plan";
  if (requestedTab === "issues" && canViewIssues) {
    activeTab = "issues";
  } else if (requestedTab === "regional" && canViewRegional) {
    activeTab = "regional";
  } else if (requestedTab === "companies" && canViewCompanies) {
    activeTab = "companies";
  } else if (requestedTab === "purchasing_centers" && canViewPurchasingCenters) {
    activeTab = "purchasing_centers";
  } else if (requestedTab === "inspection" && canViewInspection) {
    activeTab = "inspection";
  }

  const setActiveTab = (tab: DashboardTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "plan") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-primary">Integrated National Dashboard</h1>
        <p className="text-sm text-muted-foreground max-w-4xl">
          Centralized cross-domain analytics for the Ministry of Mines. Switch between
          Plan Management, Issue Tracking, Regional Administrations, Mining Companies, Gold Purchasing Centers, and Mining Inspection.
        </p>
      </div>

      <div
        className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border bg-card p-2.5 shadow-xs"
        role="tablist"
        aria-label="Dashboard type"
      >
        <Button
          type="button"
          role="tab"
          aria-selected={activeTab === "plan"}
          variant={activeTab === "plan" ? "default" : "outline"}
          onClick={() => setActiveTab("plan")}
          className={cn(
            "h-10 rounded-xl px-4 text-xs font-semibold shadow-none transition-all",
            activeTab === "plan"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <ListTree className="h-4 w-4 shrink-0" />
          Plan Dashboard
        </Button>

        {canViewIssues && (
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "issues"}
            variant={activeTab === "issues" ? "default" : "outline"}
            onClick={() => setActiveTab("issues")}
            className={cn(
              "h-10 rounded-xl px-4 text-xs font-semibold shadow-none transition-all",
              activeTab === "issues"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            Issue Dashboard
          </Button>
        )}

        {canViewRegional && (
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "regional"}
            variant={activeTab === "regional" ? "default" : "outline"}
            onClick={() => setActiveTab("regional")}
            className={cn(
              "h-10 rounded-xl px-4 text-xs font-semibold shadow-none transition-all",
              activeTab === "regional"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            Regional Dashboard
          </Button>
        )}

        {canViewCompanies && (
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "companies"}
            variant={activeTab === "companies" ? "default" : "outline"}
            onClick={() => setActiveTab("companies")}
            className={cn(
              "h-10 rounded-xl px-4 text-xs font-semibold shadow-none transition-all",
              activeTab === "companies"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            Companies Dashboard
          </Button>
        )}

        {canViewPurchasingCenters && (
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "purchasing_centers"}
            variant={activeTab === "purchasing_centers" ? "default" : "outline"}
            onClick={() => setActiveTab("purchasing_centers")}
            className={cn(
              "h-10 rounded-xl px-4 text-xs font-semibold shadow-none transition-all",
              activeTab === "purchasing_centers"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Coins className="h-4 w-4 shrink-0" />
            Purchasing Centers Dashboard
          </Button>
        )}

        {canViewInspection && (
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "inspection"}
            variant={activeTab === "inspection" ? "default" : "outline"}
            onClick={() => setActiveTab("inspection")}
            className={cn(
              "h-10 rounded-xl px-4 text-xs font-semibold shadow-none transition-all",
              activeTab === "inspection"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            Inspection Dashboard
          </Button>
        )}
      </div>

      <div role="tabpanel">
        {activeTab === "plan" && <PlanDashboardView embedded />}
        {activeTab === "issues" && <IssueDashboardOverview />}
        {activeTab === "regional" && <RegionalDashboardTab />}
        {activeTab === "companies" && <CompaniesDashboardTab />}
        {activeTab === "purchasing_centers" && <PurchasingCentersDashboardTab />}
        {activeTab === "inspection" && <InspectionDashboardTab />}
      </div>
    </div>
  );
}
