"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  HeartPulse,
  Scissors,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPatientPortalMedicalHistoryQuery } from "@/redux/api/patientPortalApi";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DemoBanner } from "../components/DemoBanner";
import { formatDate } from "../data/mockPatientPortalData";
import type { MedicalHistoryEvent } from "../types";

const TYPE_CONFIG: Record<
  MedicalHistoryEvent["type"],
  { icon: typeof Stethoscope; color: string; label: string }
> = {
  visit: { icon: Stethoscope, color: "bg-blue-500/15 text-blue-700", label: "Visit" },
  diagnosis: { icon: HeartPulse, color: "bg-rose-500/15 text-rose-700", label: "Diagnosis" },
  treatment: { icon: Syringe, color: "bg-emerald-500/15 text-emerald-700", label: "Treatment" },
  surgery: { icon: Scissors, color: "bg-violet-500/15 text-violet-700", label: "Surgery" },
  allergy: { icon: AlertTriangle, color: "bg-amber-500/15 text-amber-700", label: "Allergy" },
  condition: { icon: HeartPulse, color: "bg-primary/15 text-primary", label: "Condition" },
};

export function MedicalHistoryPage() {
  const { data: history = [], isLoading } = useGetPatientPortalMedicalHistoryQuery();
  const [filter, setFilter] = useState<string>("all");

  const events = useMemo(() => {
    const filtered =
      filter === "all"
        ? history
        : history.filter((e) => e.type === filter);
    return [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [history, filter]);

  if (isLoading) return <Loading01 />;

  return (
    <PatientPortalShell
      title="Medical History"
      description="A complete timeline of visits, diagnoses, treatments, surgeries, and chronic conditions."
    >
      <DemoBanner />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="visit">Visits</TabsTrigger>
          <TabsTrigger value="diagnosis">Diagnoses</TabsTrigger>
          <TabsTrigger value="treatment">Treatments</TabsTrigger>
          <TabsTrigger value="surgery">Surgeries</TabsTrigger>
          <TabsTrigger value="allergy">Allergies</TabsTrigger>
          <TabsTrigger value="condition">Conditions</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative mt-6">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent hidden sm:block" />
        <div className="space-y-6">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medical history entries yet.</p>
          ) : (
            events.map((event) => {
              const eventType = (event.type in TYPE_CONFIG
                ? event.type
                : "visit") as MedicalHistoryEvent["type"];
              const config = TYPE_CONFIG[eventType];
              const Icon = config.icon;
              return (
                <div key={event.id} className="relative flex gap-4 sm:gap-6">
                  <div className="hidden sm:flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-background shadow-md z-10",
                        config.color
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <Card className="flex-1 border-border/60 bg-card/80 transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className={config.color}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.date)}
                        </span>
                        {event.status ? (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {event.status.replace(/_/g, " ")}
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      {event.summary ? (
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          {event.summary}
                        </p>
                      ) : null}
                      {event.provider ? (
                        <p className="mt-2 text-xs text-primary font-medium">
                          {event.provider}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PatientPortalShell>
  );
}
