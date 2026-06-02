import { toast } from "sonner";
import { exportPrescriptionHtml } from "@/lib/downloadPrescriptionPdf";

type PrintableRx = {
  source_rendered_html?: string | null;
  pharmacy_prescription_id: string;
  source_header_title?: string | null;
};

export function printPharmacyPrescriptionDocument(rx: PrintableRx) {
  if (!rx.source_rendered_html) {
    toast.error("No printable document available");
    return false;
  }
  const slug =
    (rx.source_header_title || "prescription")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .slice(0, 40) || "prescription";
  exportPrescriptionHtml(
    rx.source_rendered_html,
    `pharmacy-rx-${slug}-${rx.pharmacy_prescription_id.slice(0, 8)}`
  );
  return true;
}
