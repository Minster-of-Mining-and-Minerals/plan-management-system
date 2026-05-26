"use client";

import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PLATFORM_LOGO_URL } from "@/config/platformBranding";
import type { PatientRecord } from "@/redux/api/patientApi";
import { useGetPatientSlipConfigQuery } from "@/redux/api/patientSlipApi";
import type { PatientSlipConfig } from "@/redux/types/patientSlipConfig";
import { useBranding } from "@/providers/BrandingProvider";
import { flattenFormFields, type FormField } from "@/redux/types/formField";
import { useGetUserFormConfigQuery } from "@/redux/api/formFieldApi";
import {
  buildSlipRows,
  resolveSlipBarcode,
  resolveSlipHeader,
} from "@/lib/patientSlipResolve";
import {
  buildSlipPdfFilename,
  downloadSlipAsPdf,
} from "@/lib/downloadSlipPdf";
import { PatientBarcode } from "./PatientBarcode";
import { SlipDecorBar } from "./SlipDecorBar";
import { SLIP_DISPLAY_WIDTH_PX } from "@/config/slipPaper";

interface PatientIdentificationSlipProps {
  patient: PatientRecord;
  /** Draft config for live preview on the configuration page */
  configOverride?: PatientSlipConfig;
}

type SlipRow = {
  labelAm: string;
  labelEn: string;
  value: string;
};

function SlipLabelText({
  labelAm,
  labelEn,
  variant,
}: Pick<SlipRow, "labelAm" | "labelEn"> & {
  variant: "left" | "right";
}) {
  const bilingual = Boolean(labelAm?.trim());
  const isRight = variant === "right";

  if (!bilingual) {
    return <>{labelEn}</>;
  }

  if (isRight) {
    return (
      <>
        {labelEn}{" "}
        <span className="text-[10px]">({labelAm})</span>
      </>
    );
  }

  return (
    <>
      {labelAm}{" "}
      {labelEn ? <span className="text-[10px]">({labelEn})</span> : null}
    </>
  );
}

function SlipFieldBlock({
  labelAm,
  labelEn,
  value,
  align = "left",
}: SlipRow & { align?: "left" | "right" }) {
  const variant = align === "right" ? "right" : "left";

  return (
    <div className="flex w-full items-start justify-between gap-3 text-[11px] leading-snug">
      <span className="text-muted-foreground min-w-0 flex-1 leading-snug">
        <SlipLabelText labelAm={labelAm} labelEn={labelEn} variant={variant} />
      </span>
      <span className="font-bold text-foreground shrink-0 text-right max-w-[45%] leading-snug">
        {value}
      </span>
    </div>
  );
}

function SlipFieldsBody({
  layout,
  leftRows,
  rightRows,
}: {
  layout: "columns" | "rows";
  leftRows: SlipRow[];
  rightRows: SlipRow[];
}) {
  if (layout === "rows") {
    return (
      <div className="w-full space-y-4">
        <div className="w-full space-y-2">
          {leftRows.map((row) => (
            <SlipFieldBlock
              key={`${row.labelEn}-top`}
              {...row}
              align="left"
            />
          ))}
        </div>
        {leftRows.length > 0 && rightRows.length > 0 ? (
          <div
            className="border-t border-slate-300"
            role="separator"
            aria-hidden
          />
        ) : null}
        <div className="w-full space-y-2">
          {rightRows.map((row) => (
            <SlipFieldBlock
              key={`${row.labelEn}-bottom`}
              {...row}
              align="right"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200">
      <div className="w-full min-w-0 space-y-2 pr-3">
        {leftRows.map((row) => (
          <SlipFieldBlock
            key={`${row.labelEn}-am`}
            {...row}
            align="left"
          />
        ))}
      </div>
      <div className="w-full min-w-0 space-y-2 pl-3">
        {rightRows.map((row) => (
          <SlipFieldBlock
            key={`${row.labelEn}-en`}
            {...row}
            align="right"
          />
        ))}
      </div>
    </div>
  );
}

export function PatientIdentificationSlip({
  patient,
  configOverride,
}: PatientIdentificationSlipProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { branding } = useBranding();
  const { data: slipConfigData } = useGetPatientSlipConfigQuery();
  const { data: formConfig } = useGetUserFormConfigQuery();

  const slipConfig = configOverride ?? slipConfigData?.slip_config;
  const fieldByKey = useMemo(() => {
    const map = new Map<string, FormField>();
    if (!formConfig) return map;
    for (const f of flattenFormFields(formConfig)) {
      map.set(f.field_key, f);
    }
    return map;
  }, [formConfig]);

  const header = slipConfig
    ? resolveSlipHeader(slipConfig, branding)
    : {
        logoUrl: branding.logo_url || PLATFORM_LOGO_URL,
        titleAm: branding.system_name_am,
        titleEn: branding.system_name,
        logoWidth: 72,
        logoHeight: 72,
      };

  const leftRows = slipConfig
    ? buildSlipRows(patient, slipConfig.left_columns, fieldByKey)
    : [];
  const rightRows = slipConfig
    ? buildSlipRows(patient, slipConfig.right_columns, fieldByKey)
    : [];

  const barcodeValue = slipConfig
    ? resolveSlipBarcode(patient, slipConfig, fieldByKey)
    : patient.profile?.barcode ?? patient.profile?.patient_code ?? "";

  const registrationNo =
    patient.profile?.patient_code ?? patient.full_name ?? "patient";

  const handleDownloadPdf = async () => {
    if (!slipRef.current) return;
    setDownloading(true);
    try {
      await downloadSlipAsPdf(
        slipRef.current,
        buildSlipPdfFilename(registrationNo, patient.full_name)
      );
      toast.success("Patient slip downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!slipConfig) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Loading slip layout…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={slipRef}
        data-slip-root
        style={{ width: SLIP_DISPLAY_WIDTH_PX, maxWidth: "100%" }}
        className="mx-auto rounded-lg border bg-white shadow-sm overflow-hidden print:shadow-none"
      >
        <SlipDecorBar position="top" config={slipConfig.decor.top} />

        <div className="px-5 py-4">
          <div className="border-b border-slate-200 pb-4 mb-4">
            <div className="flex w-full flex-col gap-4 items-center justify-center">
              <div
                data-slip-logo
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: header.logoWidth,
                  height: header.logoHeight,
                }}
              >
                <img
                  src={header.logoUrl || PLATFORM_LOGO_URL}
                  alt={header.titleEn || "Hospital"}
                  width={header.logoWidth}
                  height={header.logoHeight}
                  className="object-contain"
                  style={{
                    width: header.logoWidth,
                    height: header.logoHeight,
                  }}
                  crossOrigin={
                    (header.logoUrl || "").startsWith("http")
                      ? "anonymous"
                      : undefined
                  }
                />
              </div>
              <div className="flex flex-col w-full items-center justify-center border-t border-slate-200 pt-4 text-center">
                {header.titleAm ? (
                  <p className="text-sm font-semibold text-primary leading-tight mb-1">
                    {header.titleAm}
                  </p>
                ) : null}
                {header.titleEn ? (
                  <p className="text-sm font-bold text-primary leading-snug">
                    {header.titleEn}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <SlipFieldsBody
            layout={slipConfig.layout === "rows" ? "rows" : "columns"}
            leftRows={leftRows}
            rightRows={rightRows}
          />

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

        <SlipDecorBar position="bottom" config={slipConfig.decor.bottom} />
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
