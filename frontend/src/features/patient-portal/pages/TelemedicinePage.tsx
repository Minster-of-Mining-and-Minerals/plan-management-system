"use client";

import { useState } from "react";
import {
  FileText,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  Phone,
  Video,
  VideoOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import { MOCK_TELEMEDICINE, formatDateTime } from "../data/mockPatientPortalData";

const MOCK_CHAT = [
  { from: "doctor", text: "Good afternoon! How are you feeling today?", time: "2:58 PM" },
  { from: "patient", text: "Much better, thank you. Blood pressure has been stable.", time: "2:59 PM" },
  { from: "doctor", text: "Excellent. Let's review your latest lab results together.", time: "3:00 PM" },
];

export function TelemedicinePage() {
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const upcoming = MOCK_TELEMEDICINE.find((t) => t.status === "upcoming");

  return (
    <PatientPortalShell
      title="Telemedicine"
      description="Virtual consultations, waiting room, and secure messaging with your care team."
    >
      <DemoBanner />

      {upcoming ? (
        <Card className="border-primary/30 bg-gradient-to-r from-section-accent-subtle-20 to-card overflow-hidden">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <DoctorAvatar doctor={upcoming.doctor} size="lg" />
              <div>
                <Badge className="mb-2">Starting soon</Badge>
                <h3 className="font-semibold text-lg">{upcoming.doctor.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(upcoming.scheduledAt)} · {upcoming.duration}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="rounded-lg bg-background/80 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-primary tabular-nums">14:32</p>
                <p className="text-[10px] uppercase text-muted-foreground">Countdown</p>
              </div>
              <Button size="lg" className="gap-2 self-center">
                <Video className="h-5 w-5" />
                Join Waiting Room
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 overflow-hidden">
          <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary))_0%,transparent_50%)]" />
            {videoOn ? (
              <div className="text-center z-10">
                <DoctorAvatar doctor={upcoming?.doctor ?? MOCK_TELEMEDICINE[0].doctor} size="lg" />
                <p className="mt-3 text-white/90 font-medium">
                  {upcoming?.doctor.name ?? "Dr. Selamawit Bekele"}
                </p>
                <p className="text-white/60 text-sm">Video consultation preview</p>
              </div>
            ) : (
              <VideoOff className="h-16 w-16 text-white/40" />
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                size="icon"
                variant={micOn ? "secondary" : "destructive"}
                className="rounded-full h-12 w-12"
                onClick={() => setMicOn(!micOn)}
              >
                {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button
                size="icon"
                variant={videoOn ? "secondary" : "destructive"}
                className="rounded-full h-12 w-12"
                onClick={() => setVideoOn(!videoOn)}
              >
                {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              <Button size="icon" variant="destructive" className="rounded-full h-12 w-12">
                <Phone className="h-5 w-5 rotate-[135deg]" />
              </Button>
              <Button size="icon" variant="secondary" className="rounded-full h-12 w-12">
                <Monitor className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Consultation Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-48 overflow-y-auto">
              {MOCK_CHAT.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm rounded-lg px-3 py-2 max-w-[90%] ${
                    msg.from === "doctor"
                      ? "bg-muted mr-auto"
                      : "bg-primary text-primary-foreground ml-auto"
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className="text-[10px] opacity-70 mt-1">{msg.time}</p>
                </div>
              ))}
            </CardContent>
            <div className="p-3 pt-0 flex gap-2">
              <Input placeholder="Type a message..." className="text-sm" />
              <Button size="sm">Send</Button>
            </div>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Shared Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {["Lab Results — Lipid Panel.pdf", "Care Plan 2026.pdf", "Medication List.pdf"].map(
                (doc) => (
                  <div
                    key={doc}
                    className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                  >
                    <span className="truncate text-xs">{doc}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      View
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Consultation History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_TELEMEDICINE.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-border/50 p-4"
            >
              <div className="flex items-center gap-3">
                <DoctorAvatar doctor={session.doctor} />
                <div>
                  <p className="font-medium text-sm">{session.doctor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(session.scheduledAt)} · {session.type}
                  </p>
                </div>
              </div>
              <StatusBadge status={session.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </PatientPortalShell>
  );
}
