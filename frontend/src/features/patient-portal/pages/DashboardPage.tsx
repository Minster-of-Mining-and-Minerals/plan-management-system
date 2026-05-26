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
import { PatientPortalShell } from "../components/PatientPortalShell";
import { StatCard } from "../components/StatCard";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import {
  MOCK_HEALTH_SUMMARY,
  MOCK_HEALTH_INSIGHTS,
  MOCK_NOTIFICATIONS,
  MOCK_UPCOMING_APPOINTMENTS,
  MOCK_LAB_RESULTS,
  MOCK_PRESCRIPTIONS,
  MOCK_VITALS_CHART,
  formatDate,
} from "../data/mockPatientPortalData";

const QUICK_ACTIONS = [
  { label: "Book Appointment", href: "/patient/appointments", icon: Calendar },
  { label: "Lab Results", href: "/patient/lab-results", icon: FlaskConical },
  { label: "Telemedicine", href: "/patient/telemedicine", icon: Video },
  { label: "AI Health", href: "/patient/ai-health", icon: Activity },
];

export function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <PatientPortalShell
      title={`Welcome back, ${firstName}`}
      description="Your health at a glance — appointments, results, medications, and care insights in one place."
    >
      <DemoBanner />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Next Appointment"
          value={MOCK_UPCOMING_APPOINTMENTS[0]?.date ? formatDate(MOCK_UPCOMING_APPOINTMENTS[0].date) : "—"}
          subtext={MOCK_UPCOMING_APPOINTMENTS[0]?.time}
          icon={Calendar}
        />
        <StatCard
          label="Active Medications"
          value={String(MOCK_PRESCRIPTIONS.filter((p) => p.status === "active").length)}
          subtext="2 refills due soon"
          icon={Pill}
        />
        <StatCard
          label="Lab Results"
          value={String(MOCK_LAB_RESULTS.filter((l) => l.status === "ready").length)}
          subtext="Ready to review"
          icon={FlaskConical}
          trend="up"
        />
        <StatCard
          label="Notifications"
          value={String(unread)}
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
            {MOCK_UPCOMING_APPOINTMENTS.map((apt) => (
              <div
                key={apt.id}
                className="flex gap-3 rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/30"
              >
                <DoctorAvatar doctor={apt.doctor} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">{apt.doctor.name}</p>
                    <StatusBadge status={apt.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{apt.type}</p>
                  <p className="mt-1 text-xs font-medium text-primary">
                    {formatDate(apt.date)} · {apt.time}
                  </p>
                </div>
              </div>
            ))}
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
              Active Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_PRESCRIPTIONS.filter((p) => p.status === "active").map((rx) => (
              <div key={rx.id} className="rounded-lg border border-border/50 p-3">
                <p className="font-medium text-sm">{rx.medication}</p>
                <p className="text-xs text-muted-foreground">
                  {rx.dosage} · {rx.frequency}
                </p>
                <p className="mt-1 text-xs text-primary">
                  {rx.refillsRemaining} refills left
                </p>
              </div>
            ))}
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
            {MOCK_UPCOMING_APPOINTMENTS.map((apt) => (
              <div key={apt.doctor.id} className="flex items-center gap-3">
                <DoctorAvatar doctor={apt.doctor} />
                <div>
                  <p className="text-sm font-medium">{apt.doctor.name}</p>
                  <p className="text-xs text-muted-foreground">{apt.doctor.specialty}</p>
                </div>
              </div>
            ))}
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
