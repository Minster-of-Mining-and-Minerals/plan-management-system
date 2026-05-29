import { PRESCRIPTION_PRINT_CSS } from "@/features/prescription-workflow/prescriptionPrintStyles";
import { PLATFORM_LOGO_URL } from "@/config/platformBranding";
import { GLASSES_PRESCRIPTION_DOCUMENT_HTML } from "./glassesPrescriptionDocumentTemplate";

export { GLASSES_PRESCRIPTION_DOCUMENT_HTML };

export const DEFAULT_DOCUMENT_TEMPLATE_HTML = `<div class="rx-document">
  <header class="rx-header">
    {{hospital_logo_block}}
    <h1>{{hospital_name}}</h1>
    <p>{{hospital_location}}</p>
    <p>{{contact_phone}} · {{contact_email}}</p>
    {{license_info_block}}
  </header>
  <section class="rx-patient">
    <p><strong>Patient:</strong> {{patient_name}} ({{patient_id}})</p>
    <p><strong>Age / Sex:</strong> {{patient_age}} / {{patient_sex}}</p>
    <p><strong>Visit:</strong> {{visit_id}} · {{visit_date}}</p>
  </section>
  <section class="rx-prescriber">
    <p><strong>Prescriber:</strong> {{doctor_name}}, {{doctor_title}}</p>
    <p>{{doctor_specialization}} · {{doctor_department}}</p>
  </section>
  <section class="rx-body">{{prescriptions}}</section>
  <footer class="rx-footer">
    <div class="rx-signature">{{signature}}</div>
    <p>Date: {{signature_date}}</p>
  </footer>
</div>`;

const SAMPLE_VALUES: Record<string, string> = {
  hospital_name: "LaVista General Hospital",
  hospital_logo_block: `<img src="${PLATFORM_LOGO_URL}" alt="Hospital logo" class="rx-logo" />`,
  hospital_location:
    "LaVista Tower, Bole Road, 3rd Floor, Addis Ababa, Ethiopia — LaVista Medical Center",
  contact_phone: "+251 11 123 4567",
  contact_email: "prescriptions@lavista.et",
  license_info_block:
    '<p class="rx-license">MOH License #LAV-2024-001 · LaVista Health Group</p>',
  patient_name: "Jane Doe",
  patient_id: "PT-1024",
  patient_age: "34",
  patient_sex: "Female",
  visit_id: "APT-8842",
  visit_date: new Date().toLocaleDateString("en-GB"),
  doctor_name: "Dr. Samuel Bekele",
  doctor_title: "Consultant Physician",
  doctor_specialization: "Internal Medicine",
  doctor_department: "General Medicine",
  prescriptions: `<table class="rx-items-table">
    <thead><tr><th>#</th><th>Item</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Paracetamol 500mg</td><td>1 tab</td><td>TDS</td><td>5 days</td></tr>
      <tr><td>2</td><td>Amoxicillin 500mg</td><td>1 cap</td><td>BD</td><td>7 days</td></tr>
    </tbody>
  </table>`,
  glasses_rx_table: `<table class="rx-items-table rx-glasses-table">
    <thead>
      <tr>
        <th class="rx-glasses-eye-col"></th>
        <th>Sphere</th>
        <th>Cylinder</th>
        <th>Axis</th>
        <th>Addition</th>
        <th>Prism</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th class="rx-glasses-eye-label">Right eye</th>
        <td>+1.50</td><td>-0.50</td><td>180</td><td>+2.00</td><td>—</td>
      </tr>
      <tr>
        <th class="rx-glasses-eye-label">Left eye</th>
        <td>+1.25</td><td>-0.25</td><td>175</td><td>+2.00</td><td>—</td>
      </tr>
    </tbody>
  </table>`,
  diagnosis: "Myopia, astigmatism",
  visual_acuity: "6/6 OD, 6/9 OS",
  refraction_date: new Date().toLocaleDateString("en-GB"),
  prescription_date: new Date().toLocaleDateString("en-GB"),
  refraction_type: "Subjective",
  clinical_notes:
    "Full-time wear recommended. Review in 12 months or sooner if symptoms change.",
  additional_info: "Ready to dispense — no optometrist refinement required.",
  lens_frame_options: "Anti-reflective coating; lightweight plastic frame",
  near_addition_instructions: "Standard D segment bifocal; standard position",
  signature: '<p class="rx-signature-placeholder">[Signature]</p>',
  signature_date: new Date().toLocaleDateString("en-GB"),
  notes: "Take after meals. Return if symptoms persist.",
};

export function applyDocumentTemplatePreview(html: string) {
  let output = html;
  for (const [key, value] of Object.entries(SAMPLE_VALUES)) {
    output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return output;
}

export function buildDocumentPreviewMarkup(html: string) {
  return `<style>${PRESCRIPTION_PRINT_CSS}</style>${applyDocumentTemplatePreview(html)}`;
}
