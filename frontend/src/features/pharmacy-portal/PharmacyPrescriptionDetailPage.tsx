"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, Printer } from "lucide-react";
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
import type { PharmacyPrescriptionStatus } from "@/redux/types/pharmacy";
import { toast } from "sonner";
import { exportPrescriptionHtml } from "@/lib/downloadPrescriptionPdf";

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

  if (isLoading || !rx) return <Loading01 />;

  const currentStatus = (status || rx.pharmacy_status) as PharmacyPrescriptionStatus;
  const statusStyles = PHARMACY_RX_STATUS_STYLES[currentStatus];

  const handleSave = async () => {
    try {
      await updateWorkflow({
        id: prescriptionId,
        body: {
          pharmacy_status: currentStatus,
          pharmacy_notes: notes || rx.pharmacy_notes,
          change_summary: `Status updated to ${currentStatus}`,
          create_fulfillment: currentStatus === "completed",
        },
      }).unwrap();
      toast.success("Pharmacy workflow updated");
      refetch();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Update failed";
      toast.error(message);
    }
  };

  const handlePrint = () => {
    if (!rx.source_rendered_html) {
      toast.error("No printable document available");
      return;
    }
    exportPrescriptionHtml(
      rx.source_rendered_html,
      `pharmacy-rx-${rx.pharmacy_prescription_id}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DetailHeader breadcrumbs={[{ title: "Prescription detail" }]} />
        <Button variant="outline" size="sm" onClick={() => router.push("/pharmacy/prescriptions/queue")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{rx.source_header_title || "Prescription"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Patient: {rx.patient_name} · Doctor: {rx.prescriber_name}
            </p>
            <p className="text-xs text-muted-foreground">
              Original prescription is read-only. Updates apply to pharmacy copy only.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("capitalize", statusStyles.bg, statusStyles.text, statusStyles.border)}
          >
            {PHARMACY_RX_STATUS_LABELS[rx.pharmacy_status]}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print copy
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medication items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(rx.items || []).map((item) => (
              <div key={item.pharmacy_prescription_item_id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{item.item_name}</p>
                <p className="text-muted-foreground">
                  {[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}
                </p>
                {item.instructions && (
                  <p className="mt-1 text-muted-foreground">{item.instructions}</p>
                )}
                <p className="mt-1 text-xs">Qty: {item.quantity || "—"} · Status: {item.pharmacy_item_status}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fulfillment workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={currentStatus}
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
              <Label>Pharmacy notes</Label>
              <Textarea
                value={notes || rx.pharmacy_notes || ""}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Dispensing notes, substitutions, etc."
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save workflow"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {rx.source_rendered_html && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Original prescription document (read-only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="overflow-auto rounded border bg-white p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: rx.source_rendered_html }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
