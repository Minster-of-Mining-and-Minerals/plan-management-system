import { MEDICAL_CERTIFICATE_PRINT_CSS } from "./certificatePrintStyles";
import { PLATFORM_LOGO_URL } from "@/config/platformBranding";

export const DEFAULT_CERTIFICATE_HEADER_HTML = `<header class="mc-header">
  {{hospital_logo_block}}
  <h1>{{hospital_name}}</h1>
  <p class="mc-hospital-address">{{hospital_location}}</p>
  <p class="mc-hospital-contact">{{contact_phone}} · {{contact_email}}</p>
  {{license_info_block}}
</header>`;

export const DEFAULT_CERTIFICATE_FOOTER_HTML = `<footer class="mc-footer">
  <div class="mc-verification">
    <p><strong>Certificate ID:</strong> {{certificate_number}}</p>
    <p class="mc-verification-hint">{{verification_hint}}</p>
  </div>
</footer>`;

export const DEFAULT_CERTIFICATE_BODY_HTML = `<div class="mc-document" data-certificate-root>
  <div data-certificate-header class="mc-header-slot">{{certificate_header}}</div>
  <main class="mc-body" data-certificate-body>
    <h2 class="mc-title">Medical Certificate</h2>
    <section class="mc-meta">
      <p><strong>Patient:</strong> {{patient_name}} ({{patient_id}})</p>
      <p><strong>Age / Gender:</strong> {{patient_age}} / {{patient_gender}}</p>
    </section>
    <section class="mc-section">{{section_diagnosis}}</section>
    <section class="mc-section">{{section_treatment}}</section>
    <section class="mc-signature-block">
      <div class="mc-signature-image-wrap">{{signature}}</div>
      <p class="mc-signed-date"><strong>Signed:</strong> {{signature_date}}</p>
    </section>
  </main>
  <div data-certificate-footer class="mc-footer-slot">{{certificate_footer}}</div>
</div>`;

const SAMPLE: Record<string, string> = {
  hospital_name: "Sample Hospital",
  hospital_logo_block: `<img src="${PLATFORM_LOGO_URL}" alt="Logo" class="mc-logo" />`,
  hospital_location: "123 Medical Center Drive",
  contact_phone: "+1 555 0100",
  contact_email: "info@hospital.example",
  license_info_block: "<p class=\"mc-license\">License #DEMO-001</p>",
  certificate_number: "MC-2026-SAMPLE",
  verification_hint: "Verification code: DEMO123 (QR placeholder)",
  patient_name: "Jane Doe",
  patient_id: "P-10042",
  patient_age: "34",
  patient_gender: "Female",
  section_diagnosis:
    '<div class="mc-section-block"><h3>Diagnosis summary</h3><p><strong>Condition:</strong> Sample diagnosis</p></div>',
  section_treatment:
    '<div class="mc-section-block"><h3>Treatment summary</h3><p><strong>Plan:</strong> Rest and follow-up</p></div>',
  signature:
    '<p class="mc-signature-placeholder">Signature preview</p>',
  signature_date: new Date().toLocaleDateString("en-GB"),
};

function applyPlaceholders(html: string, vars: Record<string, string>) {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return out;
}

export function buildCertificatePreviewMarkup(
  headerHtml: string,
  footerHtml: string,
  bodyHtml: string
): string {
  const header = applyPlaceholders(headerHtml, SAMPLE);
  const footer = applyPlaceholders(footerHtml, SAMPLE);
  const vars = {
    ...SAMPLE,
    certificate_header: header,
    certificate_footer: footer,
  };
  const body = applyPlaceholders(bodyHtml, vars);
  return `<style>${MEDICAL_CERTIFICATE_PRINT_CSS}</style><div data-certificate-viewport>${body}</div>`;
}
