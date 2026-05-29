"use client";

import { cn } from "@/lib/utils";
import { getPrescriptionPaper } from "@/config/prescriptionPaper";
import { PRESCRIPTION_PRINT_CSS } from "./prescriptionPrintStyles";

type Props = {
  html: string;
  className?: string;
  /** Fixed width for consistent PDF capture (A5). */
  exportLayout?: boolean;
};

export function PrescriptionPrintDocument({
  html,
  className,
  exportLayout = true,
}: Props) {
  const paper = getPrescriptionPaper();

  return (
    <div
      className={cn(
        "bg-white",
        exportLayout && "mx-auto",
        className
      )}
      data-prescription-export={exportLayout ? "true" : undefined}
      style={
        exportLayout ?
          { width: paper.widthPx, maxWidth: paper.widthPx }
        : undefined
      }
    >
      <style dangerouslySetInnerHTML={{ __html: PRESCRIPTION_PRINT_CSS }} />
      <div
        data-prescription-root
        className="bg-white print:shadow-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
