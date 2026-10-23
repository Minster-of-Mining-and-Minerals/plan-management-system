"use client";

import { useSearchParams, useRouter } from "next/navigation";
import RoleList from "@/features/template/component/roleList/roleList";
import RegionalRoleList from "@/features/template/component/roleList/RegionalRoleList";
import CompanyRoleList from "@/features/template/component/roleList/CompanyRoleList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, MapPin, Building2 } from "lucide-react";

export default function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const currentTab =
    tabParam === "company"
      ? "company"
      : tabParam === "regional"
      ? "regional"
      : "system";

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "regional" || val === "company") {
      params.set("tab", val);
    } else {
      params.delete("tab");
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/users/roles${query}`);
  };

  return (
    <div className="space-y-4">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b bg-card/60 backdrop-blur-sm px-6 py-2.5 rounded-xl border flex items-center justify-between">
          <TabsList className="grid grid-cols-3 h-10 w-full sm:w-[580px] bg-muted/60 p-1">
            <TabsTrigger
              value="system"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <Shield className="h-4 w-4" />
              <span>System & Sector Roles</span>
            </TabsTrigger>
            <TabsTrigger
              value="regional"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <MapPin className="h-4 w-4 text-indigo-500" />
              <span>Regional Roles</span>
            </TabsTrigger>
            <TabsTrigger
              value="company"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <Building2 className="h-4 w-4 text-emerald-500" />
              <span>Company Roles</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="system" className="mt-4 focus-visible:outline-none">
          <RoleList />
        </TabsContent>

        <TabsContent value="regional" className="mt-4 focus-visible:outline-none">
          <RegionalRoleList />
        </TabsContent>

        <TabsContent value="company" className="mt-4 focus-visible:outline-none">
          <CompanyRoleList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
