"use client";

import React, { useState, useEffect } from "react";
import IssuesDashboard from "@/features/issue-management/IssuesDashboard";
import { FederalRegionalIssuesTab } from "@/features/issue-management/components/FederalRegionalIssuesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Layers } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function IssuesPage() {
  const { hasRole, hasAnyPermission } = useAuth();
  const isSuperAdmin = hasRole("Super Admin");

  const canAccessFederalIssues =
    isSuperAdmin ||
    hasAnyPermission("ISSUES:READ", "ISSUES:READ_ALL");

  const canAccessRegionalIssues =
    isSuperAdmin ||
    hasAnyPermission(
      "FEDERAL_REGIONAL_ESCALATIONS:READ",
      "FEDERAL_REGIONAL_ESCALATIONS:READ_ALL"
    );

  const [activeTab, setActiveTab] = useState<"federal" | "regional">("federal");

  useEffect(() => {
    if (!canAccessFederalIssues && canAccessRegionalIssues) {
      setActiveTab("regional");
    }
  }, [canAccessFederalIssues, canAccessRegionalIssues]);

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "federal" | "regional")}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Issue Management & Oversight
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor, track, and resolve Federal Ministry issues and escalated Regional reports.
            </p>
          </div>

          <TabsList className="bg-muted/80 p-1">
            {canAccessFederalIssues && (
              <TabsTrigger value="federal" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                <Layers className="h-4 w-4" />
                Federal Issues
              </TabsTrigger>
            )}
            {canAccessRegionalIssues && (
              <TabsTrigger value="regional" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                <Building2 className="h-4 w-4 text-amber-600" />
                Regional Issues
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {canAccessFederalIssues && (
          <TabsContent value="federal" className="m-0 focus-visible:outline-none">
            <IssuesDashboard />
          </TabsContent>
        )}

        {canAccessRegionalIssues && (
          <TabsContent value="regional" className="m-0 focus-visible:outline-none">
            <FederalRegionalIssuesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
