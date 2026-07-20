"use client";

import { Link } from "@/i18n/navigation";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Building2,
  Calendar,
  CreditCard,
  FlaskConical,
  HeartPulse,
  Pill,
  Stethoscope,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/features/patient-portal/components/StatCard";
import { useGetDashboardStatsQuery } from "@/redux/api/dashboardApi";
import { DashboardChartCard } from "./components/DashboardChartCard";
import {
  AppointmentVolumeChart,
  PatientRegistrationChart,
  PaymentTrendChart,
  PharmacyVolumeChart,
  RevenueBreakdownChart,
  WardOccupancyChart,
} from "./components/HospitalCharts";
import {
  DEPARTMENT_OVERVIEW,
  EMERGENCY_IPD,
  HOSPITAL_KPI_DEFAULTS,
  LAB_OPERATIONS,
  OPERATIONAL_NOTIFICATIONS,
  PHARMACY_OPERATIONS,
  RECENT_ACTIVITIES,
  REVENUE_BREAKDOWN,
  TOP_DOCTORS,
  formatETB,
} from "./data/mockHospitalOperationsData";

const ACTIVITY_ICONS: Record<string, typeof Users> = {
  patient: Users,
  lab: FlaskConical,
  prescription: Pill,
  admission: BedDouble,
  billing: CreditCard,
  consultation: Stethoscope,
  department: Building2,
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-l-destructive bg-destructive/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  info: "border-l-primary bg-primary/5",
};

function LoadBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

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
      {/* Command center header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-section-accent-subtle-20 via-card/95 to-background p-6 shadow-lg sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Hospital Command Center
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              NOVACURE Operations Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Real-time view of patients, departments, clinical workflows, and
              revenue. Live KPIs come from{" "}
              <code className="text-foreground">GET /api/dashboard/stats</code>.
              Clinical modules use operational demo metrics until backend
              analytics are connected.
            </p>
            {generatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last refreshed: {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="bg-section-accent-subtle-20 text-primary"
            >
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
            <Button size="sm" variant="outline" asChild>
              <Link href="/departments">Departments</Link>
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

      {/* Live API KPI row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={formatValue(summary?.total_patients, isLoading)}
          subtext="Active patient accounts"
          icon={Users}
          trend="up"
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
          trend="up"
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

      {/* Static operational KPIs (demo metrics) */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Today Appointments"
          value={String(HOSPITAL_KPI_DEFAULTS.todayAppointments)}
          subtext="+12% vs last week"
          icon={Calendar}
        />
        <StatCard
          label="Available Beds"
          value={String(EMERGENCY_IPD.beds.available)}
          subtext={`${EMERGENCY_IPD.bedOccupancy}% occupied`}
          icon={BedDouble}
        />
        <StatCard
          label="Pending Lab Results"
          value={String(LAB_OPERATIONS.pending)}
          subtext={`${LAB_OPERATIONS.critical} critical`}
          icon={FlaskConical}
          trend="down"
        />
        <StatCard
          label="Pharmacy Alerts"
          value={String(PHARMACY_OPERATIONS.lowStock)}
          subtext="Low stock items"
          icon={Pill}
          trend="down"
        />
        <StatCard
          label="Emergency Cases"
          value={String(EMERGENCY_IPD.emergencyQueue)}
          subtext="In ER queue now"
          icon={AlertTriangle}
        />
        <StatCard
          label="Revenue Today"
          value={formatETB(HOSPITAL_KPI_DEFAULTS.revenueToday)}
          subtext="All revenue streams"
          icon={CreditCard}
          trend="up"
        />
        <StatCard
          label="Admitted Patients"
          value={String(EMERGENCY_IPD.beds.occupied)}
          subtext="IPD census"
          icon={HeartPulse}
        />
      </div>

      {/* Patient & appointment analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardChartCard
          title="Patient Registrations"
          description="Monthly registrations — outpatient vs inpatient flow"
        >
          <PatientRegistrationChart />
        </DashboardChartCard>
        <DashboardChartCard
          title="Appointment Analytics"
          description="Weekly scheduled vs completed visits"
        >
          <AppointmentVolumeChart />
        </DashboardChartCard>
      </div>

      {/* Department overview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Department Overview</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/departments">Manage departments →</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENT_OVERVIEW.map((dept) => (
            <Card
              key={dept.id}
              className="border-border/60 bg-card/80 transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {dept.name}
                  </CardTitle>
                  <span className="text-xs font-medium text-primary">
                    {dept.load}% load
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <LoadBar value={dept.load} />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Queue</p>
                    <p className="font-semibold">{dept.queue}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Active staff</p>
                    <p className="font-semibold">{dept.activeStaff}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Consultations</p>
                    <p className="font-semibold">{dept.consultations}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pending</p>
                    <p className="font-semibold">{dept.pendingRequests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Doctors + activity feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Doctor Activity Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {TOP_DOCTORS.map((doc) => (
              <div
                key={doc.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3"
              >
                <div>
                  <p className="font-medium text-sm">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.specialty}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p>
                    <span className="text-muted-foreground">Done </span>
                    <span className="font-semibold text-emerald-600">
                      {doc.completed}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {doc.todaySchedule}
                    </span>
                  </p>
                  <p className="text-muted-foreground">Queue: {doc.queue}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Hospital Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {RECENT_ACTIVITIES.map((item) => {
                const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
                return (
                  <li
                    key={item.id}
                    className="flex gap-3 rounded-lg border border-border/40 p-3 hover:bg-muted/30"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-section-accent-subtle-20 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{item.message}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] py-0">
                          {item.module}
                        </Badge>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Lab + Pharmacy */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              Laboratory Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Pending", value: LAB_OPERATIONS.pending },
                {
                  label: "Completed today",
                  value: LAB_OPERATIONS.completedToday,
                },
                {
                  label: "Critical",
                  value: LAB_OPERATIONS.critical,
                  alert: true,
                },
                { label: "Abnormal", value: LAB_OPERATIONS.abnormal },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-border/50 bg-background/60 p-3 text-center"
                >
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p
                    className={`text-lg font-bold ${s.alert ? "text-destructive" : "text-primary"}`}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Sample workflow
              </p>
              {LAB_OPERATIONS.workflow.map((step) => (
                <div
                  key={step.stage}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{step.stage}</span>
                  <span className="font-semibold">{step.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              Pharmacy Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-[10px] text-muted-foreground">Low stock</p>
                <p className="text-xl font-bold text-amber-700">
                  {PHARMACY_OPERATIONS.lowStock}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground">
                  Expiring (30d)
                </p>
                <p className="text-xl font-bold">
                  {PHARMACY_OPERATIONS.expiring30Days}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground">Rx today</p>
                <p className="text-xl font-bold text-primary">
                  {PHARMACY_OPERATIONS.prescriptionsToday}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground">Dispensed</p>
                <p className="text-xl font-bold text-emerald-600">
                  {PHARMACY_OPERATIONS.dispensedToday}
                </p>
              </div>
            </div>
            <PharmacyVolumeChart />
          </CardContent>
        </Card>
      </div>

      {/* Finance + Emergency */}
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardChartCard
          title="Revenue by Service"
          description="Today's revenue breakdown (ETB)"
          className="lg:col-span-1"
        >
          <RevenueBreakdownChart />
          <div className="mt-3 space-y-1">
            {REVENUE_BREAKDOWN.map((r) => (
              <div key={r.source} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{r.source}</span>
                <span className="font-medium">{formatETB(r.amount)}</span>
              </div>
            ))}
          </div>
        </DashboardChartCard>

        <DashboardChartCard
          title="Payment Trends"
          description="Collected vs outstanding invoices (weekly)"
          className="lg:col-span-1"
        >
          <PaymentTrendChart />
        </DashboardChartCard>

        <Card className="border-border/60 bg-card/80 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Emergency &amp; IPD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-2xl font-bold text-destructive">
                  {EMERGENCY_IPD.emergencyQueue}
                </p>
                <p className="text-[10px] text-muted-foreground">ER queue</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3">
                <p className="text-2xl font-bold text-amber-700">
                  {EMERGENCY_IPD.criticalPatients}
                </p>
                <p className="text-[10px] text-muted-foreground">Critical</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Bed occupancy</span>
                <span className="font-semibold">
                  {EMERGENCY_IPD.bedOccupancy}%
                </span>
              </div>
              <LoadBar value={EMERGENCY_IPD.bedOccupancy} />
              <p className="mt-2 text-xs text-muted-foreground">
                {EMERGENCY_IPD.beds.occupied} / {EMERGENCY_IPD.beds.total} beds
                · ICU {EMERGENCY_IPD.icu.occupied}/{EMERGENCY_IPD.icu.total}
              </p>
            </div>
            <div className="flex justify-between text-sm border-t pt-3">
              <span>Admissions today</span>
              <span className="font-semibold text-primary">
                +{EMERGENCY_IPD.admissionsToday}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discharges today</span>
              <span className="font-semibold">
                {EMERGENCY_IPD.dischargesToday}
              </span>
            </div>
            <WardOccupancyChart />
          </CardContent>
        </Card>
      </div>

      {/* Operational notifications */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">
            Operational Notification Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {OPERATIONAL_NOTIFICATIONS.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border-l-4 p-4 ${SEVERITY_STYLES[n.severity]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {n.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.message}
                </p>
                <p className="mt-2 text-[10px] font-medium text-primary">
                  {n.module}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module alignment footer */}
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Module alignment:</strong> Live KPIs
        (patients, staff, departments, payments) come from{" "}
        <code className="text-foreground">GET /api/dashboard/stats</code>.
        Appointments, Laboratory, Pharmacy, Billing, Emergency, and IPD widgets
        reflect the NOVACURE ecosystem roadmap with operational demo metrics —
        connect to backend analytics APIs as modules go live. Finance detail:{" "}
        <Link href="/finance/collections" className="text-primary underline">
          Daily collections
        </Link>
        . Audit trail:{" "}
        <Link href="/admin/audit-logs" className="text-primary underline">
          Audit explorer
        </Link>
        .
      </div>
    </main>
  );
}
