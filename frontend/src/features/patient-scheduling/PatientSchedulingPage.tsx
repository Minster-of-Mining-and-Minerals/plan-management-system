"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPatientByIdQuery } from "@/redux/api/patientApi";
import {
  useGetEligibleStaffQuery,
  useGetScheduleMatrixQuery,
  useGetScheduleConfigQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useShiftSchedulesMutation,
  useUpdateScheduleConfigMutation,
  type PatientSchedule,
  type PatientScheduleStatus,
} from "@/redux/api/scheduleApi";
import { ScheduleMatrix } from "./ScheduleMatrix";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_STYLES,
} from "./scheduleStatus";

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function PatientSchedulingPage({ patientId }: { patientId: string }) {
  const [staffId, setStaffId] = useState("");
  const [weekStart, setWeekStart] = useState(formatToday());
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailSchedule, setDetailSchedule] = useState<PatientSchedule | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [shiftMinutes, setShiftMinutes] = useState(5);
  const [shiftDays, setShiftDays] = useState(0);

  const weekEnd = addDays(weekStart, 6);

  const { data: patient, isLoading: patientLoading } = useGetPatientByIdQuery(patientId);
  const { data: staff = [], isLoading: staffLoading } = useGetEligibleStaffQuery();
  const { data: config } = useGetScheduleConfigQuery();
  const {
    data: matrix,
    isLoading: matrixLoading,
    refetch: refetchMatrix,
  } = useGetScheduleMatrixQuery(
    { staff_id: staffId, from: weekStart, to: weekEnd },
    { skip: !staffId }
  );

  const [createSchedule, { isLoading: creating }] = useCreateScheduleMutation();
  const [updateSchedule, { isLoading: updating }] = useUpdateScheduleMutation();
  const [shiftSchedules, { isLoading: shifting }] = useShiftSchedulesMutation();
  const [updateConfig, { isLoading: savingConfig }] = useUpdateScheduleConfigMutation();

  const [configDraft, setConfigDraft] = useState(config);

  useEffect(() => {
    if (config) setConfigDraft(config);
  }, [config]);

  const handleBook = async (date: string, time: string) => {
    if (!staffId) return;
    try {
      await createSchedule({
        patient_id: patientId,
        assigned_staff_id: staffId,
        schedule_date: date,
        start_time: time,
        status: "scheduled",
      }).unwrap();
      toast.success("Patient scheduled");
      refetchMatrix();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to schedule";
      toast.error(message);
    }
  };

  const handleStatusChange = async (status: PatientScheduleStatus) => {
    if (!detailSchedule) return;
    try {
      await updateSchedule({
        id: detailSchedule.schedule_id,
        body: { status },
      }).unwrap();
      toast.success("Appointment updated");
      setDetailSchedule(null);
      refetchMatrix();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Update failed";
      toast.error(message);
    }
  };

  const handleShift = async () => {
    if (!staffId) return;
    try {
      const result = await shiftSchedules({
        assigned_staff_id: staffId,
        from_date: weekStart,
        to_date: weekEnd,
        shift_minutes: shiftMinutes,
        shift_days: shiftDays,
      }).unwrap();
      toast.success(`Shifted ${result.shifted} appointment(s)`);
      setShiftOpen(false);
      refetchMatrix();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Shift failed";
      toast.error(message);
    }
  };

  const legend = useMemo(
    () =>
      (Object.keys(SCHEDULE_STATUS_LABELS) as PatientScheduleStatus[]).map((status) => (
        <div key={status} className="flex items-center gap-1.5">
          <span
            className={`h-3 w-3 rounded border ${SCHEDULE_STATUS_STYLES[status].bg} ${SCHEDULE_STATUS_STYLES[status].border}`}
          />
          <span className="text-xs text-muted-foreground">
            {SCHEDULE_STATUS_LABELS[status]}
          </span>
        </div>
      )),
    []
  );

  if (patientLoading) return <Loading01 />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1" asChild>
            <Link href={`/patients/list/${patientId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to patient
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Schedule Patient
          </h1>
          <p className="text-muted-foreground mt-1">
            {patient?.full_name}{" "}
            {patient?.profile?.patient_code ? (
              <Badge variant="outline" className="ml-1 font-mono">
                {patient.profile.patient_code}
              </Badge>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(formatToday())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={!staffId}
            onClick={() => setShiftOpen(true)}
          >
            <Shuffle className="h-4 w-4" />
            Global shift
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              setConfigDraft(config);
              setConfigOpen(true);
            }}
          >
            <Settings2 className="h-4 w-4" />
            Rules
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-border/60 bg-card/80 p-4 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Assign to staff</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={staffLoading ? "Loading…" : "Select staff"} />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {s.full_name}
                    {s.internalProfile?.titleRef?.name
                      ? ` · ${s.internalProfile.titleRef.name}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-2">
              Only staff with <code className="text-primary">receive_patient</code> permission
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Filter status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(SCHEDULE_STATUS_LABELS) as PatientScheduleStatus[]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {SCHEDULE_STATUS_LABELS[s]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">{legend}</div>

          {config ? (
            <p className="text-[10px] text-muted-foreground border-t pt-3">
              Slot interval: {config.slot_interval_minutes} min · Horizon:{" "}
              {config.horizon_days} days
            </p>
          ) : null}
        </div>

        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                {weekStart} → {weekEnd}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!staffId ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              Select a staff member to view the schedule matrix
            </div>
          ) : matrixLoading ? (
            <Loading01 />
          ) : matrix ? (
            <ScheduleMatrix
              matrix={matrix}
              highlightPatientId={patientId}
              statusFilter={statusFilter}
              onEmptyClick={handleBook}
              onOccupiedClick={setDetailSchedule}
            />
          ) : null}
        </div>
      </div>

      <Dialog open={!!detailSchedule} onOpenChange={() => setDetailSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment details</DialogTitle>
          </DialogHeader>
          {detailSchedule ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Patient: </span>
                {detailSchedule.patient?.full_name}
              </p>
              <p>
                <span className="text-muted-foreground">When: </span>
                {detailSchedule.schedule_date} {detailSchedule.start_time}–
                {detailSchedule.end_time}
              </p>
              <p>
                <span className="text-muted-foreground">Status: </span>
                {SCHEDULE_STATUS_LABELS[detailSchedule.status]}
              </p>
            </div>
          ) : null}
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleStatusChange("completed")}
              disabled={updating}
            >
              Mark completed
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStatusChange("admitted")}
              disabled={updating}
            >
              Admitted
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusChange("cancelled")}
              disabled={updating}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Global shift schedules</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Shift all appointments for selected staff between {weekStart} and {weekEnd}.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Shift time (minutes)</Label>
              <Input
                type="number"
                className="mt-1"
                value={shiftMinutes}
                onChange={(e) => setShiftMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Shift days</Label>
              <Input
                type="number"
                className="mt-1"
                value={shiftDays}
                onChange={(e) => setShiftDays(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftOpen(false)}>
              Close
            </Button>
            <Button onClick={handleShift} disabled={shifting}>
              Apply shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scheduling rules</DialogTitle>
          </DialogHeader>
          {configDraft ? (
            <div className="space-y-4">
              <div>
                <Label>Slot interval (minutes, 5–7)</Label>
                <Input
                  type="number"
                  min={5}
                  max={7}
                  className="mt-1"
                  value={configDraft.slot_interval_minutes}
                  onChange={(e) =>
                    setConfigDraft({
                      ...configDraft,
                      slot_interval_minutes: Number(e.target.value),
                    })
                  }
                />
              </div>
              {["0", "1", "2", "3", "4", "5", "6"].map((dow) => {
                const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const day = configDraft.days_config[dow];
                if (!day) return null;
                return (
                  <div key={dow} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{labels[Number(dow)]}</span>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={day.active}
                          onChange={(e) =>
                            setConfigDraft({
                              ...configDraft,
                              days_config: {
                                ...configDraft.days_config,
                                [dow]: { ...day, active: e.target.checked },
                              },
                            })
                          }
                        />
                        Active
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Start</Label>
                        <Input
                          type="time"
                          value={day.start}
                          onChange={(e) =>
                            setConfigDraft({
                              ...configDraft,
                              days_config: {
                                ...configDraft.days_config,
                                [dow]: { ...day, start: e.target.value.slice(0, 5) },
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End</Label>
                        <Input
                          type="time"
                          value={day.end}
                          onChange={(e) =>
                            setConfigDraft({
                              ...configDraft,
                              days_config: {
                                ...configDraft.days_config,
                                [dow]: { ...day, end: e.target.value.slice(0, 5) },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!configDraft) return;
                try {
                  await updateConfig({
                    slot_interval_minutes: configDraft.slot_interval_minutes,
                    days_config: configDraft.days_config,
                  }).unwrap();
                  toast.success("Scheduling rules saved");
                  setConfigOpen(false);
                  refetchMatrix();
                } catch {
                  toast.error("Failed to save rules");
                }
              }}
              disabled={savingConfig}
            >
              Save rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
