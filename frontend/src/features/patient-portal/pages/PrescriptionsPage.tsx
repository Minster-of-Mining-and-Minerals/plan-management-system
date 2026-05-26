"use client";

import { History, Pill, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import { MOCK_PRESCRIPTIONS, formatDate } from "../data/mockPatientPortalData";

function PrescriptionCard({
  rx,
  showRefill,
}: {
  rx: (typeof MOCK_PRESCRIPTIONS)[0];
  showRefill?: boolean;
}) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">{rx.medication}</h3>
              <p className="text-sm text-muted-foreground">
                {rx.dosage} · {rx.frequency}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prescribed by {rx.doctor}
              </p>
              <p className="text-xs text-muted-foreground">
                Started {formatDate(rx.startDate)}
                {rx.endDate ? ` · Ended ${formatDate(rx.endDate)}` : ""}
              </p>
              {rx.instructions ? (
                <p className="mt-2 text-xs rounded-md bg-muted/50 p-2">{rx.instructions}</p>
              ) : null}
            </div>
          </div>
          <StatusBadge status={rx.status} />
        </div>
        {showRefill && rx.refillsRemaining > 0 ? (
          <Button
            size="sm"
            className="mt-4 gap-1"
            variant="outline"
            onClick={() =>
              toast.success("Refill requested — demo", {
                description: "Pharmacy integration will process refill requests.",
              })
            }
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Request Refill ({rx.refillsRemaining} left)
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PrescriptionsPage() {
  const active = MOCK_PRESCRIPTIONS.filter((p) => p.status === "active");
  const history = MOCK_PRESCRIPTIONS.filter((p) => p.status !== "active");

  return (
    <PatientPortalShell
      title="Prescriptions"
      description="Manage active medications, dosage instructions, and prescription history."
    >
      <DemoBanner />

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Pill className="h-4 w-4" />
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          {active.map((rx) => (
            <PrescriptionCard key={rx.id} rx={rx} showRefill />
          ))}
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          {history.map((rx) => (
            <PrescriptionCard key={rx.id} rx={rx} />
          ))}
        </TabsContent>
      </Tabs>

      <Card className="border-dashed border-primary/30 bg-section-accent-subtle-10">
        <CardHeader>
          <CardTitle className="text-sm">Medication Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l border-primary/30 pl-6 space-y-6">
            {MOCK_PRESCRIPTIONS.map((rx) => (
              <li key={rx.id} className="relative">
                <span className="absolute -left-[21px] flex h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <p className="text-sm font-medium">{rx.medication}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(rx.startDate)} — {rx.status}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </PatientPortalShell>
  );
}
