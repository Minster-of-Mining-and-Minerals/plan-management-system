/** A4 certificate export dimensions (mm). */
export type CertificatePaperSpec = {
  widthMm: number;
  heightMm: number;
  widthPx: number;
};

export const CERTIFICATE_PAPER_A4: CertificatePaperSpec = {
  widthMm: 210,
  heightMm: 297,
  widthPx: 794,
};

export function certificateContentHeightMm(
  canvasWidthPx: number,
  canvasHeightPx: number,
  pageWidthMm: number
): number {
  if (canvasWidthPx <= 0) return pageWidthMm * 1.2;
  return (canvasHeightPx / canvasWidthPx) * pageWidthMm;
}
