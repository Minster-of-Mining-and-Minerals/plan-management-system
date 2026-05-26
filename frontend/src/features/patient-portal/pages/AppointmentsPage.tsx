"use client";

import { useState } from "react";
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
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import {
  MOCK_DOCTORS,
  MOCK_PAST_APPOINTMENTS,
  MOCK_UPCOMING_APPOINTMENTS,
  formatDate,
} from "../data/mockPatientPortalData";
import type { Appointment } from "../types";

function AppointmentCard({
  apt,
  onReschedule,
  onCancel,
}: {
  apt: Appointment;
  onReschedule?: () => void;
  onCancel?: () => void;
}) {
  const isUpcoming = apt.status === "scheduled" || apt.status === "confirmed";

  return (
    <Card className="border-border/60 bg-card/80 overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <DoctorAvatar doctor={apt.doctor} size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{apt.doctor.name}</h3>
              <StatusBadge status={apt.status} />
            </div>
            <p className="text-sm text-muted-foreground">{apt.doctor.specialty}</p>
            <p className="text-sm font-medium">{apt.type}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(apt.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {apt.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {apt.location}
              </span>
            </div>
            {apt.notes ? (
              <p className="text-xs rounded-md bg-muted/50 p-2">{apt.notes}</p>
            ) : null}
            {isUpcoming && onReschedule && onCancel ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={onReschedule}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Reschedule
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={onCancel}>
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
  const [bookOpen, setBookOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const handleDemoAction = (action: string) => {
    toast.success(`${action} — demo only`, {
      description: "This workflow will connect to scheduling when integrated.",
    });
    setBookOpen(false);
    setRescheduleOpen(false);
    setCancelOpen(false);
  };

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
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Previous</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-4">
          {MOCK_UPCOMING_APPOINTMENTS.map((apt) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              onReschedule={() => setRescheduleOpen(true)}
              onCancel={() => setCancelOpen(true)}
            />
          ))}
        </TabsContent>
        <TabsContent value="past" className="space-y-4">
          {MOCK_PAST_APPOINTMENTS.map((apt) => (
            <AppointmentCard key={apt.id} apt={apt} />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>Select a provider and preferred time slot.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Doctor</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose provider" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_DOCTORS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} — {d.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visit type</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="new">New patient</SelectItem>
                  <SelectItem value="tele">Telemedicine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleDemoAction("Appointment booked")}>Confirm Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>Pick a new date and time for your visit.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label>New date</Label>
              <Input type="date" className="mt-1" />
            </div>
            <div>
              <Label>New time</Label>
              <Input type="time" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button onClick={() => handleDemoAction("Appointment rescheduled")}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone in demo mode.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep appointment</Button>
            <Button variant="destructive" onClick={() => handleDemoAction("Appointment cancelled")}>
              Cancel appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PatientPortalShell>
  );
}
