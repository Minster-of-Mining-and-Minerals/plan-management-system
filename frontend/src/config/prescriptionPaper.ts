/** Prescription paper formats (mm). Default: A5 — common clinical prescription pad size. */
export type PrescriptionPaperFormat = "a5" | "half-a4" | "compact";

export type PrescriptionPaperSpec = {
  widthMm: number;
  heightMm: number;
  /** Fixed layout width for html2canvas (96dpi approximation). */
  widthPx: number;
};

export const PRESCRIPTION_PAPER: Record<PrescriptionPaperFormat, PrescriptionPaperSpec> =
  {
    /** Standard prescription pad (148 × 210 mm). */
    a5: { widthMm: 148, heightMm: 210, widthPx: 560 },
    /** Half A4 width, same height as A5 — common clinic layout. */
    "half-a4": { widthMm: 148, heightMm: 210, widthPx: 560 },
    /** Compact card (≈ A6). */
    compact: { widthMm: 105, heightMm: 148, widthPx: 397 },
  };

export const DEFAULT_PRESCRIPTION_PAPER_FORMAT: PrescriptionPaperFormat = "a5";

export function getPrescriptionPaper(
  format: PrescriptionPaperFormat = DEFAULT_PRESCRIPTION_PAPER_FORMAT
): PrescriptionPaperSpec {
  return PRESCRIPTION_PAPER[format];
}

/** Content height in mm for a given canvas aspect ratio. */
export function prescriptionContentHeightMm(
  canvasWidthPx: number,
  canvasHeightPx: number,
  pageWidthMm: number
): number {
  if (canvasWidthPx <= 0) return pageWidthMm * 1.2;
  return (canvasHeightPx / canvasWidthPx) * pageWidthMm;
}
