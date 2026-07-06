"use client";

import Link from "next/link";
import {
  Activity,
  Calendar,
  FlaskConical,
  Heart,
  Pill,
  Stethoscope,
  Video,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPatientPortalDashboardQuery } from "@/redux/api/patientPortalApi";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { StatCard } from "../components/StatCard";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import {
  MOCK_HEALTH_SUMMARY,
  MOCK_HEALTH_INSIGHTS,
  MOCK_LAB_RESULTS,
  MOCK_VITALS_CHART,
  formatDate,
} from "../data/mockPatientPortalData";
import {
  formatScheduleTime,
  initialsFromName,
} from "../patientPortalUtils";

const QUICK_ACTIONS = [
  { label: "Book Appointment", href: "/patient/appointments", icon: Calendar },
  { label: "Lab Results", href: "/patient/lab-results", icon: FlaskConical },
  { label: "Telemedicine", href: "/patient/telemedicine", icon: Video },
  { label: "AI Health", href: "/patient/ai-health", icon: Activity },
];

export function DashboardPage() {
  const { data: session } = useSession();
  const { data: dashboard, isLoading } = useGetPatientPortalDashboardQuery();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (isLoading) return <Loading01 />;

  const nextAppointment = dashboard?.next_appointment;
  const upcomingAppointments = dashboard?.upcoming_appointments ?? [];
  const recentPrescriptions = dashboard?.recent_prescriptions ?? [];

  return (
    <PatientPortalShell
      title={`Welcome back, ${firstName}`}
      description="Your health at a glance — appointments, results, medications, and care insights in one place."
    >
      <DemoBanner />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Next Appointment"
          value={
            nextAppointment?.schedule_date
              ? formatDate(nextAppointment.schedule_date)
              : "—"
          }
          subtext={
            nextAppointment
              ? formatScheduleTime(nextAppointment.start_time)
              : "No upcoming visits"
          }
          icon={Calendar}
        />
        <StatCard
          label="Active Medications"
          value={String(dashboard?.active_prescriptions_count ?? 0)}
          subtext={`${dashboard?.upcoming_count ?? 0} upcoming visits`}
          icon={Pill}
        />
        <StatCard
          label="Lab Results"
          value={String(MOCK_LAB_RESULTS.filter((l) => l.status === "ready").length)}
          subtext="Demo — not yet integrated"
          icon={FlaskConical}
          trend="up"
        />
        <StatCard
          label="Notifications"
          value={String(dashboard?.unread_notifications_count ?? 0)}
          subtext="Unread alerts"
          icon={Heart}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Blood Pressure — 7 days</CardTitle>
            <span className="text-xs text-muted-foreground">
              Last updated {MOCK_HEALTH_SUMMARY.lastUpdated}
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_VITALS_CHART}>
                  <defs>
                    <linearGradient id="sysGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[70, 140]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="systolic"
                    stroke="hsl(var(--primary))"
                    fill="url(#sysGrad)"
                    name="Systolic"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "BP", value: MOCK_HEALTH_SUMMARY.bloodPressure },
                { label: "Heart Rate", value: MOCK_HEALTH_SUMMARY.heartRate },
                { label: "Weight", value: MOCK_HEALTH_SUMMARY.weight },
                { label: "BMI", value: MOCK_HEALTH_SUMMARY.bmi },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg border border-border/50 bg-background/60 p-3 text-center"
                >
                  <p className="text-[10px] uppercase text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold text-primary">{m.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                className="h-11 justify-start gap-3 border-border/60"
                asChild
              >
                <Link href={action.href}>
                  <action.icon className="h-4 w-4 text-primary" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Appointments
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/patient/appointments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
            ) : (
              upcomingAppointments.map((apt) => (
                <div
                  key={apt.schedule_id}
                  className="flex gap-3 rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/30"
                >
                  <DoctorAvatar
                    doctor={{
                      name: apt.doctor?.name ?? "Provider",
                      avatarInitials: initialsFromName(apt.doctor?.name ?? "?"),
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">{apt.doctor?.name ?? "Provider"}</p>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {apt.appointment_type || "Outpatient visit"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-primary">
                      {formatDate(apt.schedule_date)} · {formatScheduleTime(apt.start_time)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              Recent Lab Results
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/patient/lab-results">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_LAB_RESULTS.slice(0, 3).map((lab) => (
              <div
                key={lab.id}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{lab.name}</p>
                  <p className="text-xs text-muted-foreground">{lab.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  {lab.abnormal ? (
                    <span className="text-xs font-medium text-amber-600">Abnormal</span>
                  ) : null}
                  <StatusBadge status={lab.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/80 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              Recent Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPrescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
            ) : (
              recentPrescriptions.map((rx) => (
                <div key={rx.prescription_id} className="rounded-lg border border-border/50 p-3">
                  <p className="font-medium text-sm">
                    {rx.template_name || rx.category || "Prescription"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rx.prescriber?.name ? `By ${rx.prescriber.name}` : "—"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-primary">{formatDate(rx.created_at)}</p>
                    <StatusBadge status={rx.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Recent Doctors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent providers.</p>
            ) : (
              upcomingAppointments.map((apt) => (
                <div key={apt.schedule_id} className="flex items-center gap-3">
                  <DoctorAvatar
                    doctor={{
                      name: apt.doctor?.name ?? "Provider",
                      avatarInitials: initialsFromName(apt.doctor?.name ?? "?"),
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{apt.doctor?.name ?? "Provider"}</p>
                    <p className="text-xs text-muted-foreground">
                      {apt.appointment_type || "Outpatient visit"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Health Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_HEALTH_INSIGHTS.map((insight) => (
              <div
                key={insight.id}
                className="rounded-lg border border-border/50 bg-section-accent-subtle-10 p-3"
              >
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PatientPortalShell>
  );
}
