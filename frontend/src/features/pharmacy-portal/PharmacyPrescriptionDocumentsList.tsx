"use client";

import { useState } from "react";
import { ChevronDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { PharmacyPrescription } from "@/redux/types/pharmacy";
import { PrescriptionDocumentViewer } from "@/features/prescription-workflow/PrescriptionDocumentViewer";
import { printPharmacyPrescriptionDocument } from "./pharmacyPrescriptionPrint";

type Props = {
  prescriptions: PharmacyPrescription[];
  activeId?: string;
};

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PrescriptionDocumentEntry({
  rx,
  defaultOpen,
  index,
}: {
  rx: PharmacyPrescription;
  defaultOpen?: boolean;
  index: number;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const title = rx.source_header_title?.trim() || `Prescription #${index + 1}`;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-start gap-2 p-3 text-left transition-colors",
              open ? "bg-muted/40" : "hover:bg-muted/30"
            )}
          >
            <ChevronDown
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Received {formatTime(rx.received_at || rx.sent_at)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(rx.items?.length ?? 0)} medication
                {(rx.items?.length ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 border-t border-border px-3 py-3">
            {rx.source_rendered_html ? (
              <>
                <PrescriptionDocumentViewer html={rx.source_rendered_html} />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => printPharmacyPrescriptionDocument(rx)}
                  >
                    <Printer className="mr-1.5 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Printable document is not available.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function PharmacyPrescriptionDocumentsList({
  prescriptions,
  activeId,
}: Props) {
  const withDocuments = prescriptions.filter((rx) => rx.source_rendered_html);

  if (withDocuments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No prescription documents available.
      </p>
    );
  }

  if (withDocuments.length === 1) {
    const rx = withDocuments[0];
    return (
      <div className="space-y-3">
        <PrescriptionDocumentViewer html={rx.source_rendered_html!} />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => printPharmacyPrescriptionDocument(rx)}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {withDocuments.map((rx, index) => (
        <li key={rx.pharmacy_prescription_id}>
          <PrescriptionDocumentEntry
            rx={rx}
            index={index}
            defaultOpen={
              activeId
                ? rx.pharmacy_prescription_id === activeId
                : index === 0
            }
          />
        </li>
      ))}
    </ul>
  );
}
