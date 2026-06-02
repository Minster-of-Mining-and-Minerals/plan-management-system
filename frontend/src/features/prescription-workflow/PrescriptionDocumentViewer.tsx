"use client";

import { cn } from "@/lib/utils";
import { PrescriptionPrintDocument } from "./PrescriptionPrintDocument";
import { PRESCRIPTION_VIEWPORT_CSS } from "./prescriptionPrintStyles";

type Props = {
  html: string;
  className?: string;
  /** Scrollable max height for detail panels (default on). */
  constrainHeight?: boolean;
};

/**
 * On-screen prescription preview — same A5 layout as admin workflow / PDF export.
 */
export function PrescriptionDocumentViewer({
  html,
  className,
  constrainHeight = true,
}: Props) {
  return (
    <div
      data-prescription-viewport
      className={cn(
        "overflow-x-auto rounded-lg border bg-white py-2",
        constrainHeight && "max-h-[min(70vh,210mm)] overflow-y-auto",
        className
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: PRESCRIPTION_VIEWPORT_CSS }} />
      <PrescriptionPrintDocument html={html} exportLayout />
    </div>
  );
}
