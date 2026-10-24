"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Briefcase,
  Pickaxe,
  Factory,
  Layers,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetCompaniesQuery, useGetCompanyRolesQuery } from "@/redux/api/companyApi";
import { CompanyDashboardView } from "@/features/company-management/CompanyDashboardView";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  AnalyticsPanel,
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { SimpleBarChart } from "@/features/plan-management/dashboard/components/SimpleBarChart";
import Loading01 from "@/features/template/component/Loading/Loading01";

export function CompaniesDashboardTab() {
  const { data: session } = useSession();
  const user = session?.user;
  const isCompanyUser = Boolean(user?.company_id);

  // Fetch registered companies from live registry
  const {
    data: companies = [],
    isLoading: isCompaniesLoading,
    isFetching: isCompaniesFetching,
    refetch: refetchCompanies,
  } = useGetCompaniesQuery();

  const { data: companyRoles = [] } = useGetCompanyRolesQuery();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const activeCompanyId = useMemo(() => {
    if (user?.company_id) return user.company_id;
    if (selectedCompanyId) return selectedCompanyId;
    if (companies.length > 0) return companies[0].company_id;
    return "";
  }, [user?.company_id, selectedCompanyId, companies]);

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.company_id === activeCompanyId);
  }, [companies, activeCompanyId]);

  const totalCompanies = companies.length;
  const activeCompaniesCount = companies.filter((c) => c.is_active).length;
  const inactiveCompaniesCount = totalCompanies - activeCompaniesCount;

  if (isCompaniesLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ----------------- COMPANIES SCOPE HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Building2 className="h-6 w-6 text-blue-600" />
              Companies Management Dashboard
            </h2>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Live Registry Data
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Mining companies registry oversight, operational status, license governance, and enterprise structure.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isCompanyUser && companies.length > 0 && (
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">Select Company:</span>
              <Select
                value={activeCompanyId}
                onValueChange={(val) => setSelectedCompanyId(val)}
              >
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none text-xs font-semibold focus:ring-0 min-w-[200px]">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((comp) => (
                    <SelectItem key={comp.company_id} value={comp.company_id} className="text-xs">
                      {comp.name} ({comp.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCompanies()}
            disabled={isCompaniesFetching}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCompaniesFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ----------------- NATIONAL COMPANIES REGISTRY OVERVIEW ----------------- */}
      {!isCompanyUser && (
        <div className="space-y-4">
          <DashboardSectionHeader
            title="National Enterprise Registry Overview"
            description="Federation-wide summary of registered commercial mining and mineral exploration operators."
            badge="Registry Roster"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Registered Companies"
              value={totalCompanies}
              subtitle="Active & pending operators"
              icon={Building2}
              accent="secondary"
            />
            <KpiCard
              title="Active Operators"
              value={activeCompaniesCount}
              subtitle={`${totalCompanies > 0 ? Math.round((activeCompaniesCount / totalCompanies) * 100) : 0}% active status`}
              icon={CheckCircle2}
              accent="success"
            />
            <KpiCard
              title="Inactive / Suspended"
              value={inactiveCompaniesCount}
              subtitle="Requires compliance review"
              icon={Clock}
              accent={inactiveCompaniesCount > 0 ? "warning" : "secondary"}
            />
            <KpiCard
              title="Enterprise Roles"
              value={companyRoles.length}
              subtitle="Cross-company RBAC profiles"
              icon={Users}
              accent="accent"
            />
          </div>
        </div>
      )}

      {/* ----------------- LIVE COMPANY DASHBOARD DEEP DIVE ----------------- */}
      {activeCompanyId ? (
        <div className="space-y-4">
          <DashboardSectionHeader
            title={`Enterprise Oversight: ${activeCompany?.name || "Mining Operator"}`}
            description="Live company dashboard, user allocation, license credentials, and departmental structure."
            badge="Live Telemetry"
          />

          <CompanyDashboardView
            overrideCompanyId={activeCompanyId}
            hideHeaderNavigation={true}
          />
        </div>
      ) : (
        <div className="p-8 text-center border rounded-2xl bg-muted/20 text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-sm font-medium">No company records available for your account scope.</p>
        </div>
      )}

      {/* ----------------- STATIC PREVIEW SECTION (COMMERCIAL PRODUCTION & REVENUE) ----------------- */}
      <div className="space-y-4 pt-6 border-t border-dashed border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <DashboardSectionHeader
            title="Static Preview: Commercial Mineral Export & Royalty Forecasts"
            description="Future industrial enterprise production monitoring and export valuation telemetry."
            badge="Static Preview"
          />
          <Badge variant="outline" className="w-fit bg-amber-50 text-amber-700 border-amber-300 font-semibold px-2.5 py-1">
            Static Preview — Non-Production Preview
          </Badge>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-xs text-amber-900 leading-relaxed space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            Static Demonstration Notice
          </p>
          <p>
            The charts below depict the planned visualization for enterprise mineral export volumes and federal royalty contributions.
            These figures are realistic sample data. Live reporting will connect dynamically once backend services implement <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GET /api/v1/companies/analytics/exports-revenue</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsPanel
            title="Industrial Export Volume by Mineral"
            description="Simulated annual export aggregates across commercial mining concession holders."
            headerAction={<Badge variant="secondary">Demo Dataset</Badge>}
          >
            <SimpleBarChart
              title="Export Volume (MT)"
              description="Forecasted metric tons"
              valueSuffix=" MT"
              items={[
                { label: "Gold (Refined)", value: 5.6 },
                { label: "Tantalite (Ta2O5)", value: 120 },
                { label: "Lithium Concentrate", value: 340 },
                { label: "Potash", value: 580 },
                { label: "Industrial Marble", value: 1250 },
              ]}
            />
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Estimated Federal Royalty Distribution"
            description="Simulated contribution across top producing mining operators."
            headerAction={<Badge variant="secondary">Demo Dataset</Badge>}
          >
            <SimpleBarChart
              title="Royalty Contribution"
              description="Estimated million ETB"
              valueSuffix="M ETB"
              items={[
                { label: "MIDROC Gold", value: 145 },
                { label: "Ezana Mining", value: 68 },
                { label: "Kurmuk Mining", value: 54 },
                { label: "Kenticha Lithium", value: 42 },
                { label: "National Potash", value: 31 },
              ]}
            />
          </AnalyticsPanel>
        </div>
      </div>
    </div>
  );
}
