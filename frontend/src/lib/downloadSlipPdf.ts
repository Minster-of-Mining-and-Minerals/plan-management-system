import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  SLIP_DISPLAY_WIDTH_PX,
  SLIP_PAPER_WIDTH_MM,
  slipPaperHeightMm,
} from "@/config/slipPaper";

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })
    )
  ).then(() => undefined);
}

/** Fix Next.js Image wrappers and sizing so html2canvas captures full content. */
function prepareSlipClone(doc: Document): void {
  const cloned = doc.querySelector("[data-slip-root]") as HTMLElement | null;
  if (!cloned) return;

  cloned.style.boxShadow = "none";
  cloned.style.overflow = "visible";

  cloned.querySelectorAll("img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.style.display = "block";
    el.style.maxWidth = "100%";
    el.style.height = "auto";
    el.style.objectFit = "contain";

    const box = el.closest("[data-slip-logo]");
    if (box instanceof HTMLElement) {
      box.style.overflow = "visible";
      box.style.width = "72px";
      box.style.height = "72px";
      box.style.display = "flex";
      box.style.alignItems = "center";
      box.style.justifyContent = "center";
    }
  });

  // Next.js <Image> wraps img in a sized span — unwrap clipping.
  cloned.querySelectorAll("span").forEach((span) => {
    if (!span.querySelector("img")) return;
    span.style.overflow = "visible";
    span.style.display = "block";
    span.style.width = "auto";
    span.style.height = "auto";
    span.style.maxWidth = "none";
  });
}

export async function downloadSlipAsPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  await waitForImages(element);
  await new Promise((resolve) => setTimeout(resolve, 100));

  const widthPx = element.offsetWidth || SLIP_DISPLAY_WIDTH_PX;
  const heightPx = element.scrollHeight;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    onclone: (document) => {
      prepareSlipClone(document);
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const pageWidthMm = SLIP_PAPER_WIDTH_MM;
  const pageHeightMm = slipPaperHeightMm(canvas.width, canvas.height);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
  });

  pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm);
  pdf.save(filename);
}

export function buildSlipPdfFilename(
  patientCode: string,
  fullName?: string
): string {
  const code = patientCode.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "");
  const name = (fullName || "patient")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return `patient-slip-${code || name}.pdf`;
}
