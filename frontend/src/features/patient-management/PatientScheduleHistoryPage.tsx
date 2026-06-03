"use client";

import { useMemo, useState } from "react";
import { FileBadge } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import DetailHeader from "@/components/common/DetailHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPatientByIdQuery } from "@/redux/api/patientApi";
import { useGetPatientSchedulesQuery } from "@/redux/api/scheduleApi";
import { useGetScheduleMedicalTimelineQuery } from "@/redux/api/medicalWorkflowApi";
import { useGetSchedulePrescriptionsForPharmacyQuery } from "@/redux/api/pharmacyApi";
import { MedicalHistoryTimeline } from "@/features/medical-workflow/MedicalHistoryTimeline";
import { filterDiagnosisReportEntries } from "@/features/medical-workflow/workflowTimelineUtils";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_STYLES,
} from "@/features/patient-scheduling/scheduleStatus";
import { ScheduleWorkflowActions } from "./ScheduleWorkflowActions";
import { MedicalCertificateGenerationDrawer } from "@/features/medical-certificate/MedicalCertificateGenerationDrawer";
import { SendToPharmacyDrawerHost } from "./SendToPharmacyDrawer";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
  scheduleId: string;
};

export function PatientScheduleHistoryPage({ patientId, scheduleId }: Props) {
  const router = useRouter();
  const [pharmacyPanelOpen, setPharmacyPanelOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);

  const { data: patient, isLoading: loadingPatient } =
    useGetPatientByIdQuery(patientId);
  const { data: schedules = [], isLoading: loadingSchedules } =
    useGetPatientSchedulesQuery(patientId);
  const {
    data: timeline = [],
    isLoading: loadingTimeline,
    isError: timelineError,
  } = useGetScheduleMedicalTimelineQuery(scheduleId);

  const schedule = schedules.find((s) => s.schedule_id === scheduleId);
  const hasAdmittedVisit = Boolean(schedule?.staffAppointment?.appointment_id);

  const { data: pharmacyScheduleData, isLoading: loadingPharmacyRx } =
    useGetSchedulePrescriptionsForPharmacyQuery(scheduleId, {
      skip: !hasAdmittedVisit,
    });

  const diagnosisEntries = useMemo(
    () => filterDiagnosisReportEntries(timeline),
    [timeline]
  );

  const issuedPrescriptionCount =
    pharmacyScheduleData?.prescriptions?.length ?? 0;
  const hasForwardedPrescriptions = Boolean(
    pharmacyScheduleData?.has_any_forwarded ||
      pharmacyScheduleData?.prescriptions?.some((rx) => rx.pharmacy_forward)
  );
  const showSendToPharmacy =
    hasAdmittedVisit && issuedPrescriptionCount > 0 && !loadingPharmacyRx;

  const isLoading = loadingPatient || loadingSchedules || loadingTimeline;
  const statusStyles = schedule
    ? SCHEDULE_STATUS_STYLES[schedule.status]
    : null;

  if (isLoading) return <Loading01 />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DetailHeader
          breadcrumbs={[
            { title: "Patients", link: "/patients/list" },
            {
              title: patient?.full_name || "Patient",
              link: `/patients/list/${patientId}`,
            },
            { title: "Schedule history" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ScheduleWorkflowActions
            disabled={!hasAdmittedVisit}
            showSendToPharmacy={showSendToPharmacy}
            hasForwardedPrescriptions={hasForwardedPrescriptions}
            onBack={() => router.push(`/patients/list/${patientId}`)}
            onSendToPharmacy={() => setPharmacyPanelOpen(true)}
          />
          <PermissionGuard
            requireAny={["MEDICAL_CERTIFICATE:CREATE"]}
            fallback={null}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hasAdmittedVisit}
              onClick={() => setCertificateOpen(true)}
            >
              <FileBadge className="mr-1.5 h-4 w-4" />
              Medical certificate
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div
        className={cn(
          "relative flex flex-col gap-4 lg:block",
          pharmacyPanelOpen && "lg:min-h-[50dvh]"
        )}
      >
        <div
          className={cn(
            "space-y-6 transition-all duration-500 ease-in-out",
            pharmacyPanelOpen && "lg:pr-[376px]"
          )}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Visit schedule</CardTitle>
                  {schedule ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {schedule.schedule_date} · {schedule.start_time?.slice(0, 5)}–
                      {schedule.end_time?.slice(0, 5)}
                      {schedule.staff?.full_name
                        ? ` · ${schedule.staff.full_name}`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Schedule details unavailable
                    </p>
                  )}
                </div>
                {schedule && statusStyles && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      statusStyles.bg,
                      statusStyles.text,
                      statusStyles.border
                    )}
                  >
                    {SCHEDULE_STATUS_LABELS[schedule.status]}
                  </Badge>
                )}
              </div>
            </CardHeader>
            {schedule?.notes && (
              <CardContent className="border-t pt-4 text-sm text-muted-foreground">
                {schedule.notes}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Medical history timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Diagnosis reports and prescriptions for this scheduled visit
              </p>
            </CardHeader>
            <CardContent>
              {timelineError ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Unable to load medical history for this schedule.
                </p>
              ) : !hasAdmittedVisit ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No admitted visit yet for this schedule. Medical history will
                  appear after the patient is admitted and workflow entries are
                  recorded.
                </p>
              ) : diagnosisEntries.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No diagnosis reports recorded for this visit yet.
                </p>
              ) : (
                <MedicalHistoryTimeline entries={diagnosisEntries} collapsible />
              )}
            </CardContent>
          </Card>
        </div>

        <SendToPharmacyDrawerHost
          open={pharmacyPanelOpen}
          scheduleId={scheduleId}
          patientName={patient?.full_name}
          onClose={() => setPharmacyPanelOpen(false)}
        />

        <MedicalCertificateGenerationDrawer
          open={certificateOpen}
          onOpenChange={setCertificateOpen}
          patientId={patientId}
          scheduleId={scheduleId}
          appointmentId={schedule?.staffAppointment?.appointment_id}
          disabled={!hasAdmittedVisit}
        />
      </div>
    </div>
  );
}
