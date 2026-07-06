"use client";

import { useMemo } from "react";
import { History, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPatientPortalPrescriptionsQuery } from "@/redux/api/patientPortalApi";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import { formatDate } from "../data/mockPatientPortalData";

const ACTIVE_STATUSES = new Set(["active", "finalized", "pending"]);

function PrescriptionCard({
  prescription,
}: {
  prescription: {
    prescription_id: string;
    status: string;
    created_at: string;
    notes?: string | null;
    category?: string | null;
    template_name?: string | null;
    prescriber?: { id: string; name: string } | null;
    item_count: number;
  };
}) {
  const title =
    prescription.template_name || prescription.category || "Prescription";

  return (
    <Card className="border-border/60 bg-card/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {prescription.item_count} item
                {prescription.item_count === 1 ? "" : "s"}
              </p>
              {prescription.prescriber?.name ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Prescribed by {prescription.prescriber.name}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Issued {formatDate(prescription.created_at)}
              </p>
              {prescription.notes ? (
                <p className="mt-2 text-xs rounded-md bg-muted/50 p-2">
                  {prescription.notes}
                </p>
              ) : null}
            </div>
          </div>
          <StatusBadge status={prescription.status} />
        </div>
      </CardContent>
    </Card>
  );
}

export function PrescriptionsPage() {
  const { data: prescriptions = [], isLoading } =
    useGetPatientPortalPrescriptionsQuery();

  const { active, history } = useMemo(() => {
    const activeList = prescriptions.filter((p) => ACTIVE_STATUSES.has(p.status));
    const historyList = prescriptions.filter((p) => !ACTIVE_STATUSES.has(p.status));
    return { active: activeList, history: historyList };
  }, [prescriptions]);

  if (isLoading) return <Loading01 />;

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
            History ({history.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active prescriptions.</p>
          ) : (
            active.map((rx) => (
              <PrescriptionCard key={rx.prescription_id} prescription={rx} />
            ))
          )}
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescription history.</p>
          ) : (
            history.map((rx) => (
              <PrescriptionCard key={rx.prescription_id} prescription={rx} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {prescriptions.length > 0 ? (
        <Card className="border-dashed border-primary/30 bg-section-accent-subtle-10">
          <CardHeader>
            <CardTitle className="text-sm">Medication Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-primary/30 pl-6 space-y-6">
              {prescriptions.map((rx) => (
                <li key={rx.prescription_id} className="relative">
                  <span className="absolute -left-[21px] flex h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <p className="text-sm font-medium">
                    {rx.template_name || rx.category || "Prescription"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(rx.created_at)} — {rx.status}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </PatientPortalShell>
  );
}
