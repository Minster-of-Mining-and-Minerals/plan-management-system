"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";
import DetailHeader from "@/components/common/DetailHeader";
import {
  useGetPharmacyPortalPrescriptionQuery,
  useUpdatePharmacyPrescriptionWorkflowMutation,
} from "@/redux/api/pharmacyPortalApi";
import {
  PHARMACY_RX_STATUS_LABELS,
  PHARMACY_RX_STATUS_STYLES,
} from "./pharmacyStatus";
import type { PharmacyPrescription, PharmacyPrescriptionStatus } from "@/redux/types/pharmacy";
import { toast } from "sonner";
import { PharmacyPrescriptionDocumentsList } from "./PharmacyPrescriptionDocumentsList";

const WORKFLOW_STATUSES: PharmacyPrescriptionStatus[] = [
  "received",
  "reviewing",
  "preparing",
  "partially_dispensed",
  "dispensed",
  "unavailable",
  "rejected",
  "completed",
];

type Props = { prescriptionId: string };

export function PharmacyPrescriptionDetailPage({ prescriptionId }: Props) {
  const router = useRouter();
  const { data: rx, isLoading, refetch } =
    useGetPharmacyPortalPrescriptionQuery(prescriptionId);
  const [updateWorkflow, { isLoading: saving }] =
    useUpdatePharmacyPrescriptionWorkflowMutation();

  const [status, setStatus] = useState<PharmacyPrescriptionStatus | "">("");
  const [notes, setNotes] = useState("");

  const batchPrescriptions = useMemo(
    () => (rx?.batch_prescriptions?.length ? rx.batch_prescriptions : rx ? [rx] : []),
    [rx]
  );

  const batchCount = rx?.batch_prescription_count ?? batchPrescriptions.length;
  const isBatch = batchCount > 1;

  const globalStatus = (status ||
    rx?.batch_global_status ||
    rx?.pharmacy_status ||
    "received") as PharmacyPrescriptionStatus;
  const statusStyles = PHARMACY_RX_STATUS_STYLES[globalStatus];

  const allItems = useMemo(
    () =>
      batchPrescriptions.flatMap((p) =>
        (p.items || []).map((item) => ({
          ...item,
          prescriptionTitle: p.source_header_title || "Prescription",
        }))
      ),
    [batchPrescriptions]
  );

  const documentCount = batchPrescriptions.filter((p) => p.source_rendered_html).length;

  if (isLoading || !rx) return <Loading01 />;

  const handleSave = async () => {
    try {
      await updateWorkflow({
        id: prescriptionId,
        body: {
          pharmacy_status: globalStatus,
          pharmacy_notes: notes || rx.batch_global_notes || rx.pharmacy_notes,
          change_summary: isBatch
            ? `Batch status updated to ${globalStatus}`
            : `Status updated to ${globalStatus}`,
          create_fulfillment: globalStatus === "completed",
        },
      }).unwrap();
      toast.success(
        isBatch
          ? `Workflow updated for all ${batchCount} prescriptions`
          : "Pharmacy workflow updated"
      );
      refetch();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Update failed";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DetailHeader breadcrumbs={[{ title: "Prescription detail" }]} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/pharmacy/prescriptions")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              {isBatch
                ? `Prescription batch (${batchCount} documents)`
                : rx.source_header_title || "Prescription"}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Patient: {rx.patient_name} · Doctor: {rx.prescriber_name}
            </p>
            {isBatch && (
              <p className="mt-1 text-xs text-muted-foreground">
                One shared fulfillment status applies to every prescription in
                this send.
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "capitalize",
              statusStyles.bg,
              statusStyles.text,
              statusStyles.border
            )}
          >
            {PHARMACY_RX_STATUS_LABELS[globalStatus]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Global status</Label>
            <Select
              value={globalStatus}
              onValueChange={(v) => setStatus(v as PharmacyPrescriptionStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PHARMACY_RX_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pharmacy notes (batch)</Label>
            <Textarea
              value={notes || rx.batch_global_notes || rx.pharmacy_notes || ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Dispensing notes for this patient send…"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save global workflow"}
          </Button>
        </CardContent>
      </Card>

      {allItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All medication items</CardTitle>
            {isBatch && (
              <p className="text-xs text-muted-foreground">
                Items from every prescription in this batch
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {allItems.map((item) => (
              <div
                key={item.pharmacy_prescription_item_id}
                className="rounded-lg border p-3 text-sm"
              >
                {isBatch && (
                  <p className="mb-1 text-xs font-medium text-primary">
                    {item.prescriptionTitle}
                  </p>
                )}
                <p className="font-medium">{item.item_name}</p>
                <p className="text-muted-foreground">
                  {[item.dosage, item.frequency, item.duration]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.instructions && (
                  <p className="mt-1 text-muted-foreground">{item.instructions}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Qty: {item.quantity || "—"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {documentCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Original prescription documents (read-only)
            </CardTitle>
            {isBatch && (
              <p className="mt-1 text-xs text-muted-foreground">
                {documentCount} files — status is controlled globally above
              </p>
            )}
          </CardHeader>
          <CardContent>
            <PharmacyPrescriptionDocumentsList
              prescriptions={batchPrescriptions}
              activeId={prescriptionId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
