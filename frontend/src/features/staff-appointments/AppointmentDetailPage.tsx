"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, Calendar, Clock, User2 } from "lucide-react";
import DetailHeader from "@/components/common/DetailHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetAppointmentByIdQuery } from "@/redux/api/appointmentApi";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANT,
} from "./appointmentStatusStyles";

function InfoField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const { data: appointment, isLoading, isError } =
    useGetAppointmentByIdQuery(appointmentId);

  if (isLoading) return <Loading01 />;

  if (isError || !appointment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/appointments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to appointments
        </Button>
        <p className="text-muted-foreground">Appointment not found.</p>
      </div>
    );
  }

  const patient = appointment.patient;
  const schedule = appointment.schedule;

  return (
    <div className="space-y-6">
      <DetailHeader
        breadcrumbs={[
          { title: "Appointments", link: "/appointments" },
          { title: patient?.full_name || "Appointment" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{patient?.full_name}</h2>
          <p className="text-sm text-muted-foreground">
            Patient ID:{" "}
            <span className="font-mono">
              {patient?.patientProfile?.patient_code || "—"}
            </span>
          </p>
        </div>
        <Badge variant={APPOINTMENT_STATUS_VARIANT[appointment.status]}>
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User2 className="h-4 w-4" />
              Patient information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Full name">{patient?.full_name || "—"}</InfoField>
            <InfoField label="Email">{patient?.email || "—"}</InfoField>
            <InfoField label="Phone">{patient?.phone_number || "—"}</InfoField>
            <InfoField label="Patient status">
              {patient?.patientProfile?.patient_status || "—"}
            </InfoField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Appointment information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Admitted at">
              {formatDateTime(appointment.admitted_at)}
            </InfoField>
            <InfoField label="Admitted by">
              {appointment.admittedByUser?.full_name || "—"}
            </InfoField>
            <InfoField label="Assigned staff">
              {appointment.staff?.full_name || "—"}
            </InfoField>
            <InfoField label="Created">
              {formatDateTime(appointment.created_at)}
            </InfoField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Schedule date">
              {schedule?.schedule_date || "—"}
            </InfoField>
            <InfoField label="Time slot">
              {schedule
                ? `${schedule.start_time} – ${schedule.end_time}`
                : "—"}
            </InfoField>
            <InfoField label="Schedule status">
              {schedule?.status ? (
                <Badge variant="outline">{schedule.status}</Badge>
              ) : (
                "—"
              )}
            </InfoField>
            <InfoField label="Appointment type">
              {schedule?.appointment_type || "—"}
            </InfoField>
          </CardContent>
        </Card>

        {(appointment.notes || schedule?.notes) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {appointment.notes && (
                <p>
                  <span className="font-medium text-foreground">
                    Appointment:{" "}
                  </span>
                  {appointment.notes}
                </p>
              )}
              {schedule?.notes && (
                <p>
                  <span className="font-medium text-foreground">Schedule: </span>
                  {schedule.notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Button variant="outline" onClick={() => router.push("/appointments")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to appointments
      </Button>
    </div>
  );
}
