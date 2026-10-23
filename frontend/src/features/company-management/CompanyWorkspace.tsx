"use strict";
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useBranding } from "@/providers/BrandingProvider";
import {
  useGetCompanyStructuresQuery,
  useGetCompanyByIdQuery,
} from "@/redux/api/companyApi";

export function CompanyWorkspace() {
  const { data: session } = useSession();
  const { branding } = useBranding();

  const user = session?.user;
  const companyId = user?.company_id;

  const { data: company } = useGetCompanyByIdQuery(
    companyId || "",
    { skip: !companyId }
  );

  const { data: structures = [], isLoading: isStructuresLoading } =
    useGetCompanyStructuresQuery(
      { company_id: companyId || "" },
      { skip: !companyId }
    );

  if (!companyId) {
    return (
      <div className="space-y-6">
        <Card className="border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
          <Building2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground">Federal / Non-Company Account</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
            You are currently logged in with a non-company account. Company workspaces are dedicated
            to independent mining and exploration company domain users.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/companies">Manage Companies</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const companyName = company?.name || branding.system_name_full || "Mining Company";
  const companyCode = company?.code || "COMP";

  return (
    <div className="space-y-6">
      {/* Company Hero Banner with configured branding */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-r from-card to-muted/30 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {companyCode} Domain
              </span>
              <ActiveStatusBadge isActive={company?.is_active ?? true} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-emerald-600" />
              {companyName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {branding.system_tagline || "Independent Mining and Mineral Operations Workspace"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-muted-foreground">Logged in as</div>
              <div className="text-sm font-semibold text-foreground">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Company
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyName}</div>
            <p className="text-xs text-muted-foreground">Code: {companyCode}</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Company Departments
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{structures.length}</div>
            <p className="text-xs text-muted-foreground">Internal business units and divisions</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Security Scope
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Company Domain</div>
            <p className="text-xs text-muted-foreground">Strict domain & data isolation active</p>
          </CardContent>
        </Card>
      </div>

      {/* Organizational Structure for this Company */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Company Organizational Structure
          </CardTitle>
          <CardDescription className="text-xs">
            Organizational hierarchy and departments configured for {companyName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isStructuresLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading departments...</div>
          ) : structures.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No company departments configured yet. An administrator can register departments in Company Administration.
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-md border">
              {structures.map((s) => (
                <div
                  key={s.company_structure_id}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      L{s.level}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.parent?.name ? `Under: ${s.parent.name}` : "Root Department"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">
                      {s.users_count || 0} staff members
                    </span>
                    <ActiveStatusBadge isActive={s.is_active} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
