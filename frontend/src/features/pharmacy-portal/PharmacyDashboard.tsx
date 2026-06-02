"use client";

import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPharmacyDashboardQuery, useGetPharmacyPortalProfileQuery } from "@/redux/api/pharmacyPortalApi";

export function PharmacyDashboard() {
  const router = useRouter();
  const { data: profile } = useGetPharmacyPortalProfileQuery();
  const { data: stats, isLoading } = useGetPharmacyDashboardQuery();

  if (isLoading) return <Loading01 />;

  const widgets = [
    { label: "Pending received", value: stats?.pending ?? 0, href: "/pharmacy/prescriptions/received" },
    { label: "In dispensing queue", value: stats?.queue ?? 0, href: "/pharmacy/prescriptions/queue" },
    { label: "Completed today", value: stats?.completedToday ?? 0, href: "/pharmacy/prescriptions/completed" },
    { label: "Unavailable items", value: stats?.unavailable ?? 0, href: "/pharmacy/prescriptions/queue" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {profile?.pharmacy?.pharmacy_name || "Pharmacy Portal"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Process hospital prescriptions securely. Original prescriptions remain immutable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.map((w) => (
          <Card key={w.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {w.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <p className="text-3xl font-bold">{w.value}</p>
              <Button variant="outline" size="sm" onClick={() => router.push(w.href)}>
                View
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
