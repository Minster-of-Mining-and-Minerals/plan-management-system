"use client";

import { useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "next-auth/react";
import { useGetSecuritySystemSettingsQuery } from "@/redux/api/systemSettingsApi";
import { normalizeToPermissionKeys, type PermissionKey } from "@/lib/permissions";
import { matchRoutePermissionRule } from "@/lib/route-permissions";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  KeyRound,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageActionDiagnostic {
  actionName: string;
  canonicalCode: PermissionKey;
  domain: "Regional" | "Purchasing Centers" | "Companies" | "Plans" | "Federal Admin" | "General";
  scope: "Federal" | "Regional" | "Purchasing Center" | "Company" | "Global";
  endpoint: string;
}

/**
 * Authoritative mapping of pages to their operational actions and required canonical permissions.
 */
function resolvePageActionDiagnostics(pathname: string): PageActionDiagnostic[] {
  const norm = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  // Regional Admin & Workspace
  if (norm.startsWith("/admin/regions")) {
    return [
      { actionName: "View Regions List", canonicalCode: "REGIONS:READ", domain: "Regional", scope: "Federal", endpoint: "GET /api/v1/regions" },
      { actionName: "Create New Region", canonicalCode: "REGIONS:CREATE", domain: "Regional", scope: "Federal", endpoint: "POST /api/v1/regions" },
      { actionName: "Update Region Details", canonicalCode: "REGIONS:UPDATE", domain: "Regional", scope: "Federal", endpoint: "PUT /api/v1/regions/:id" },
      { actionName: "Delete Region", canonicalCode: "REGIONS:DELETE", domain: "Regional", scope: "Federal", endpoint: "DELETE /api/v1/regions/:id" },
    ];
  }

  if (norm.includes("/plans")) {
    if (norm.includes("/regions/") || norm.startsWith("/regional/")) {
      return [
        { actionName: "View Regional Plans", canonicalCode: "REGIONAL_PLANS:READ", domain: "Regional", scope: "Regional", endpoint: "GET /api/v1/regional-plans" },
        { actionName: "Create Regional Plan", canonicalCode: "REGIONAL_PLANS:CREATE", domain: "Regional", scope: "Regional", endpoint: "POST /api/v1/regional-plans" },
        { actionName: "Update Regional Plan", canonicalCode: "REGIONAL_PLANS:UPDATE", domain: "Regional", scope: "Regional", endpoint: "PUT /api/v1/regional-plans/:id" },
        { actionName: "Configure Plan Settings", canonicalCode: "REGIONAL_PLANNING_CONFIG:READ", domain: "Regional", scope: "Regional", endpoint: "GET /api/v1/regional-planning-config" },
        { actionName: "Manage Plan Rules", canonicalCode: "REGIONAL_PLAN_RULES:READ", domain: "Regional", scope: "Regional", endpoint: "GET /api/v1/regional-plan-rules" },
      ];
    }
  }

  if (norm.startsWith("/regions/") || norm.startsWith("/regional")) {
    return [
      { actionName: "View Regional Dashboard", canonicalCode: "REGIONAL_DASHBOARD:VIEW", domain: "Regional", scope: "Regional", endpoint: "GET /api/v1/regional-operational/dashboard" },
      { actionName: "Manage Departments", canonicalCode: "REGIONAL_STRUCTURES:READ", domain: "Regional", scope: "Regional", endpoint: "GET /api/v1/regional-structures" },
      { actionName: "View Regional Users", canonicalCode: "REGIONAL_USERS:READ", domain: "Regional", scope: "Regional", endpoint: "GET /api/v1/regional-users" },
      { actionName: "Manage Regional Roles", canonicalCode: "REGIONAL_ROLES:READ", domain: "Regional", scope: "Regional", endpoint: "GET /api/v1/roles?scope=regional" },
      { actionName: "Manage Branding", canonicalCode: "REGIONAL_BRANDING:READ", domain: "Regional", scope: "Regional", endpoint: "GET /api/v1/regional-branding" },
    ];
  }

  // Gold Operations Federal Oversight
  if (norm.startsWith("/admin/gold-operations")) {
    if (norm.includes("/purchases")) {
      return [
        { actionName: "View Purchases Register", canonicalCode: "GOLD_PURCHASES:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/gold-purchases" },
        { actionName: "Oversight Management", canonicalCode: "GOLD_OVERSIGHT:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/gold-oversight/oversight-dashboard" },
        { actionName: "Cancel Purchase Record", canonicalCode: "GOLD_PURCHASES:CANCEL", domain: "Purchasing Centers", scope: "Federal", endpoint: "POST /api/v1/gold-purchases/:id/cancel" },
      ];
    }
    if (norm.includes("/reports")) {
      return [
        { actionName: "View Daily Reports", canonicalCode: "GOLD_REPORTS:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/gold-reports" },
        { actionName: "Export Daily Reports", canonicalCode: "GOLD_REPORTS:EXPORT", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/gold-reports/export" },
        { actionName: "Oversight Management", canonicalCode: "GOLD_OVERSIGHT:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/gold-oversight/oversight-dashboard" },
      ];
    }
    if (norm.includes("/asm")) {
      return [
        { actionName: "View ASM Registry", canonicalCode: "ASM:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/asm-miners" },
        { actionName: "Register ASM Miner", canonicalCode: "ASM:CREATE", domain: "Purchasing Centers", scope: "Federal", endpoint: "POST /api/v1/asm-miners" },
        { actionName: "Update ASM Status", canonicalCode: "ASM:DEACTIVATE", domain: "Purchasing Centers", scope: "Federal", endpoint: "PATCH /api/v1/asm-miners/:id/status" },
      ];
    }
    if (norm.includes("/units")) {
      return [
        { actionName: "View Measurement Units", canonicalCode: "GOLD_UNITS:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/gold-units" },
        { actionName: "Create Measurement Unit", canonicalCode: "GOLD_UNITS:CREATE", domain: "Purchasing Centers", scope: "Federal", endpoint: "POST /api/v1/gold-units" },
        { actionName: "Update Measurement Unit", canonicalCode: "GOLD_UNITS:UPDATE", domain: "Purchasing Centers", scope: "Federal", endpoint: "PUT /api/v1/gold-units/:id" },
      ];
    }
    return [
      { actionName: "View Oversight Dashboard", canonicalCode: "GOLD_OVERSIGHT:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/gold-oversight/oversight-dashboard" },
      { actionName: "Manage Purchasing Centers", canonicalCode: "PURCHASING_CENTERS:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/purchasing-centers" },
    ];
  }

  // Purchasing Centers Admin & Workspace
  if (norm.startsWith("/admin/purchasing-centers")) {
    return [
      { actionName: "View Purchasing Centers", canonicalCode: "PURCHASING_CENTERS:READ", domain: "Purchasing Centers", scope: "Federal", endpoint: "GET /api/v1/purchasing-centers" },
      { actionName: "Create Purchasing Center", canonicalCode: "PURCHASING_CENTERS:CREATE", domain: "Purchasing Centers", scope: "Federal", endpoint: "POST /api/v1/purchasing-centers" },
      { actionName: "Update Purchasing Center", canonicalCode: "PURCHASING_CENTERS:UPDATE", domain: "Purchasing Centers", scope: "Federal", endpoint: "PUT /api/v1/purchasing-centers/:id" },
      { actionName: "Delete Purchasing Center", canonicalCode: "PURCHASING_CENTERS:DELETE", domain: "Purchasing Centers", scope: "Federal", endpoint: "DELETE /api/v1/purchasing-centers/:id" },
    ];
  }

  if (norm.startsWith("/purchasing-centers/") || norm.startsWith("/purchasing-center")) {
    return [
      { actionName: "View Center Dashboard", canonicalCode: "PURCHASING_CENTER_DASHBOARD:VIEW", domain: "Purchasing Centers", scope: "Purchasing Center", endpoint: "GET /api/v1/purchasing-center-operational/dashboard" },
      { actionName: "Record Gold Purchase", canonicalCode: "GOLD_PURCHASES:CREATE", domain: "Purchasing Centers", scope: "Purchasing Center", endpoint: "POST /api/v1/gold-purchases" },
      { actionName: "View Purchases", canonicalCode: "GOLD_PURCHASES:READ", domain: "Purchasing Centers", scope: "Purchasing Center", endpoint: "GET /api/v1/gold-purchases" },
      { actionName: "Submit Daily Report", canonicalCode: "GOLD_REPORTS:SUBMIT", domain: "Purchasing Centers", scope: "Purchasing Center", endpoint: "POST /api/v1/gold-reports/submit" },
      { actionName: "Register ASM Seller", canonicalCode: "ASM:CREATE", domain: "Purchasing Centers", scope: "Purchasing Center", endpoint: "POST /api/v1/asm-miners" },
      { actionName: "Manage Center Users", canonicalCode: "PURCHASING_CENTER_USERS:READ", domain: "Purchasing Centers", scope: "Purchasing Center", endpoint: "GET /api/v1/purchasing-center-users" },
      { actionName: "Manage Center Roles", canonicalCode: "PURCHASING_CENTER_ROLES:READ", domain: "Purchasing Centers", scope: "Purchasing Center", endpoint: "GET /api/v1/roles?scope=purchasing_center" },
    ];
  }

  // Companies Admin & Workspace
  if (norm.startsWith("/admin/companies")) {
    return [
      { actionName: "View Companies List", canonicalCode: "COMPANIES:READ", domain: "Companies", scope: "Federal", endpoint: "GET /api/v1/companies" },
      { actionName: "Create New Company", canonicalCode: "COMPANIES:CREATE", domain: "Companies", scope: "Federal", endpoint: "POST /api/v1/companies" },
      { actionName: "Update Company Details", canonicalCode: "COMPANIES:UPDATE", domain: "Companies", scope: "Federal", endpoint: "PUT /api/v1/companies/:id" },
      { actionName: "Delete Company", canonicalCode: "COMPANIES:DELETE", domain: "Companies", scope: "Federal", endpoint: "DELETE /api/v1/companies/:id" },
    ];
  }

  if (norm.startsWith("/companies/")) {
    return [
      { actionName: "View Company Dashboard", canonicalCode: "COMPANY_DASHBOARD:VIEW", domain: "Companies", scope: "Company", endpoint: "GET /api/v1/company-operational/dashboard" },
      { actionName: "Manage Departments", canonicalCode: "COMPANY_STRUCTURES:READ", domain: "Companies", scope: "Company", endpoint: "GET /api/v1/company-structures" },
      { actionName: "Manage Company Users", canonicalCode: "COMPANY_USERS:READ", domain: "Companies", scope: "Company", endpoint: "GET /api/v1/company-users" },
      { actionName: "Manage Company Roles", canonicalCode: "COMPANY_ROLES:READ", domain: "Companies", scope: "Company", endpoint: "GET /api/v1/roles?scope=company" },
    ];
  }

  // Roles & Permissions Admin
  if (norm.startsWith("/users/roles")) {
    return [
      { actionName: "View Roles List", canonicalCode: "ROLES:READ", domain: "Federal Admin", scope: "Global", endpoint: "GET /api/v1/roles" },
      { actionName: "Create Role", canonicalCode: "ROLES:CREATE", domain: "Federal Admin", scope: "Global", endpoint: "POST /api/v1/roles" },
      { actionName: "Update Role & Permissions", canonicalCode: "ROLES:UPDATE", domain: "Federal Admin", scope: "Global", endpoint: "PUT /api/v1/roles/:id" },
      { actionName: "Delete Role", canonicalCode: "ROLES:DELETE", domain: "Federal Admin", scope: "Global", endpoint: "DELETE /api/v1/roles/:id" },
    ];
  }

  if (norm.startsWith("/users/permissions")) {
    return [
      { actionName: "View Full Permission Catalog", canonicalCode: "PERMISSIONS:READ", domain: "Federal Admin", scope: "Global", endpoint: "GET /api/v1/permissions" },
    ];
  }

  return [];
}

export function PagePermissionDiagnostics() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { permissions, roles } = useAuth();
  const { data: securitySettings } = useGetSecuritySystemSettingsQuery();
  const [isOpen, setIsOpen] = useState(false);

  const isEnabled =
    Boolean(securitySettings?.expose_required_permissions) ||
    process.env.NODE_ENV !== "production";

  if (!isEnabled) {
    return null;
  }

  const permissionKeys = normalizeToPermissionKeys(permissions);
  const isSuperAdmin = roles?.some(
    (r) =>
      String(r).toLowerCase() === "super admin" ||
      String(r).toLowerCase() === "superadmin"
  );

  const matchedRule = matchRoutePermissionRule(pathname);
  const diagnostics = resolvePageActionDiagnostics(pathname);

  // Calculate page entry permission status
  let pageEntryStatus: "Granted" | "Denied" = "Denied";
  let pageEntryCode = "AUTHENTICATED";
  if (matchedRule) {
    if (matchedRule.allPermissions?.length) {
      pageEntryCode = matchedRule.allPermissions.join(" AND ");
      pageEntryStatus =
        isSuperAdmin || matchedRule.allPermissions.every((p) => permissionKeys.includes(p))
          ? "Granted"
          : "Denied";
    } else if (matchedRule.anyPermissions?.length) {
      pageEntryCode = matchedRule.anyPermissions.join(" OR ");
      pageEntryStatus =
        isSuperAdmin || matchedRule.anyPermissions.some((p) => permissionKeys.includes(p))
          ? "Granted"
          : "Denied";
    } else {
      pageEntryStatus = "Granted";
    }
  } else {
    pageEntryStatus = isSuperAdmin ? "Granted" : "Denied";
  }

  const presentCount = diagnostics.filter(
    (d) => isSuperAdmin || permissionKeys.includes(d.canonicalCode)
  ).length;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-2xl font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur hover:bg-muted/80 transition-all text-primary"
          title="Click to view test-mode permission diagnostics"
        >
          <KeyRound className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span>Test Mode: Permissions</span>
          <Badge
            variant="outline"
            className={`text-[10px] font-mono font-bold ${
              pageEntryStatus === "Granted"
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-rose-50 text-rose-700 border-rose-300"
            }`}
          >
            {diagnostics.length > 0 ? `${presentCount}/${diagnostics.length} Active` : pageEntryStatus}
          </Badge>
          <ChevronUp className="h-3.5 w-3.5 opacity-60" />
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/50">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Test Mode: Page-to-Permission Matrix
                </h4>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {matchedRule?.pattern || pathname}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono">
                {isSuperAdmin ? "Super Admin Bypass Active" : `${permissionKeys.length} Effective Perms`}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsOpen(false)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto text-xs">
            {/* Route Entry Requirement */}
            <div className="rounded-lg border bg-muted/30 p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground text-[11px]">
                  PAGE ENTRY GUARD:
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    pageEntryStatus === "Granted"
                      ? "bg-emerald-100/70 text-emerald-800 border-emerald-300"
                      : "bg-rose-100/70 text-rose-800 border-rose-300"
                  }`}
                >
                  {pageEntryStatus === "Granted" ? "ALLOW VIEW" : "ACCESS DENIED"}
                </Badge>
              </div>
              <div className="font-mono text-xs text-foreground font-medium break-all">
                {pageEntryCode}
              </div>
            </div>

            {/* In-Page Actions */}
            {diagnostics.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Protected Operations & Required Canonical Permissions
                </div>
                <div className="divide-y rounded-lg border bg-background overflow-hidden">
                  {diagnostics.map((diag) => {
                    const hasPerm = isSuperAdmin || permissionKeys.includes(diag.canonicalCode);
                    return (
                      <div
                        key={diag.canonicalCode + diag.actionName}
                        className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-xs">
                              {diag.actionName}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              {diag.domain} ({diag.scope})
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                            <strong className="text-foreground">{diag.canonicalCode}</strong>
                            <span>—</span>
                            <span className="opacity-75">{diag.endpoint}</span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] font-bold uppercase shrink-0 flex items-center gap-1 ${
                            hasPerm
                              ? "bg-emerald-100/80 text-emerald-800 border-emerald-300"
                              : "bg-rose-100/80 text-rose-800 border-rose-300"
                          }`}
                        >
                          {hasPerm ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Present
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Missing
                            </>
                          )}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No extra action-level permissions mapped for this route pattern.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
