"use client";

import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  useGetPharmacyDashboardQuery,
  useGetPharmacyPortalProfileQuery,
} from "@/redux/api/pharmacyPortalApi";
import type {
  PharmacyDashboardUserStat,
  PharmacyPrescriptionStatus,
} from "@/redux/types/pharmacy";
import {
  PHARMACY_RX_STATUS_LABELS,
  PHARMACY_RX_STATUS_STYLES,
} from "./pharmacyStatus";
import { PORTAL_ROLE_LABELS } from "@/features/pharmacy-management/pharmacyUserUtils";
import { useMemo } from "react";

const STATUS_ORDER: PharmacyPrescriptionStatus[] = [
  "received",
  "reviewing",
  "preparing",
  "partially_dispensed",
  "dispensed",
  "unavailable",
  "rejected",
  "completed",
];

export function PharmacyDashboard() {
  const router = useRouter();
  const { data: profile } = useGetPharmacyPortalProfileQuery();
  const { data: stats, isLoading } = useGetPharmacyDashboardQuery();

  const userColumns: ColumnDef<PharmacyDashboardUserStat>[] = useMemo(
    () => [
      { accessorKey: "full_name", header: "User" },
      { accessorKey: "email", header: "Email" },
      {
        accessorKey: "portal_role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {PORTAL_ROLE_LABELS[row.original.portal_role]}
          </Badge>
        ),
      },
      {
        accessorKey: "workflow_updates",
        header: "Workflow updates",
      },
      { accessorKey: "fulfillments", header: "Fulfillments" },
      {
        accessorKey: "prescriptions_completed",
        header: "Completed",
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    []
  );

  if (isLoading) return <Loading01 />;

  const summary = stats?.summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {profile?.pharmacy?.pharmacy_name || "Pharmacy Portal"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview by prescription status and team activity
          {profile?.portal_role && (
            <>
              {" "}
              · Your role:{" "}
              <span className="font-medium capitalize">
                {PORTAL_ROLE_LABELS[profile.portal_role as "admin" | "staff"] ??
                  profile.portal_role}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Received today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.receivedToday ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.completedToday ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unavailable items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.unavailableItems ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.teamTotal ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {summary?.teamActive ?? 0} active
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Prescriptions by status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const count = stats?.byStatus?.[status] ?? 0;
            const styles = PHARMACY_RX_STATUS_STYLES[status];
            return (
              <Card key={status}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                      {PHARMACY_RX_STATUS_LABELS[status]}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", styles.bg, styles.text, styles.border)}
                    >
                      {count}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      router.push(`/pharmacy/prescriptions?status=${status}`)
                    }
                  >
                    View list
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Team statistics</h2>
        <Card>
          <CardContent className="pt-6">
            {!stats?.byUser?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pharmacy users linked yet. Ask your hospital admin to create
                portal accounts with roles.
              </p>
            ) : (
              <DataTable
                columns={userColumns}
                data={stats.byUser}
                totalPageCount={1}
                handlePagination={() => {}}
                tablePageSize={stats.byUser.length}
                currentIndex={0}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
