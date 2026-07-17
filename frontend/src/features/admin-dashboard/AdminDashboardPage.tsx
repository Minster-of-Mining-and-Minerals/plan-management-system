"use client";

import { Link } from "@/i18n/navigation";
import {
  Building2,
  Calendar,
  CreditCard,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/features/patient-portal/components/StatCard";
import { useGetDashboardStatsQuery } from "@/redux/api/dashboardApi";
import { formatETB } from "./data/mockHospitalOperationsData";

function formatValue(value: number | undefined | null, loading: boolean) {
  if (loading) return "…";
  if (value == null || Number.isNaN(Number(value))) return "No data";
  return Number(value).toLocaleString();
}

export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } =
    useGetDashboardStatsQuery();
  const summary = data?.data?.summary;
  const generatedAt = data?.data?.generated_at;

  return (
    <main className="flex-1 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-section-accent-subtle-20 via-card/95 to-background p-6 shadow-lg sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Operations dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              NOVACURE live statistics
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              KPIs below come only from{" "}
              <code className="text-foreground">GET /api/dashboard/stats</code>.
              Missing values show as &quot;No data&quot; — never demo figures.
            </p>
            {generatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last refreshed: {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-section-accent-subtle-20 text-primary">
              Live API
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/patients/list">Patient Registry</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/finance/collections">Collections</Link>
            </Button>
          </div>
        </div>
      </div>

      {isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Could not load dashboard statistics. Check that you have{" "}
            <code>dashboard:view</code> and the API is reachable.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={formatValue(summary?.total_patients, isLoading)}
          subtext="Active patient accounts"
          icon={Users}
        />
        <StatCard
          label="Today Visits"
          value={formatValue(summary?.appointments_today, isLoading)}
          subtext="Admitted today"
          icon={Calendar}
        />
        <StatCard
          label="Active Staff"
          value={formatValue(summary?.active_staff, isLoading)}
          subtext="Internal users"
          icon={UserRound}
        />
        <StatCard
          label="Active Departments"
          value={formatValue(summary?.active_departments, isLoading)}
          subtext="Operational units"
          icon={Building2}
        />
        <StatCard
          label="Payments Today"
          value={formatValue(summary?.payments_today_count, isLoading)}
          subtext="Completed cashier payments"
          icon={CreditCard}
        />
        <StatCard
          label="Collected Today"
          value={
            isLoading
              ? "…"
              : summary?.payments_today_amount == null
                ? "No data"
                : formatETB(summary.payments_today_amount)
          }
          subtext="Cashier collections (ETB)"
          icon={Wallet}
        />
        <StatCard
          label="Open Cashier Sessions"
          value={formatValue(summary?.open_cashier_sessions, isLoading)}
          subtext="Active desks"
          icon={CreditCard}
        />
        <StatCard
          label="Active Users"
          value={formatValue(summary?.total_users, isLoading)}
          subtext="All account types"
          icon={Users}
        />
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Scope note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Lab, pharmacy inventory, emergency/IPD, and trend charts are not
            shown here until those modules expose analytics APIs. Use module
            pages for operational work.
          </p>
          <p>
            Finance detail:{" "}
            <Link href="/finance/collections" className="text-primary underline">
              Daily collections
            </Link>
            . Audit trail:{" "}
            <Link href="/admin/audit-logs" className="text-primary underline">
              Audit explorer
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
