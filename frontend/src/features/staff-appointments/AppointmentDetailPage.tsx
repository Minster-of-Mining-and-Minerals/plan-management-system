"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileBadge,
  Inbox,
  User2,
} from "lucide-react";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import DetailHeader from "@/components/common/DetailHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetAppointmentByIdQuery } from "@/redux/api/appointmentApi";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANT,
} from "./appointmentStatusStyles";
import { AppointmentWorkflowPanel } from "@/features/medical-workflow/AppointmentWorkflowPanel";
import { MedicalCertificateGenerationDrawer } from "@/features/medical-certificate/MedicalCertificateGenerationDrawer";

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
  const [userInfoOpen, setUserInfoOpen] = useState(true);
  const [certificateOpen, setCertificateOpen] = useState(false);

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
  const isForwarded = appointment.workflow_access?.is_forwarded_to_me;

  return (
    <div className="space-y-6">
      <DetailHeader
        breadcrumbs={[
          { title: "Appointments", link: "/appointments" },
          { title: patient?.full_name || "Appointment" },
        ]}
      />

      {isForwarded && (
        <div className="flex flex-wrap items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Forwarded to you</p>
            <p className="mt-0.5 text-muted-foreground">
              This visit is assigned to{" "}
              <span className="font-medium text-foreground">
                {appointment.staff?.full_name || "another clinician"}
              </span>
              . You have full access to the patient workflow, history, and
              reports for this appointment.
            </p>
          </div>
        </div>
      )}

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
        <div className="flex flex-wrap items-center gap-2">
          {isForwarded && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              Forwarded
            </Badge>
          )}
          <PermissionGuard
            requireAny={["MEDICAL_CERTIFICATE:CREATE"]}
            fallback={null}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!schedule?.schedule_id || !patient?.user_id}
              onClick={() => setCertificateOpen(true)}
            >
              <FileBadge className="mr-1.5 h-4 w-4" />
              Certificate
            </Button>
          </PermissionGuard>
          <Badge variant={APPOINTMENT_STATUS_VARIANT[appointment.status]}>
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <Collapsible open={userInfoOpen} onOpenChange={setUserInfoOpen}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User2 className="h-4 w-4" />
                  User information
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    {userInfoOpen ? (
                      <>
                        Hide details
                        <ChevronUp className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show details
                        <ChevronDown className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                <div>
                  <p className="mb-3 text-sm font-semibold">Patient</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoField label="Full name">{patient?.full_name || "—"}</InfoField>
                    <InfoField label="Email">{patient?.email || "—"}</InfoField>
                    <InfoField label="Phone">{patient?.phone_number || "—"}</InfoField>
                    <InfoField label="Patient status">
                      {patient?.patientProfile?.patient_status || "—"}
                    </InfoField>
                  </div>
                </div>

                <div className="border-t pt-5">
                  <p className="mb-3 text-sm font-semibold">Appointment</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  </div>
                </div>

                <div className="border-t pt-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                        <Badge variant="outline" className="capitalize">
                          {schedule.status}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </InfoField>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
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

      <AppointmentWorkflowPanel appointmentId={appointmentId} />

      {schedule?.schedule_id && patient?.user_id && (
        <MedicalCertificateGenerationDrawer
          open={certificateOpen}
          onOpenChange={setCertificateOpen}
          patientId={patient.user_id}
          scheduleId={schedule.schedule_id}
          appointmentId={appointmentId}
        />
      )}
    </div>
  );
}
