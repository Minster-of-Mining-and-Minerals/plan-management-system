"use client";

import { useSearchParams, useRouter } from "next/navigation";
import RoleList from "@/features/template/component/roleList/roleList";
import RegionalRoleList from "@/features/template/component/roleList/RegionalRoleList";
import CompanyRoleList from "@/features/template/component/roleList/CompanyRoleList";
import PurchasingCenterRoleList from "@/features/template/component/roleList/PurchasingCenterRoleList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, MapPin, Building2, Store } from "lucide-react";

export default function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const currentTab =
    tabParam === "purchasing_center"
      ? "purchasing_center"
      : tabParam === "company"
      ? "company"
      : tabParam === "regional"
      ? "regional"
      : "system";

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "regional" || val === "company" || val === "purchasing_center") {
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
        <div>
          <TabsList>
            <TabsTrigger value="system">
              <Shield className="h-4 w-4" />
              <span>System & Sector Roles</span>
            </TabsTrigger>
            <TabsTrigger value="regional">
              <MapPin className="h-4 w-4" />
              <span>Regional Roles</span>
            </TabsTrigger>
            <TabsTrigger value="company">
              <Building2 className="h-4 w-4" />
              <span>Company Roles</span>
            </TabsTrigger>
            <TabsTrigger value="purchasing_center">
              <Store className="h-4 w-4" />
              <span>Purchasing Center Roles</span>
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

        <TabsContent value="purchasing_center" className="mt-4 focus-visible:outline-none">
          <PurchasingCenterRoleList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

