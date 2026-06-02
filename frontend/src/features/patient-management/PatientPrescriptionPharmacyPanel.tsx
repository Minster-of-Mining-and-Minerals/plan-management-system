"use client";

import { useEffect, useState } from "react";
import { Send, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import {
  useGetPatientPrescriptionsForSendQuery,
  useGetActivePharmaciesQuery,
  useSendPrescriptionToPharmacyMutation,
} from "@/redux/api/pharmacyApi";
import { PrescriptionPharmacyForwardBadge } from "./components/PrescriptionPharmacyForwardBadge";

type Props = { patientId: string };

function isForwarded(rx: { pharmacy_forward?: { forward_id?: string; is_forwarded?: boolean } | null }) {
  return Boolean(rx.pharmacy_forward?.forward_id || rx.pharmacy_forward?.is_forwarded);
}

export function PatientPrescriptionPharmacyPanel({ patientId }: Props) {
  const { data: prescriptions = [], isLoading, refetch } =
    useGetPatientPrescriptionsForSendQuery(patientId);
  const { data: pharmacies = [] } = useGetActivePharmaciesQuery();
  const [sendPrescription, { isLoading: sending }] =
    useSendPrescriptionToPharmacyMutation();
  const [selectedPharmacy, setSelectedPharmacy] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    setSelectedPharmacy((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const rx of prescriptions) {
        if (
          !next[rx.prescription_id] &&
          rx.pharmacy_forward?.pharmacy_id
        ) {
          next[rx.prescription_id] = rx.pharmacy_forward.pharmacy_id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [prescriptions]);

  if (isLoading) return <Loading01 />;

  const handleSend = async (prescriptionId: string, alreadyForwarded: boolean) => {
    const pharmacyId = selectedPharmacy[prescriptionId];
    if (!pharmacyId) {
      toast.error("Select a pharmacy first");
      return;
    }
    try {
      const result = await sendPrescription({
        prescription_id: prescriptionId,
        pharmacy_id: pharmacyId,
      }).unwrap();
      const wasUpdate = Boolean(
        (result as { forward?: { updated?: boolean } }).forward?.updated
      );
      toast.success(
        wasUpdate || alreadyForwarded
          ? "Pharmacy forwarding updated"
          : "Prescription sent to pharmacy"
      );
      refetch();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Send failed";
      toast.error(message);
    }
  };

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prescriptions & pharmacy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No issued prescriptions for this patient yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prescriptions & pharmacy</CardTitle>
        <p className="text-xs text-muted-foreground">
          Each prescription has one active pharmacy forwarding. Sending again
          updates the same record (pharmacy, content, or files) — no duplicates.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {prescriptions.map((rx) => {
          const forwarded = isForwarded(rx);
          return (
            <div
              key={rx.prescription_id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <p className="font-medium">{rx.header_title || "Prescription"}</p>
                <p className="text-xs text-muted-foreground">
                  {rx.issued_at
                    ? new Date(rx.issued_at).toLocaleString()
                    : "Issued"}
                </p>
                {forwarded && (
                  <PrescriptionPharmacyForwardBadge forward={rx.pharmacy_forward} />
                )}
              </div>
              <PermissionGuard requireAny={["PHARMACY_PRESCRIPTION:SEND"]}>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedPharmacy[rx.prescription_id] || ""}
                    onValueChange={(v) =>
                      setSelectedPharmacy((prev) => ({
                        ...prev,
                        [rx.prescription_id]: v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select pharmacy" />
                    </SelectTrigger>
                    <SelectContent>
                      {pharmacies.map((p) => (
                        <SelectItem key={p.pharmacy_id} value={p.pharmacy_id}>
                          {p.pharmacy_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    title="Print original prescription"
                  >
                    <Printer className="mr-1 h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSend(rx.prescription_id, forwarded)}
                    disabled={sending}
                  >
                    <Send className="mr-1 h-4 w-4" />
                    {forwarded ? "Update forwarding" : "Send"}
                  </Button>
                </div>
              </PermissionGuard>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
