"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PlanDashboardView from "@/features/plan-management/dashboard/PlanDashboardView";
import IssueDashboardOverview from "@/features/issue-management/IssueDashboardOverview";
import { usePermissions } from "@/hooks/usePermissions";
import { ISSUE_VIEW_PERMISSIONS } from "@/utils/issuePermissionUtils";

type DashboardTab = "plan" | "issues";

export default function GlobalDashboardView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { canAny } = usePermissions();
  const canViewIssues = canAny(ISSUE_VIEW_PERMISSIONS);

  const requestedTab = searchParams.get("tab");
  const activeTab: DashboardTab =
    requestedTab === "issues" && canViewIssues ? "issues" : "plan";

  const setActiveTab = (tab: DashboardTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "plan") {
      params.delete("tab");
    } else {
      params.set("tab", "issues");
    }
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          National plan performance and issue tracking in one place. Switch between
          plan analytics and issue management overview.
        </p>
      </div>

      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm"
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
            "h-10 rounded-xl px-4 shadow-none",
            activeTab === "plan"
              ? "bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
              "h-10 rounded-xl px-4 shadow-none",
              activeTab === "issues"
                ? "bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            Issue Dashboard
          </Button>
        )}
      </div>

      <div role="tabpanel">
        {activeTab === "plan" ? (
          <PlanDashboardView embedded />
        ) : (
          <IssueDashboardOverview />
        )}
      </div>
    </div>
  );
}
