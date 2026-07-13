"use client";

import { useMemo, useState } from "react";
import { Calendar, Clock, MapPin, Plus, RefreshCw, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useBookPatientPortalScheduleMutation,
  useCancelPatientPortalScheduleMutation,
  useGetPatientPortalAvailabilityQuery,
  useGetPatientPortalDoctorsQuery,
  useGetPatientPortalSchedulesQuery,
  useReschedulePatientPortalScheduleMutation,
  type PatientPortalSchedule,
} from "@/redux/api/patientPortalApi";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import { TimeSlotPicker } from "../components/TimeSlotPicker";
import { formatDate } from "../data/mockPatientPortalData";
import {
  formatScheduleTime,
  initialsFromName,
  isUpcomingSchedule,
} from "../patientPortalUtils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function AppointmentCard({
  schedule,
  onReschedule,
  onCancel,
}: {
  schedule: PatientPortalSchedule;
  onReschedule?: () => void;
  onCancel?: () => void;
}) {
  const isUpcoming = isUpcomingSchedule(schedule);
  const doctorName = schedule.doctor?.name ?? "Provider";

  return (
    <Card className="border-border/60 bg-card/80 overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <DoctorAvatar
            doctor={{
              name: doctorName,
              avatarInitials: initialsFromName(doctorName),
            }}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{doctorName}</h3>
              <StatusBadge status={schedule.status} />
            </div>
            <p className="text-sm font-medium">
              {schedule.appointment_type || "Outpatient visit"}
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(schedule.schedule_date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatScheduleTime(schedule.start_time)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                NovaCure Clinic
              </span>
            </div>
            {schedule.notes ? (
              <p className="text-xs rounded-md bg-muted/50 p-2">{schedule.notes}</p>
            ) : null}
            {isUpcoming && onReschedule && onCancel ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={onReschedule}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={onCancel}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AppointmentsPage() {
  const { data: schedules = [], isLoading } = useGetPatientPortalSchedulesQuery();
  const { data: doctors = [] } = useGetPatientPortalDoctorsQuery();
  const [bookSchedule, { isLoading: booking }] = useBookPatientPortalScheduleMutation();
  const [rescheduleSchedule, { isLoading: rescheduling }] =
    useReschedulePatientPortalScheduleMutation();
  const [cancelSchedule, { isLoading: cancelling }] =
    useCancelPatientPortalScheduleMutation();

  const [bookOpen, setBookOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const [bookDoctorId, setBookDoctorId] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookType, setBookType] = useState("Outpatient visit");
  const [bookNotes, setBookNotes] = useState("");

  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.schedule_id === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId]
  );

  const { data: bookAvailability, isFetching: bookSlotsLoading } =
    useGetPatientPortalAvailabilityQuery(
      { date: bookDate, staff_id: bookDoctorId },
      { skip: !bookOpen || !bookDate || !bookDoctorId }
    );

  const { data: rescheduleAvailability, isFetching: rescheduleSlotsLoading } =
    useGetPatientPortalAvailabilityQuery(
      {
        date: rescheduleDate,
        staff_id: selectedSchedule?.doctor?.id,
        exclude_schedule_id: selectedScheduleId ?? undefined,
      },
      {
        skip:
          !rescheduleOpen ||
          !rescheduleDate ||
          !selectedSchedule?.doctor?.id,
      }
    );

  const upcoming = useMemo(
    () => schedules.filter(isUpcomingSchedule),
    [schedules]
  );

  const past = useMemo(
    () => schedules.filter((s) => !isUpcomingSchedule(s)),
    [schedules]
  );

  const openReschedule = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.schedule_id === scheduleId);
    setSelectedScheduleId(scheduleId);
    setRescheduleDate(schedule?.schedule_date ?? "");
    setRescheduleTime(schedule?.start_time?.slice(0, 5) ?? "");
    setRescheduleOpen(true);
  };

  const openCancel = (scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
    setCancelOpen(true);
  };

  const resetBookForm = () => {
    setBookDoctorId("");
    setBookDate("");
    setBookTime("");
    setBookType("Outpatient visit");
    setBookNotes("");
  };

  const handleBook = async () => {
    if (!bookDoctorId || !bookDate || !bookTime) {
      toast.error("Please select a doctor, date, and time.");
      return;
    }
    try {
      await bookSchedule({
        assigned_staff_id: bookDoctorId,
        schedule_date: bookDate,
        start_time: bookTime,
        appointment_type: bookType,
        notes: bookNotes || undefined,
      }).unwrap();
      toast.success("Appointment booked");
      setBookOpen(false);
      resetBookForm();
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? String((error as { data?: { message?: string } }).data?.message)
          : "Could not book appointment";
      toast.error(message);
    }
  };

  const handleReschedule = async () => {
    if (!selectedScheduleId || !rescheduleDate || !rescheduleTime) {
      toast.error("Please select a new date and time.");
      return;
    }
    try {
      await rescheduleSchedule({
        id: selectedScheduleId,
        schedule_date: rescheduleDate,
        start_time: rescheduleTime,
      }).unwrap();
      toast.success("Appointment rescheduled");
      setRescheduleOpen(false);
      setSelectedScheduleId(null);
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? String((error as { data?: { message?: string } }).data?.message)
          : "Could not reschedule appointment";
      toast.error(message);
    }
  };

  const handleCancel = async () => {
    if (!selectedScheduleId) return;
    try {
      await cancelSchedule(selectedScheduleId).unwrap();
      toast.success("Appointment cancelled");
      setCancelOpen(false);
      setSelectedScheduleId(null);
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? String((error as { data?: { message?: string } }).data?.message)
          : "Could not cancel appointment";
      toast.error(message);
    }
  };

  if (isLoading) return <Loading01 />;

  return (
    <PatientPortalShell
      title="Appointments"
      description="View upcoming visits, book new appointments, and manage your care schedule."
      action={
        <Button onClick={() => setBookOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      }
    >
      <DemoBanner />

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Previous ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-4">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            upcoming.map((schedule) => (
              <AppointmentCard
                key={schedule.schedule_id}
                schedule={schedule}
                onReschedule={() => openReschedule(schedule.schedule_id)}
                onCancel={() => openCancel(schedule.schedule_id)}
              />
            ))
          )}
        </TabsContent>
        <TabsContent value="past" className="space-y-4">
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previous appointments.</p>
          ) : (
            past.map((schedule) => (
              <AppointmentCard key={schedule.schedule_id} schedule={schedule} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={bookOpen}
        onOpenChange={(open) => {
          setBookOpen(open);
          if (!open) resetBookForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>Select a provider and preferred time slot.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Doctor</Label>
              <Select
                value={bookDoctorId}
                onValueChange={(value) => {
                  setBookDoctorId(value);
                  setBookTime("");
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose provider" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                      {doctor.department ? ` — ${doctor.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visit type</Label>
              <Select value={bookType} onValueChange={setBookType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                  <SelectItem value="New patient">New patient</SelectItem>
                  <SelectItem value="Outpatient visit">Outpatient visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                className="mt-1"
                min={todayIso()}
                value={bookDate}
                onChange={(e) => {
                  setBookDate(e.target.value);
                  setBookTime("");
                }}
              />
            </div>
            {bookDoctorId && bookDate ? (
              <div>
                <Label className="mb-2 block">Available time slots</Label>
                <TimeSlotPicker
                  slots={bookAvailability?.slots ?? []}
                  value={bookTime}
                  onChange={setBookTime}
                  isLoading={bookSlotsLoading}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose a doctor and date to see available time slots.
              </p>
            )}
            <div>
              <Label>Notes (optional)</Label>
              <Input
                className="mt-1"
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                placeholder="Reason for visit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBook} disabled={booking}>
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>Pick a new date and time for your visit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>New date</Label>
              <Input
                type="date"
                className="mt-1"
                min={todayIso()}
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  setRescheduleTime("");
                }}
              />
            </div>
            {rescheduleDate && selectedSchedule?.doctor?.id ? (
              <div>
                <Label className="mb-2 block">Available time slots</Label>
                <TimeSlotPicker
                  slots={rescheduleAvailability?.slots ?? []}
                  value={rescheduleTime}
                  onChange={setRescheduleTime}
                  isLoading={rescheduleSlotsLoading}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={rescheduling}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep appointment
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              Cancel appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PatientPortalShell>
  );
}
