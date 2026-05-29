"use client";

import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { CalendarClock, ChevronRight, User2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetPatientSchedulesQuery,
  type PatientSchedule,
} from "@/redux/api/scheduleApi";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_STYLES,
} from "@/features/patient-scheduling/scheduleStatus";

type Props = {
  patientId: string;
};

function ScheduleCard({
  schedule,
  onOpen,
}: {
  schedule: PatientSchedule;
  onOpen: () => void;
}) {
  const styles = SCHEDULE_STATUS_STYLES[schedule.status];
  const hasVisit = Boolean(schedule.staffAppointment?.appointment_id);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl border p-4 text-left shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            {schedule.schedule_date}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {schedule.start_time?.slice(0, 5)} – {schedule.end_time?.slice(0, 5)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 capitalize", styles.bg, styles.text, styles.border)}
        >
          {SCHEDULE_STATUS_LABELS[schedule.status]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {schedule.staff?.full_name && (
          <span className="inline-flex items-center gap-1">
            <User2 className="h-3.5 w-3.5" />
            {schedule.staff.full_name}
          </span>
        )}
        {schedule.appointment_type && (
          <span>{schedule.appointment_type}</span>
        )}
        {hasVisit && (
          <span className="text-primary">Medical history available</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs font-medium text-primary">
        <span>View medical history</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

export function PatientScheduleListCards({ patientId }: Props) {
  const router = useRouter();
  const { data: schedules = [], isLoading, isError } =
    useGetPatientSchedulesQuery(patientId);

  const sorted = useMemo(
    () =>
      [...schedules].sort((a, b) => {
        const aKey = `${a.schedule_date}T${a.start_time}`;
        const bKey = `${b.schedule_date}T${b.start_time}`;
        return bKey.localeCompare(aKey);
      }),
    [schedules]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedules & visits</CardTitle>
        <p className="text-xs text-muted-foreground">
          Select a schedule to view its medical history timeline
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loading01 />
        ) : isError ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Unable to load schedules.
          </p>
        ) : sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No schedules recorded for this patient.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((schedule) => (
              <ScheduleCard
                key={schedule.schedule_id}
                schedule={schedule}
                onOpen={() =>
                  router.push(
                    `/patients/list/${patientId}/schedules/${schedule.schedule_id}`
                  )
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
