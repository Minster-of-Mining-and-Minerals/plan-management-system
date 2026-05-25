/** On-screen slip width (px) — narrow phone / ticket proportions. */
export const SLIP_DISPLAY_WIDTH_PX = 360;

/** Custom print paper width (mm) for patient identification slips. */
export const SLIP_PAPER_WIDTH_MM = 72;

export function slipPaperHeightMm(contentWidthPx: number, contentHeightPx: number): number {
  if (contentWidthPx <= 0) return SLIP_PAPER_WIDTH_MM * 1.5;
  return (contentHeightPx / contentWidthPx) * SLIP_PAPER_WIDTH_MM;
}
