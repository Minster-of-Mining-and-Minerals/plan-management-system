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
  useGetStaffBookingCountsQuery,
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
import { StaffScheduleOverview } from "./StaffScheduleOverview";
import { isSlotOccupied } from "./scheduleSlotUtils";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_STYLES,
} from "./scheduleStatus";
import {
  canCancelSchedule,
  type ShiftAnchor,
  type ShiftRangeMode,
} from "./scheduleDragUtils";

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
  const [shiftRangeMode, setShiftRangeMode] =
    useState<ShiftRangeMode>("from_start_to_end");
  const [shiftStart, setShiftStart] = useState<ShiftAnchor | null>(null);
  const [shiftEnd, setShiftEnd] = useState<ShiftAnchor | null>(null);
  const [shiftPickStep, setShiftPickStep] = useState<"start" | "end">("start");

  const weekEnd = addDays(weekStart, 6);

  const { data: patient, isLoading: patientLoading } = useGetPatientByIdQuery(patientId);
  const { data: staff = [], isLoading: staffLoading } = useGetEligibleStaffQuery();
  const { data: bookingCounts } = useGetStaffBookingCountsQuery({
    from: weekStart,
    to: weekEnd,
  });
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

  useEffect(() => {
    if (!shiftOpen || !matrix) return;
    const today = formatToday();
    const todayCol = matrix.dates.find((d) => d.date === today && d.active);
    const firstActive = matrix.dates.find((d) => d.active);
    setShiftStart(
      todayCol
        ? { date: today }
        : firstActive
          ? { date: firstActive.date }
          : { date: weekStart }
    );
    setShiftEnd(null);
    setShiftPickStep("start");
  }, [shiftOpen, matrix, weekStart]);

  const handleShiftMatrixPick = (anchor: ShiftAnchor, fromHeader: boolean) => {
    if (shiftRangeMode === "column_to_column") {
      if (!fromHeader) return;
      const col = { date: anchor.date };
      if (shiftPickStep === "start" || !shiftStart) {
        setShiftStart(col);
        setShiftEnd(null);
        setShiftPickStep("end");
        return;
      }
      if (anchor.date < shiftStart.date) {
        setShiftEnd(shiftStart);
        setShiftStart(col);
      } else {
        setShiftEnd(col);
      }
      return;
    }

    if (shiftRangeMode === "from_start_to_column") {
      if (shiftPickStep === "start") {
        setShiftStart(fromHeader ? { date: anchor.date } : anchor);
        setShiftEnd(null);
        setShiftPickStep("end");
        return;
      }
      if (!fromHeader) {
        toast.error("Click a column header to set the end of the range");
        return;
      }
      if (!shiftStart) return;
      if (anchor.date < shiftStart.date) {
        toast.error("End column must be on or after the start");
        return;
      }
      setShiftEnd({ date: anchor.date });
      return;
    }

    setShiftStart(fromHeader ? { date: anchor.date } : anchor);
    setShiftEnd(null);
  };

  const selectedStaff = staff.find((s) => s.user_id === staffId);
  const slotInterval = matrix?.settings?.slot_interval_minutes ?? config?.slot_interval_minutes ?? 5;

  const handleBook = async (date: string, time: string) => {
    if (!staffId) return;
    if (
      matrix &&
      isSlotOccupied(matrix.schedules, date, time, slotInterval)
    ) {
      toast.error("This time slot is already booked for the selected staff");
      return;
    }
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

  const handleReschedule = async (
    schedule: PatientSchedule,
    date: string,
    time: string
  ) => {
    if (date < formatToday()) {
      toast.error("Cannot reschedule to a past date");
      return;
    }
    if (schedule.schedule_date === date && schedule.start_time === time) {
      return;
    }
    try {
      await updateSchedule({
        id: schedule.schedule_id,
        body: {
          schedule_date: date,
          start_time: time,
          status: "rescheduled",
        },
      }).unwrap();
      toast.success("Appointment rescheduled");
      refetchMatrix();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Reschedule failed";
      toast.error(message);
      throw err;
    }
  };

  const handleStatusChange = async (status: PatientScheduleStatus) => {
    if (!detailSchedule) return;
    if (
      status === "admitted" &&
      detailSchedule.schedule_date !== formatToday()
    ) {
      toast.error(
        "Patients can only be admitted on the day of their appointment (today)."
      );
      return;
    }
    if (status === "cancelled" && !canCancelSchedule(detailSchedule)) {
      toast.error(
        "Only scheduled appointments on today or a future date can be cancelled."
      );
      return;
    }
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

  const normalizeShiftMinutes = (value: number) => Math.round(value / 5) * 5;

  const handleShift = async () => {
    if (!staffId) return;
    if (!shiftStart?.date) {
      toast.error("Select a shift start column or cell on the matrix first");
      return;
    }
    if (shiftRangeMode !== "from_start_to_end" && !shiftEnd?.date) {
      toast.error("Select an end column on the matrix");
      return;
    }
    if (
      shiftEnd?.date &&
      shiftEnd.date < shiftStart.date
    ) {
      toast.error("End must be on or after the start");
      return;
    }
    const minutes = normalizeShiftMinutes(shiftMinutes);
    if (!minutes && !shiftDays) {
      toast.error("Enter shift minutes (multiples of 5) and/or days");
      return;
    }
    if (shiftMinutes && minutes === 0) {
      toast.error("Time shift must be a non-zero multiple of 5 minutes (e.g. 5, 10, -15)");
      return;
    }
    try {
      const result = await shiftSchedules({
        assigned_staff_id: staffId,
        from_date: weekStart,
        to_date: weekEnd,
        shift_minutes: minutes,
        shift_days: shiftDays,
        range_mode: shiftRangeMode,
        anchor_date: shiftStart.date,
        anchor_time: shiftStart.time,
        end_date: shiftEnd?.date,
        end_time: shiftEnd?.time,
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
            variant={shiftOpen ? "default" : "outline"}
            size="sm"
            className="gap-1"
            disabled={!staffId}
            onClick={() => setShiftOpen((open) => !open)}
          >
            <Shuffle className="h-4 w-4" />
            {shiftOpen ? "Shift mode on" : "Global shift"}
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
                {staff.map((s) => {
                  const count = bookingCounts?.counts?.[s.user_id] ?? 0;
                  return (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name}
                      {s.internalProfile?.titleRef?.name
                        ? ` · ${s.internalProfile.titleRef.name}`
                        : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-2">
              Choose staff to see their full week calendar. Only empty (+) slots can
              be booked — overlaps are blocked on the server too.
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

          <p className="text-[10px] text-muted-foreground">
            Drag scheduled appointments to another open slot (today or future).
            Admitted and cancelled slots cannot be moved.
          </p>

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

          {shiftOpen && staffId ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-amber-950">Global shift</h3>
                  <p className="text-sm text-amber-900/80 mt-1">
                    Choose a range, then mark <strong>start</strong> (and{" "}
                    <strong>end</strong> if needed) on the matrix. Time-only shifts
                    spill into the next active day&apos;s column when slots run out.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-900"
                  onClick={() => setShiftOpen(false)}
                >
                  Exit shift mode
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Shift range</Label>
                <Select
                  value={shiftRangeMode}
                  onValueChange={(v) => {
                    setShiftRangeMode(v as ShiftRangeMode);
                    setShiftEnd(null);
                    setShiftPickStep("start");
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from_start_to_end">
                      From start → end of week
                    </SelectItem>
                    <SelectItem value="from_start_to_column">
                      From start (cell/day) → end column
                    </SelectItem>
                    <SelectItem value="column_to_column">
                      Column to column (whole days)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <p className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">
                  <span className="font-medium">Start: </span>
                  {shiftStart
                    ? `${shiftStart.date}${shiftStart.time ? ` ${shiftStart.time}` : " (whole day)"}`
                    : "—"}
                </p>
                <p className="rounded-md border border-violet-200 bg-white px-3 py-2 text-sm text-violet-900">
                  <span className="font-medium">End: </span>
                  {shiftRangeMode === "from_start_to_end"
                    ? `${weekEnd} (week end)`
                    : shiftEnd
                      ? `${shiftEnd.date} (whole day)`
                      : shiftPickStep === "end"
                        ? "Click end column header…"
                        : "—"}
                </p>
              </div>
              <p className="text-xs text-amber-800">
                {shiftRangeMode === "column_to_column"
                  ? "Click two column headers (start, then end)."
                  : shiftRangeMode === "from_start_to_column"
                    ? "Click start (cell or header), then end column header."
                    : "Click start cell or column header; shifts through week end."}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Shift time (minutes, step of 5)</Label>
                  <Input
                    type="number"
                    step={5}
                    className="mt-1 bg-white"
                    value={shiftMinutes}
                    onChange={(e) => setShiftMinutes(Number(e.target.value))}
                    onBlur={() =>
                      setShiftMinutes((m) => normalizeShiftMinutes(m))
                    }
                  />
                  <p className="text-[10px] text-amber-900/70 mt-1">
                    Uses slot steps (5, 10, 15…). Values like 6 are rounded to 5.
                  </p>
                </div>
                <div>
                  <Label>Shift days (active days only)</Label>
                  <Input
                    type="number"
                    className="mt-1 bg-white"
                    value={shiftDays}
                    onChange={(e) => setShiftDays(Number(e.target.value))}
                  />
                  <p className="text-[10px] text-amber-900/70 mt-1">
                    Each step skips inactive weekdays.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShiftOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleShift} disabled={shifting}>
                  {shifting ? "Applying…" : "Apply shift"}
                </Button>
              </div>
            </div>
          ) : null}

          {!staffId ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              Select a staff member to view their appointments and free slots for{" "}
              {weekStart} → {weekEnd}
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
              onReschedule={handleReschedule}
              shiftSelectMode={shiftOpen}
              shiftRangeMode={shiftRangeMode}
              shiftStart={shiftStart}
              shiftEnd={shiftEnd}
              onShiftMatrixPick={handleShiftMatrixPick}
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
              {detailSchedule.schedule_date !== formatToday() && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  Admission is only available on the appointment date. This slot
                  is scheduled for {detailSchedule.schedule_date}; today is{" "}
                  {formatToday()}.
                </p>
              )}
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
              disabled={
                updating ||
                detailSchedule?.schedule_date !== formatToday()
              }
              title={
                detailSchedule?.schedule_date !== formatToday()
                  ? "Admission is only allowed on the appointment date (today)"
                  : undefined
              }
            >
              Admitted
            </Button>
            {detailSchedule && canCancelSchedule(detailSchedule) ? (
              <Button
                variant="destructive"
                onClick={() => handleStatusChange("cancelled")}
                disabled={updating}
              >
                Cancel schedule
              </Button>
            ) : null}
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
