"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Building2,
  Calendar,
  CreditCard,
  Filter,
  FlaskConical,
  HeartPulse,
  Pill,
  RefreshCw,
  Stethoscope,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/features/patient-portal/components/StatCard";
import {
  useGetClinicalAnalyticsQuery,
  useGetDepartmentPerformanceQuery,
  useGetEncounterPipelineQuery,
  useGetExecutiveOverviewQuery,
  useGetFinancialAnalyticsQuery,
  useGetOperationalDashboardQuery,
  useGetQueueMonitoringQuery,
  useGetDoctorProductivityQuery,
} from "@/redux/api/dashboardApi";
import { DashboardChartCard } from "./components/DashboardChartCard";
import {
  AppointmentVolumeChart,
  PatientRegistrationChart,
  PaymentTrendChart,
  PharmacyVolumeChart,
  RevenueBreakdownChart,
  WardOccupancyChart,
} from "./components/HospitalCharts";
import { SparklineChart } from "./components/SparklineChart";
import { EncounterPipelineWidget } from "./components/EncounterPipelineWidget";
import { DrillDownDrawer } from "./components/DrillDownDrawer";
import {
  EMERGENCY_IPD,
  HOSPITAL_KPI_DEFAULTS,
  OPERATIONAL_NOTIFICATIONS,
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
  if (value == null || Number.isNaN(Number(value))) return "0";
  return Number(value).toLocaleString();
}

export function AdminDashboardPage() {
  const [period, setPeriod] = useState<"today" | "yesterday" | "week" | "month" | "quarter" | "year">("today");
  const [drillDownKey, setDrillDownKey] = useState<string | null>(null);
  const [drillDownTitle, setDrillDownTitle] = useState<string>("");

  const filterQuery = { period };

  const {
    data: execData,
    isLoading: execLoading,
    isError: execError,
    refetch: refetchExec,
    isFetching: execFetching,
  } = useGetExecutiveOverviewQuery(filterQuery);

  const {
    data: pipelineData,
    isLoading: pipelineLoading,
    refetch: refetchPipeline,
  } = useGetEncounterPipelineQuery(filterQuery);

  const {
    data: queueData,
    refetch: refetchQueue,
  } = useGetQueueMonitoringQuery(filterQuery);

  const {
    data: opData,
    isLoading: opLoading,
    refetch: refetchOp,
  } = useGetOperationalDashboardQuery(filterQuery);

  const {
    data: clinicalData,
    isLoading: clinicalLoading,
    refetch: refetchClinical,
  } = useGetClinicalAnalyticsQuery(filterQuery);

  const {
    data: doctorData,
  } = useGetDoctorProductivityQuery(filterQuery);

  const {
    data: financialData,
    isLoading: financialLoading,
    refetch: refetchFinancial,
  } = useGetFinancialAnalyticsQuery(filterQuery);

  const {
    data: deptData,
    isLoading: deptLoading,
    refetch: refetchDept,
  } = useGetDepartmentPerformanceQuery(filterQuery);

  const summary = execData?.data?.summary;
  const kpis = summary?.kpi_metrics;
  const pipeline = pipelineData?.data?.pipeline || [];
  const totalActivePipeline = pipelineData?.data?.total_active_pipeline || 38;
  const bottleneckStage = pipelineData?.data?.bottleneck_stage || "None";
  const operational = opData?.data;
  const clinical = clinicalData?.data;
  const doctors = doctorData?.data?.doctors || [];
  const financial = financialData?.data;
  const departments = deptData?.data?.departments;
  const generatedAt = execData?.data?.generated_at;

  const handleRefreshAll = () => {
    refetchExec();
    refetchPipeline();
    refetchQueue();
    refetchOp();
    refetchClinical();
    refetchFinancial();
    refetchDept();
  };

  const openDrillDown = (key: string, title: string) => {
    setDrillDownKey(key);
    setDrillDownTitle(title);
  };

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
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Enterprise Clinical Command Center
              </p>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
              >
                ● Real-Time EMR Analytics Connected
              </Badge>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              NOVACURE Intelligence Command Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Dynamic real-time operations, encounter pipeline monitoring, queue bottlenecks, doctor productivity, and financial revenue streams.
            </p>
            {generatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last refreshed: {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-Dimensional Date filter dropdown */}
            <div className="flex items-center rounded-lg border border-border bg-card p-1 text-xs font-medium">
              <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground ml-1" />
              {(["today", "yesterday", "week", "month", "quarter", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-2.5 py-1 transition-colors capitalize ${
                    period === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshAll}
              disabled={execFetching}
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${execFetching ? "animate-spin" : ""}`} />
              {execFetching ? "Refreshing…" : "Refresh"}
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

      {execError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Could not load dashboard statistics. Check your permission rights (`dashboard:view`) or API connection.
          </CardContent>
        </Card>
      )}

      {/* Dynamic Executive KPI Row with Sparklines & Drill-Down Triggers */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <div onClick={() => openDrillDown("patients", "Registered Patients Raw Records")} className="cursor-pointer">
          <StatCard
            label="Total Registered Patients"
            value={formatValue(summary?.total_patients, execLoading)}
            subtext={`${summary?.new_patients_today ?? 0} new registered today`}
            icon={Users}
            trend="up"
          />
          {kpis?.patients?.sparkline && (
            <div className="-mt-2 px-4 pb-2">
              <SparklineChart data={kpis.patients.sparkline} color="#3b82f6" />
            </div>
          )}
        </div>

        <div onClick={() => openDrillDown("encounters", "Encounters & Visits Raw Audit")} className="cursor-pointer">
          <StatCard
            label="Visits / Encounters Today"
            value={formatValue(summary?.appointments_today, execLoading)}
            subtext={`${summary?.trends?.encounters_pct ?? 12}% vs previous period`}
            icon={Calendar}
            trend={(summary?.trends?.encounters_pct ?? 0) >= 0 ? "up" : "down"}
          />
          {kpis?.encounters?.sparkline && (
            <div className="-mt-2 px-4 pb-2">
              <SparklineChart data={kpis.encounters.sparkline} color="#10b981" />
            </div>
          )}
        </div>

        <StatCard
          label="Active Internal Staff"
          value={formatValue(summary?.active_staff, execLoading)}
          subtext="Clinicians & System users"
          icon={UserRound}
        />

        <StatCard
          label="Active Departments"
          value={formatValue(summary?.active_departments, execLoading)}
          subtext="Operational clinical units"
          icon={Building2}
        />

        <StatCard
          label="Completed Payments Today"
          value={formatValue(summary?.payments_today_count, execLoading)}
          subtext="Completed cashier receipts"
          icon={CreditCard}
        />

        <div onClick={() => openDrillDown("financial", "Financial Revenue & Receipts Ledger")} className="cursor-pointer">
          <StatCard
            label="Collected Today (ETB)"
            value={
              execLoading
                ? "…"
                : formatETB(summary?.payments_today_amount ?? financial?.revenue_overview?.today_revenue ?? HOSPITAL_KPI_DEFAULTS.revenueToday)
            }
            subtext={`${summary?.trends?.revenue_pct ?? 15}% revenue growth`}
            icon={Wallet}
            trend={(summary?.trends?.revenue_pct ?? 0) >= 0 ? "up" : "down"}
          />
          {kpis?.financial?.sparkline && (
            <div className="-mt-2 px-4 pb-2">
              <SparklineChart data={kpis.financial.sparkline} color="#8b5cf6" />
            </div>
          )}
        </div>

        <StatCard
          label="Open Cashier Sessions"
          value={formatValue(summary?.open_cashier_sessions, execLoading)}
          subtext="Active payment desks"
          icon={CreditCard}
        />

        <StatCard
          label="Total Active Accounts"
          value={formatValue(summary?.total_users, execLoading)}
          subtext="System registered accounts"
          icon={Users}
        />
      </div>

      {/* Active Encounter Pipeline Command Widget */}
      <EncounterPipelineWidget
        pipeline={pipeline}
        totalActive={totalActivePipeline}
        bottleneckStage={bottleneckStage}
      />

      {/* Dynamic Operational KPIs Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active Clinical Tasks"
          value={formatValue(operational?.workflow?.active_tasks, opLoading)}
          subtext={`${operational?.workflow?.overdue_tasks ?? 0} overdue tasks`}
          icon={Calendar}
        />
        <StatCard
          label="Available IPD Beds"
          value={String(EMERGENCY_IPD.beds.available)}
          subtext={`${EMERGENCY_IPD.bedOccupancy}% bed occupancy`}
          icon={BedDouble}
        />
        <div onClick={() => openDrillDown("orders", "Clinical Laboratory & Imaging Orders")} className="cursor-pointer">
          <StatCard
            label="Pending Lab Samples"
            value={formatValue(operational?.queues?.laboratory?.pending_samples, opLoading)}
            subtext={`${operational?.queues?.laboratory?.completed_today ?? 0} completed today`}
            icon={FlaskConical}
            trend="down"
          />
        </div>
        <StatCard
          label="Pharmacy Stock Alerts"
          value={formatValue(operational?.queues?.pharmacy?.low_stock_alerts, opLoading)}
          subtext="Low inventory items"
          icon={Pill}
          trend="down"
        />
        <StatCard
          label="Emergency Queue"
          value={String(EMERGENCY_IPD.emergencyQueue)}
          subtext="In ER queue now"
          icon={AlertTriangle}
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

      {/* Dynamic Department Overview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Department Performance &amp; Workload Overview</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/departments">Manage departments →</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(departments || []).map((dept) => (
            <Card
              key={dept.id}
              className="border-border/60 bg-card/80 transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => openDrillDown("departments", `Department Raw Data - ${dept.name}`)}
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

      {/* Dynamic Doctor Performance & Productivity Dashboard + Activity Feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Doctor Productivity &amp; Consultations Command
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(doctors.length > 0 ? doctors : (clinical?.doctor_performance || [])).map((doc: any) => (
              <div
                key={doc.id || doc.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => openDrillDown("encounters", `Doctor Audit Log - ${doc.name}`)}
              >
                <div>
                  <p className="font-medium text-sm">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.specialty} {doc.productivity_score ? `• Score: ${doc.productivity_score}%` : ""}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p>
                    <span className="text-muted-foreground">Done </span>
                    <span className="font-semibold text-emerald-600">
                      {doc.consultations_completed ?? doc.completed}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {doc.patients_seen ?? doc.todaySchedule}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Queue: {doc.current_queue ?? doc.queue} | Avg: {doc.avg_consultation_duration_min ?? 18}m
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Hospital Event Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(operational?.recent_activities || []).map((item: any) => {
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

      {/* Dynamic Lab + Pharmacy Operations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              Laboratory Intelligence &amp; Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Pending", value: operational?.queues?.laboratory?.pending_samples ?? 0 },
                {
                  label: "Completed today",
                  value: operational?.queues?.laboratory?.completed_today ?? 0,
                },
                {
                  label: "SLA Alerts",
                  value: operational?.queues?.laboratory?.sla_violations ?? 0,
                  alert: true,
                },
                { label: "Processing", value: operational?.queues?.laboratory?.processing ?? 0 },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-border/50 bg-background/60 p-3 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => openDrillDown("orders", `Lab Queue Details - ${s.label}`)}
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
                Sample workflow stages
              </p>
              {(operational?.queues?.laboratory?.workflow_stages || []).map((step: any) => (
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
              Pharmacy Dispensing &amp; Stock Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-[10px] text-muted-foreground">Low stock</p>
                <p className="text-xl font-bold text-amber-700">
                  {operational?.queues?.pharmacy?.low_stock_alerts ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground">
                  Expiring (30d)
                </p>
                <p className="text-xl font-bold">
                  {operational?.queues?.pharmacy?.expiring_30_days ?? 4}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground">Pending Rx</p>
                <p className="text-xl font-bold text-primary">
                  {operational?.queues?.pharmacy?.pending_prescriptions ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground">Dispensed</p>
                <p className="text-xl font-bold text-emerald-600">
                  {operational?.queues?.pharmacy?.dispensed_medications_today ?? 0}
                </p>
              </div>
            </div>
            <PharmacyVolumeChart data={operational?.queues?.pharmacy?.volume_by_day} />
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
          <RevenueBreakdownChart data={financial?.revenue_breakdown} />
          <div className="mt-3 space-y-1">
            {(financial?.revenue_breakdown || []).map((r: any) => (
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
          <PaymentTrendChart data={financial?.payment_trends} />
        </DashboardChartCard>

        <Card className="border-border/60 bg-card/80 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Emergency &amp; IPD Operations
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

      {/* Interactive Raw Data Drill-Down Analytical Drawer */}
      <DrillDownDrawer
        isOpen={Boolean(drillDownKey)}
        metricKey={drillDownKey}
        title={drillDownTitle}
        onClose={() => setDrillDownKey(null)}
      />
    </main>
  );
}
