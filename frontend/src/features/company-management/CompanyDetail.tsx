"use strict";
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Users,
  Palette,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  KeyRound,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useGetCompanyByIdQuery } from "@/redux/api/companyApi";
import { getFileUrl } from "@/utils/fileUrl";
import { cn } from "@/lib/utils";
import type { ActionButton } from "@/types/tableLayout";
import { CompanyDepartmentManagement } from "./CompanyDepartmentManagement";
import { CompanyUserManagement } from "./CompanyUserManagement";
import { CompanySettingsAndBranding } from "./CompanySettingsAndBranding";
import CompanyRoleList from "@/features/template/component/roleList/CompanyRoleList";
import PermissionList from "@/features/template/component/permissionList/permissionList";
import Loading01 from "@/features/template/component/Loading/Loading01";

type TabType = "departments" | "users" | "roles" | "permissions" | "branding";

export function CompanyDetail({ companyId }: { companyId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabType | null;

  const [activeTab, setActiveTabState] = useState<TabType>(
    tabParam && ["departments", "users", "roles", "permissions", "branding"].includes(tabParam)
      ? tabParam
      : "departments"
  );

  const {
    data: company,
    isLoading,
    isError,
  } = useGetCompanyByIdQuery(companyId);

  const setTab = (tab: TabType) => {
    setActiveTabState(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", tab);
    router.push(`/admin/companies/${companyId}?${p.toString()}`);
  };

  const sideActionTabs: ActionButton[] = [
    {
      label: "Departments",
      icon: <Building2 className="h-4 w-4" />,
      variant: activeTab === "departments" ? "default" : "outline",
      onClick: () => setTab("departments"),
    },
    {
      label: "Users",
      icon: <Users className="h-4 w-4" />,
      variant: activeTab === "users" ? "default" : "outline",
      onClick: () => setTab("users"),
    },
    {
      label: "Roles",
      icon: <KeyRound className="h-4 w-4" />,
      variant: activeTab === "roles" ? "default" : "outline",
      onClick: () => setTab("roles"),
    },
    {
      label: "Permissions",
      icon: <Shield className="h-4 w-4" />,
      variant: activeTab === "permissions" ? "default" : "outline",
      onClick: () => setTab("permissions"),
    },
    {
      label: "UI & Configuration",
      icon: <Palette className="h-4 w-4" />,
      variant: activeTab === "branding" ? "default" : "outline",
      onClick: () => setTab("branding"),
    },
  ];

  if (isLoading) {
    return <Loading01 />;
  }

  if (isError || !company) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Building2 className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-bold">Company Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The requested company record could not be found or has been deactivated.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/admin/companies">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Companies List
          </Link>
        </Button>
      </div>
    );
  }

  const logoUrl = company.logo_path ? getFileUrl(company.logo_path) : null;

  return (
    <div className="space-y-6">
      {/* ===================== HEADER ===================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-4">
          {logoUrl ? (
            <div className="relative h-16 w-16 rounded-full border-2 border-primary/20 bg-muted/40 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <Image
                src={logoUrl}
                alt={company.name}
                width={60}
                height={60}
                className="max-h-14 w-auto object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}

          <div className="space-y-1">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Link
                href="/admin/companies"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Companies
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-foreground font-medium">{company.name}</span>
            </nav>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{company.name}</h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                {company.code}
              </span>
              <ActiveStatusBadge isActive={company.is_active} />
            </div>

            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Independent Company Domain • Mining & Mineral Operations
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
              {company.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {company.email}
                </span>
              )}
              {company.phone_number && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {company.phone_number}
                </span>
              )}
              {company.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.address}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Registered {new Date(company.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href="/admin/companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              All Companies
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={`/companies/${company.company_id}`} target="_blank">
              <ExternalLink className="w-4 h-4" />
              Open Workspace
            </Link>
          </Button>
        </div>
      </div>

      {/* ===================== TABULAR TABS (MATCHING STRUCTURE & REGIONAL TABULAR TABS) ===================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {sideActionTabs.map((tab) => {
          const tabId =
            tab.label === "Departments"
              ? "departments"
              : tab.label === "Users"
              ? "users"
              : tab.label === "Roles"
              ? "roles"
              : tab.label === "Permissions"
              ? "permissions"
              : "branding";
          const isActive = activeTab === tabId;

          return (
            <Button
              key={tab.label}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={tab.onClick}
              className={cn(
                "flex items-center gap-2 font-medium transition-all shadow-xs",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Button>
          );
        })}
      </div>

      {/* ===================== TAB CONTENT ===================== */}
      <div className="pt-2">
        {activeTab === "departments" && (
          <CompanyDepartmentManagement
            companyId={company.company_id}
            companyName={company.name}
          />
        )}
        {activeTab === "users" && (
          <CompanyUserManagement
            companyId={company.company_id}
            companyName={company.name}
          />
        )}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <CompanyRoleList
              sideActions={sideActionTabs}
              companyId={company.company_id}
              basePath={`/companies/${company.company_id}/users/roles`}
            />
          </div>
        )}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            <PermissionList isCompanyOnly />
          </div>
        )}
        {activeTab === "branding" && (
          <CompanySettingsAndBranding
            companyId={company.company_id}
            companyName={company.name}
          />
        )}
      </div>
    </div>
  );
}
