"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface PatientBarcodeProps {
  value: string;
  className?: string;
}

export function PatientBarcode({ value, className }: PatientBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 1.5,
        height: 48,
        displayValue: false,
        margin: 4,
      });
    } catch {
      svgRef.current.innerHTML = "";
    }
  }, [value]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={className}
      role="img"
      aria-label="Patient barcode"
      preserveAspectRatio="xMidYMid meet"
    />
  );
}
