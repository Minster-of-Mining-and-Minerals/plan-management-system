"use client";

import { PRESCRIPTION_PRINT_CSS } from "./prescriptionPrintStyles";

type Props = {
  html: string;
  className?: string;
};

export function PrescriptionPrintDocument({ html, className }: Props) {
  return (
    <div className={className}>
      <style dangerouslySetInnerHTML={{ __html: PRESCRIPTION_PRINT_CSS }} />
      <div
        data-prescription-root
        className="bg-white shadow-sm print:shadow-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
