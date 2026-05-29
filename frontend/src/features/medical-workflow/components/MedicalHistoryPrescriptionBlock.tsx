"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetPrescriptionQuery,
  useListPrescriptionsQuery,
} from "@/redux/api/prescriptionApi";
import type { PrescriptionRecord } from "@/redux/types/prescription";
import { PrescriptionPrintDocument } from "@/features/prescription-workflow/PrescriptionPrintDocument";
import {
  buildPrescriptionPdfFilename,
  exportPrescriptionHtml,
} from "@/lib/downloadPrescriptionPdf";
import { toast } from "sonner";

type Props = {
  prescription?: PrescriptionRecord | null;
  prescriptionId?: string;
  appointmentId?: string;
  workflowLogId?: string;
  logCreatedAt?: string;
  headerTitle?: string;
  itemsSummary?: string;
};

function resolveFromList(
  list: PrescriptionRecord[],
  opts: {
    prescriptionId?: string;
    workflowLogId?: string;
    logCreatedAt?: string;
    headerTitle?: string;
  }
): PrescriptionRecord | undefined {
  if (opts.prescriptionId) {
    const byId = list.find((p) => p.prescription_id === opts.prescriptionId);
    if (byId) return byId;
  }
  if (opts.workflowLogId) {
    const byLog = list.find((p) => p.workflow_log_id === opts.workflowLogId);
    if (byLog) return byLog;
  }
  const title = opts.headerTitle?.trim().toLowerCase();
  if (title) {
    const byTitle = list.find(
      (p) => (p.header_title || "").trim().toLowerCase() === title
    );
    if (byTitle) return byTitle;
  }
  if (opts.logCreatedAt) {
    const logTime = new Date(opts.logCreatedAt).getTime();
    let best: PrescriptionRecord | undefined;
    let bestDelta = Infinity;
    for (const p of list) {
      const rxTime = new Date(p.issued_at || p.created_at || 0).getTime();
      const delta = Math.abs(rxTime - logTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = p;
      }
    }
    if (best && bestDelta <= 15 * 60 * 1000) return best;
  }
  if (list.length === 1) return list[0];
  return undefined;
}

function PrescriptionDetail({ rx }: { rx: PrescriptionRecord }) {
  const [downloading, setDownloading] = useState(false);
  const title = rx.header_title || rx.template?.name || "Prescription";
  const items = rx.items || [];

  const handleDownload = async () => {
    if (!rx.rendered_html) return;
    setDownloading(true);
    try {
      await exportPrescriptionHtml(
        rx.rendered_html,
        buildPrescriptionPdfFilename(title)
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to download prescription PDF";
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Issued prescription
      </p>

      {(rx.template?.name || rx.category?.name || rx.prescriber?.full_name) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
          {rx.template?.name && (
            <span>
              <span className="text-muted-foreground">Template: </span>
              {rx.template.name}
            </span>
          )}
          {rx.category?.name && (
            <span>
              <span className="text-muted-foreground">Category: </span>
              {rx.category.name}
            </span>
          )}
          {rx.prescriber?.full_name && (
            <span>
              <span className="text-muted-foreground">Prescriber: </span>
              {rx.prescriber.full_name}
            </span>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5">Item</th>
                <th className="px-2 py-1.5">Dosage</th>
                <th className="px-2 py-1.5">Frequency</th>
                <th className="px-2 py-1.5">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, i) => (
                <tr key={item.prescription_item_id || i}>
                  <td className="px-2 py-1.5 font-medium">{item.item_name}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {item.dosage || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {item.frequency || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {item.duration || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rx.rendered_html ? (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white py-2">
            <PrescriptionPrintDocument html={rx.rendered_html} />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={downloading}
              onClick={handleDownload}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Printable document is not available for this record.
        </p>
      )}
    </div>
  );
}

export function MedicalHistoryPrescriptionBlock({
  prescription: embedded,
  prescriptionId,
  appointmentId,
  workflowLogId,
  logCreatedAt,
  headerTitle,
  itemsSummary,
}: Props) {
  const { data: byId, isLoading: loadingById } = useGetPrescriptionQuery(
    prescriptionId!,
    { skip: Boolean(embedded) || !prescriptionId }
  );
  const { data: list = [], isLoading: loadingList } = useListPrescriptionsQuery(
    { appointment_id: appointmentId! },
    { skip: Boolean(embedded) || !appointmentId }
  );

  const rx = useMemo(() => {
    if (embedded) return embedded;
    if (byId) return byId;
    return resolveFromList(list, {
      prescriptionId,
      workflowLogId,
      logCreatedAt,
      headerTitle,
    });
  }, [
    embedded,
    byId,
    list,
    prescriptionId,
    workflowLogId,
    logCreatedAt,
    headerTitle,
  ]);

  const isLoading = !embedded && (prescriptionId ? loadingById : loadingList);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading prescription…</p>;
  }

  if (rx) {
    return <PrescriptionDetail rx={rx} />;
  }

  if (itemsSummary) {
    return (
      <div className="rounded-lg border border-border bg-background p-3 text-sm">
        <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Prescription items
        </p>
        <p>{itemsSummary}</p>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Prescription record could not be loaded.
    </p>
  );
}
