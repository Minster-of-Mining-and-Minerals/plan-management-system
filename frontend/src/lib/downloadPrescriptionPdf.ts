import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function downloadPrescriptionPdf(
  element: HTMLElement,
  filename = "prescription.pdf"
) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });
  const imgData = canvas.toDataURL("image/png");
  const imgWidth = A4_WIDTH_MM;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pdf = new jsPDF({
    orientation: imgHeight > imgWidth ? "portrait" : "portrait",
    unit: "mm",
    format: [A4_WIDTH_MM, Math.max(imgHeight, A4_HEIGHT_MM)],
  });
  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  pdf.save(filename);
}
