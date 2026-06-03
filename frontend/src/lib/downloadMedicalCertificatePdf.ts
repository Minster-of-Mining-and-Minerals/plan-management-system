import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  CERTIFICATE_PAPER_A4,
  certificateContentHeightMm,
} from "@/config/certificatePaper";
import { MEDICAL_CERTIFICATE_PRINT_CSS } from "@/features/medical-certificate/certificatePrintStyles";

const CAPTURE_SCALE_DEFAULT = 2;
const RENDER_SETTLE_MS = 200;
const CAPTURE_HOST_ID = "medical-certificate-pdf-capture-host";

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) return Promise.resolve();

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const el = img as HTMLImageElement;
          const src = el.getAttribute("src");
          if (!src || (el.complete && el.naturalWidth > 0)) {
            resolve();
            return;
          }
          const done = () => resolve();
          el.addEventListener("load", done, { once: true });
          el.addEventListener("error", done, { once: true });
        })
    )
  ).then(() => undefined);
}

function prepareCertificateClone(doc: Document, widthPx: number): void {
  const exportWrap = doc.querySelector(
    "[data-certificate-export]"
  ) as HTMLElement | null;
  const root = doc.querySelector("[data-certificate-root]") as HTMLElement | null;
  const target = exportWrap || root;
  if (!target) return;

  if (exportWrap) {
    exportWrap.style.width = `${widthPx}px`;
    exportWrap.style.maxWidth = `${widthPx}px`;
    exportWrap.style.background = "#ffffff";
    exportWrap.style.overflow = "visible";
  }

  doc.querySelectorAll("img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.style.objectFit = "contain";
    if (el.classList.contains("mc-logo")) {
      el.style.maxHeight = "52px";
      el.style.maxWidth = "140px";
    } else if (
      el.classList.contains("mc-signature-image") ||
      el.classList.contains("mc-stamp-image")
    ) {
      el.style.maxHeight = "56px";
      el.style.maxWidth = "180px";
    }
  });
}

async function renderToCanvas(
  element: HTMLElement,
  widthPx: number,
  scale: number
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (doc) => prepareCertificateClone(doc, widthPx),
  });
}

function buildCaptureFromHtml(html: string, widthPx: number) {
  document.getElementById(CAPTURE_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = CAPTURE_HOST_ID;
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;z-index:-1;background:#fff;overflow:visible;";

  const style = document.createElement("style");
  style.textContent = MEDICAL_CERTIFICATE_PRINT_CSS;
  host.appendChild(style);

  const wrap = document.createElement("div");
  wrap.setAttribute("data-certificate-export", "true");
  wrap.style.width = `${widthPx}px`;
  wrap.innerHTML = html.startsWith("<div")
    ? html
    : `<div data-certificate-root class="mc-document">${html}</div>`;
  host.appendChild(wrap);
  document.body.appendChild(host);

  return { host, captureTarget: host };
}

function canvasToPng(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  pageWidthMm: number,
  pageHeightMm: number
): void {
  const totalHeightMm = certificateContentHeightMm(
    canvas.width,
    canvas.height,
    pageWidthMm
  );

  if (totalHeightMm <= pageHeightMm + 0.5) {
    pdf.addImage(
      canvasToPng(canvas),
      "PNG",
      0,
      0,
      pageWidthMm,
      Math.max(totalHeightMm, 40)
    );
    return;
  }

  const pageHeightPx = Math.floor((pageHeightMm / pageWidthMm) * canvas.width);
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

export async function exportMedicalCertificateHtml(
  html: string,
  filename: string
): Promise<void> {
  if (!html?.trim()) {
    throw new Error("Certificate document is empty");
  }

  const paper = CERTIFICATE_PAPER_A4;
  const { host, captureTarget } = buildCaptureFromHtml(html, paper.widthPx);

  try {
    await waitForImages(host);
    await new Promise((r) => setTimeout(r, RENDER_SETTLE_MS));
    const canvas = await renderToCanvas(captureTarget, paper.widthPx, CAPTURE_SCALE_DEFAULT);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [paper.widthMm, paper.heightMm],
    });

    addCanvasToPdf(pdf, canvas, paper.widthMm, paper.heightMm);
    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    host.remove();
  }
}

export function buildMedicalCertificatePdfFilename(number: string): string {
  const safe = number.replace(/[^\w-]+/g, "-").slice(0, 48);
  return `medical-certificate-${safe || "export"}.pdf`;
}
