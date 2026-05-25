"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrandingName } from "@/components/common/BrandingLogo";
import { useBranding } from "@/providers/BrandingProvider";
import { PLATFORM_LOGO_URL } from "@/config/platformBranding";
import type { PatientRecord } from "@/redux/api/patientApi";
import { getPatientSlipData } from "@/lib/patientDisplay";
import {
  buildSlipPdfFilename,
  downloadSlipAsPdf,
} from "@/lib/downloadSlipPdf";
import { PatientBarcode } from "./PatientBarcode";
import { SlipDecorBar } from "./SlipDecorBar";
import { SLIP_DISPLAY_WIDTH_PX } from "@/config/slipPaper";

interface PatientIdentificationSlipProps {
  patient: PatientRecord;
}

type SlipRow = {
  labelAm: string;
  labelEn: string;
  value: string;
};

function SlipFieldBlock({
  labelAm,
  labelEn,
  value,
  align = "left",
}: SlipRow & { align?: "left" | "right" }) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-[11px] leading-snug ${align === "right" ? "text-right" : ""
        }`}
    >
      {align === "left" ? (
        <>
          <span className="text-muted-foreground">
            {labelAm}{" "}
            <span className="text-[10px]">({labelEn})</span>
          </span>
          <span className="font-bold text-foreground whitespace-nowrap">
            {value}
          </span>
        </>
      ) : (
        <>
          <span className="font-semibold text-foreground col-span-2">
            {labelEn}
          </span>
          <span className="font-bold text-foreground col-span-2">{value}</span>
        </>
      )}
    </div>
  );
}

export function PatientIdentificationSlip({
  patient,
}: PatientIdentificationSlipProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { branding } = useBranding();
  const slip = getPatientSlipData(patient);
  const logoSrc = branding.logo_url || PLATFORM_LOGO_URL;
  const barcodeValue =
    slip.barcode && slip.barcode !== "—"
      ? slip.barcode
      : slip.registrationNo !== "—"
        ? slip.registrationNo
        : "";

  const leftRows: SlipRow[] = [
    {
      labelAm: "የምዝገባ ቁጥር",
      labelEn: "Registration No.",
      value: slip.registrationNo,
    },
    { labelAm: "ሙሉ ስም", labelEn: "Full Name", value: slip.fullName },
    {
      labelAm: "የትውልድ ቦታ",
      labelEn: "Place of Birth",
      value: slip.placeOfBirth,
    },
    {
      labelAm: "የትውልድ ቀን",
      labelEn: "Date of Birth",
      value: slip.dateOfBirth,
    },
    { labelAm: "ጾታ", labelEn: "Sex", value: slip.sex },
    { labelAm: "ክፍለ ከተማ", labelEn: "Sub City", value: slip.subCity },
    { labelAm: "ወረዳ", labelEn: "Woreda", value: slip.woreda },
    { labelAm: "የቤት ቁጥር", labelEn: "House No.", value: slip.houseNo },
    { labelAm: "ስልክ ቁጥር", labelEn: "Phone No.", value: slip.phone },
  ];

  const rightRows: SlipRow[] = [
    { labelAm: "", labelEn: "Full Name", value: slip.fullName },
    { labelAm: "", labelEn: "Place of Birth", value: slip.placeOfBirth },
    { labelAm: "", labelEn: "Date of Birth", value: slip.dateOfBirth },
    { labelAm: "", labelEn: "Sex", value: slip.sex },
    { labelAm: "", labelEn: "Sub City", value: slip.subCity },
    { labelAm: "", labelEn: "Woreda", value: slip.woreda },
  ];

  const handleDownloadPdf = async () => {
    if (!slipRef.current) return;
    setDownloading(true);
    try {
      await downloadSlipAsPdf(
        slipRef.current,
        buildSlipPdfFilename(slip.registrationNo, patient.full_name)
      );
      toast.success("Patient slip downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-2">


      <div
        ref={slipRef}
        data-slip-root
        style={{ width: SLIP_DISPLAY_WIDTH_PX, maxWidth: "100%" }}
        className="mx-auto rounded-lg border bg-white shadow-sm overflow-hidden print:shadow-none"
      >
        <SlipDecorBar position="top" />

        <div className="px-5 py-4">
          <div className="border-b border-slate-200 pb-4 mb-4">
            <div className="flex w-full flex-col gap-4 items-center justify-center">
              <div
                data-slip-logo
                className="shrink-0 flex items-center justify-center w-[72px] h-[72px]"
              >
                {/* Native img — html2canvas captures reliably (Next/Image clips in PDF). */}
                <img
                  src={logoSrc}
                  alt={branding.system_name}
                  width={72}
                  height={72}
                  className="object-contain w-[72px] h-[72px]"
                  crossOrigin={
                    logoSrc.startsWith("http") ? "anonymous" : undefined
                  }
                />
              </div>
              <div className="flex flex-col w-full items-center justify-center border-t border-slate-200 pt-4">
                {branding.system_name_am && (
                  <p className="text-sm font-semibold text-primary leading-tight mb-1">
                    {branding.system_name_am}
                  </p>
                )}
                <BrandingName className="text-sm font-bold text-primary leading-snug block" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200">
            <div className="space-y-2 pr-3">
              {leftRows.map((row) => (
                <SlipFieldBlock
                  key={`${row.labelEn}-am`}
                  {...row}
                  align="left"
                />
              ))}
            </div>

            <div className="space-y-2 pl-3 flex flex-col">
              <div className="space-y-2 flex-1">
                {rightRows.map((row) => (
                  <SlipFieldBlock
                    key={`${row.labelEn}-en`}
                    {...row}
                    align="right"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-center justify-center pt-4 mt-4 border-t border-slate-200 min-h-[56px]">
            {barcodeValue ? (
              <PatientBarcode
                value={barcodeValue}
                className="h-14 w-full max-w-[280px]"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                No barcode available
              </p>
            )}
          </div>
        </div>

        <SlipDecorBar position="bottom" />
      </div>
      <div className="flex items-center justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={downloading}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {downloading ? "Generating…" : "Download PDF"}
        </Button>
      </div>
    </div>
  );
}
