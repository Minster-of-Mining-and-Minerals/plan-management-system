import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  DEFAULT_PRESCRIPTION_PAPER_FORMAT,
  getPrescriptionPaper,
  prescriptionContentHeightMm,
  type PrescriptionPaperFormat,
} from "@/config/prescriptionPaper";
import { PRESCRIPTION_PRINT_CSS } from "@/features/prescription-workflow/prescriptionPrintStyles";

export type DownloadPrescriptionPdfOptions = {
  format?: PrescriptionPaperFormat;
  scale?: number;
};

const CAPTURE_SCALE_DEFAULT = 2;
const RENDER_SETTLE_MS = 200;
const CAPTURE_HOST_ID = "prescription-pdf-capture-host";

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) return Promise.resolve();

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const el = img as HTMLImageElement;
          const src = el.getAttribute("src");
          if (!src) {
            resolve();
            return;
          }
          if (el.complete && el.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          el.addEventListener("load", done, { once: true });
          el.addEventListener("error", done, { once: true });
          if (!el.complete) {
            el.src = src;
          }
        })
    )
  ).then(() => undefined);
}

function isCanvasMostlyBlank(canvas: HTMLCanvasElement): boolean {
  if (canvas.width < 20 || canvas.height < 20) return true;
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const samples = 12;
  let nonWhite = 0;
  for (let gy = 0; gy < samples; gy++) {
    for (let gx = 0; gx < samples; gx++) {
      const x = Math.min(
        canvas.width - 1,
        Math.floor(((gx + 0.5) * canvas.width) / samples)
      );
      const y = Math.min(
        canvas.height - 1,
        Math.floor(((gy + 0.5) * canvas.height) / samples)
      );
      const { data } = ctx.getImageData(x, y, 1, 1);
      const [r, g, b, a] = data;
      if (a > 12 && (r < 248 || g < 248 || b < 248)) nonWhite++;
    }
  }
  return nonWhite < 3;
}

function preparePrescriptionClone(doc: Document, widthPx: number): void {
  const exportWrap = doc.querySelector(
    "[data-prescription-export]"
  ) as HTMLElement | null;
  const root = doc.querySelector(
    "[data-prescription-root]"
  ) as HTMLElement | null;
  const target = exportWrap || root;
  if (!target) return;

  if (exportWrap) {
    exportWrap.style.width = `${widthPx}px`;
    exportWrap.style.maxWidth = `${widthPx}px`;
    exportWrap.style.boxSizing = "border-box";
    exportWrap.style.background = "#ffffff";
    exportWrap.style.boxShadow = "none";
    exportWrap.style.overflow = "visible";
  }

  if (root) {
    root.style.background = "#ffffff";
    root.style.color = "#111111";
    root.style.boxShadow = "none";
    root.style.overflow = "visible";
  }

  doc.querySelectorAll("img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.style.display = "block";
    el.style.objectFit = "contain";
    if (el.classList.contains("rx-logo")) {
      el.style.maxHeight = "48px";
      el.style.maxWidth = "120px";
      el.style.width = "auto";
      el.style.height = "auto";
    } else if (el.classList.contains("rx-signature-image")) {
      el.style.maxHeight = "48px";
      el.style.maxWidth = "160px";
      el.style.width = "auto";
      el.style.height = "auto";
    } else {
      el.style.maxWidth = "100%";
      el.style.height = "auto";
    }
  });

  doc.querySelectorAll("span").forEach((span) => {
    if (!span.querySelector("img")) return;
    span.style.overflow = "visible";
    span.style.display = "block";
    span.style.width = "auto";
    span.style.height = "auto";
    span.style.maxWidth = "none";
  });
}

function resolveCaptureSource(container: HTMLElement): HTMLElement {
  const exportEl = container.matches("[data-prescription-export]")
    ? container
    : container.querySelector("[data-prescription-export]");
  if (exportEl instanceof HTMLElement) return exportEl;

  const root = container.matches("[data-prescription-root]")
    ? container
    : container.querySelector("[data-prescription-root]");
  if (root instanceof HTMLElement) return root;

  throw new Error("Prescription content not found for export");
}

function canvasToPng(canvas: HTMLCanvasElement): string {
  try {
    return canvas.toDataURL("image/png");
  } catch {
    throw new Error(
      "Could not encode prescription PDF (blocked images). Try again or re-issue the prescription."
    );
  }
}

function buildOffScreenCaptureTree(
  source: HTMLElement,
  widthPx: number
): { host: HTMLElement; captureTarget: HTMLElement } {
  document.getElementById(CAPTURE_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = CAPTURE_HOST_ID;
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-12000px",
    "top:0",
    `width:${widthPx}px`,
    "z-index:-1",
    "pointer-events:none",
    "overflow:visible",
    "background:#ffffff",
  ].join(";");

  const style = document.createElement("style");
  style.textContent = PRESCRIPTION_PRINT_CSS;
  host.appendChild(style);

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${widthPx}px`;
  clone.style.maxWidth = `${widthPx}px`;
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";
  host.appendChild(clone);

  document.body.appendChild(host);

  return { host, captureTarget: host };
}

/** Build capture tree from stored HTML (no visible DOM required). */
function buildOffScreenCaptureFromHtml(
  html: string,
  widthPx: number
): { host: HTMLElement; captureTarget: HTMLElement } {
  document.getElementById(CAPTURE_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = CAPTURE_HOST_ID;
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-12000px",
    "top:0",
    `width:${widthPx}px`,
    "z-index:-1",
    "pointer-events:none",
    "overflow:visible",
    "background:#ffffff",
  ].join(";");

  const style = document.createElement("style");
  style.textContent = PRESCRIPTION_PRINT_CSS;
  host.appendChild(style);

  const exportWrap = document.createElement("div");
  exportWrap.setAttribute("data-prescription-export", "true");
  exportWrap.style.width = `${widthPx}px`;
  exportWrap.style.maxWidth = `${widthPx}px`;
  exportWrap.style.background = "#ffffff";

  const root = document.createElement("div");
  root.setAttribute("data-prescription-root", "true");
  root.className = "bg-white";
  root.innerHTML = html;
  exportWrap.appendChild(root);
  host.appendChild(exportWrap);
  document.body.appendChild(host);

  return { host, captureTarget: host };
}

async function renderToCanvas(
  element: HTMLElement,
  widthPx: number,
  scale: number,
  allowTaint: boolean
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale,
    useCORS: !allowTaint,
    allowTaint,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
    onclone: (doc) => preparePrescriptionClone(doc, widthPx),
  });
}

async function captureFromHost(
  host: HTMLElement,
  captureTarget: HTMLElement,
  widthPx: number,
  scale: number
): Promise<HTMLCanvasElement> {

  try {
    await waitForImages(host);
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    );
    await new Promise((r) => setTimeout(r, RENDER_SETTLE_MS));

    let canvas = await renderToCanvas(captureTarget, widthPx, scale, false);

    if (isCanvasMostlyBlank(canvas)) {
      canvas = await renderToCanvas(captureTarget, widthPx, scale, true);
    }

    if (isCanvasMostlyBlank(canvas)) {
      throw new Error(
        "Could not render prescription content. Check that the preview is visible and try again."
      );
    }

    return canvas;
  } finally {
    host.remove();
  }
}

async function capturePrescriptionCanvas(
  source: HTMLElement,
  widthPx: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const { host, captureTarget } = buildOffScreenCaptureTree(source, widthPx);
  return captureFromHost(host, captureTarget, widthPx, scale);
}

async function capturePrescriptionHtml(
  html: string,
  widthPx: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const { host, captureTarget } = buildOffScreenCaptureFromHtml(html, widthPx);
  return captureFromHost(host, captureTarget, widthPx, scale);
}

function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  pageWidthMm: number,
  pageHeightMm: number
): void {
  const totalHeightMm = prescriptionContentHeightMm(
    canvas.width,
    canvas.height,
    pageWidthMm
  );

  if (totalHeightMm <= pageHeightMm + 0.5) {
    const imgData = canvasToPng(canvas);
    const drawHeight = Math.max(totalHeightMm, 40);
    pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, drawHeight);
    return;
  }

  const pageHeightPx = Math.floor(
    (pageHeightMm / pageWidthMm) * canvas.width
  );
  let srcY = 0;
  let pageIndex = 0;

  while (srcY < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - srcY);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      srcY,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx
    );

    const sliceHeightMm = (sliceHeightPx / canvas.width) * pageWidthMm;

    if (pageIndex > 0) {
      pdf.addPage([pageWidthMm, pageHeightMm], "p");
    }

    pdf.addImage(
      canvasToPng(sliceCanvas),
      "PNG",
      0,
      0,
      pageWidthMm,
      sliceHeightMm
    );

    srcY += sliceHeightPx;
    pageIndex += 1;
  }
}

export async function downloadPrescriptionPdf(
  element: HTMLElement,
  filename = "prescription.pdf",
  options: DownloadPrescriptionPdfOptions = {}
): Promise<void> {
  const source = resolveCaptureSource(element);
  const format = options.format ?? DEFAULT_PRESCRIPTION_PAPER_FORMAT;
  const paper = getPrescriptionPaper(format);
  const scale = options.scale ?? CAPTURE_SCALE_DEFAULT;

  const canvas = await capturePrescriptionCanvas(
    source,
    paper.widthPx,
    scale
  );

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [paper.widthMm, paper.heightMm],
  });

  addCanvasToPdf(pdf, canvas, paper.widthMm, paper.heightMm);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export async function exportPrescriptionFromContainer(
  container: HTMLElement | null | undefined,
  filename: string,
  options?: DownloadPrescriptionPdfOptions
): Promise<void> {
  if (!container) {
    throw new Error("Prescription preview is not ready");
  }
  await downloadPrescriptionPdf(container, filename, options);
}

/** Export from server-rendered HTML (preferred — does not touch on-screen layout). */
export async function exportPrescriptionHtml(
  html: string,
  filename: string,
  options?: DownloadPrescriptionPdfOptions
): Promise<void> {
  if (!html?.trim()) {
    throw new Error("Prescription document is empty");
  }

  const format = options?.format ?? DEFAULT_PRESCRIPTION_PAPER_FORMAT;
  const paper = getPrescriptionPaper(format);
  const scale = options?.scale ?? CAPTURE_SCALE_DEFAULT;

  const canvas = await capturePrescriptionHtml(html, paper.widthPx, scale);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [paper.widthMm, paper.heightMm],
  });

  addCanvasToPdf(pdf, canvas, paper.widthMm, paper.heightMm);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function buildPrescriptionPdfFilename(title: string): string {
  const safe = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `${safe || "prescription"}.pdf`;
}
