"use strict";

const { Op } = require("sequelize");
const { SystemBranding, MedicalCertificateTemplate } = require("../models");
const {
  DEFAULT_MEDICAL_CERTIFICATE_HEADER_HTML,
  DEFAULT_MEDICAL_CERTIFICATE_FOOTER_HTML,
  DEFAULT_MEDICAL_CERTIFICATE_BODY_HTML,
} = require("../config/defaultMedicalCertificateDocumentTemplate");
const { DEFAULT_CERTIFICATE_TEMPLATE_CODE } = require("../config/medicalCertificateConstants");
const { PLATFORM_LOGO_URL } = require("../config/platformBranding");
const {
  resolvePublicFileUrl,
  resolveBrandingAssetUrl,
} = require("../utils/resolvePublicFileUrl");
const prescriptionPrintService = require("./prescriptionPrintService");

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyPlaceholders(html, vars) {
  let output = html;
  for (const [key, value] of Object.entries(vars)) {
    const token = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    output = output.replace(token, value ?? "");
  }
  return output;
}

function buildSignatureHtml({ signatureType, templateSignatureUrl, userSignatureUrl }) {
  if (signatureType === "none") {
    return '<p class="mc-signature-placeholder">—</p>';
  }
  const url = signatureType === "user" ? userSignatureUrl : templateSignatureUrl;
  if (!url) {
    return '<p class="mc-signature-placeholder">Signature on file</p>';
  }
  const src = resolvePublicFileUrl(url);
  if (!src) {
    return '<p class="mc-signature-placeholder">Signature on file</p>';
  }
  return `<img src="${escapeHtml(src)}" alt="Signature" class="mc-signature-image" />`;
}

function buildStampHtml(stampUrl) {
  if (!stampUrl) return '<p class="mc-stamp-placeholder">—</p>';
  const src = resolvePublicFileUrl(stampUrl);
  if (!src) return '<p class="mc-stamp-placeholder">—</p>';
  return `<img src="${escapeHtml(src)}" alt="Hospital stamp" class="mc-stamp-image" />`;
}

async function resolveTemplate(templateId) {
  if (templateId) {
    const row = await MedicalCertificateTemplate.findByPk(templateId);
    if (row && row.status === "active") return row;
  }
  const fallback = await MedicalCertificateTemplate.findOne({
    where: {
      status: "active",
      [Op.or]: [{ is_default: true }, { code: DEFAULT_CERTIFICATE_TEMPLATE_CODE }],
    },
    order: [["is_default", "DESC"]],
  });
  if (fallback) return fallback;

  return {
    header_html: DEFAULT_MEDICAL_CERTIFICATE_HEADER_HTML,
    footer_html: DEFAULT_MEDICAL_CERTIFICATE_FOOTER_HTML,
    html_content: DEFAULT_MEDICAL_CERTIFICATE_BODY_HTML,
    has_template_stamp: false,
    stamp_image_file: null,
  };
}

function computePatientAge(patient) {
  const dob =
    patient?.patientProfile?.date_of_birth ||
    patient?.date_of_birth ||
    patient?.dob;
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

async function renderMedicalCertificateDocument({
  branding,
  templateId,
  template,
  patient,
  schedule,
  appointment,
  doctor,
  sectionVars,
  signatureType,
  templateSignatureUrl,
  userSignatureUrl,
  doctorNotes,
  certificateNumber,
  verificationCode,
}) {
  const activeBranding = branding || (await prescriptionPrintService.getActiveBranding());
  const docTemplate = template || (await resolveTemplate(templateId));
  const hospitalLocation = prescriptionPrintService.formatLocation(activeBranding);
  const logoPath = activeBranding?.logo_url || PLATFORM_LOGO_URL;
  const logoUrl = resolveBrandingAssetUrl(logoPath);

  const issueDate = new Date().toLocaleDateString("en-GB");
  const visitDate = schedule?.schedule_date
    ? new Date(schedule.schedule_date).toLocaleDateString("en-GB")
    : appointment?.admitted_at
      ? new Date(appointment.admitted_at).toLocaleDateString("en-GB")
      : issueDate;

  const age = computePatientAge(patient);
  const gender =
    patient?.patientProfile?.gender ||
    patient?.patientProfile?.sex ||
    patient?.sex ||
    patient?.gender ||
    "—";

  const doctorTitle = doctor?.internalProfile?.titleRef?.name || "";
  const licenseNumber =
    doctor?.internalProfile?.license_number ||
    doctor?.internalProfile?.medical_license ||
    "";

  const brandingVars = {
    hospital_name: escapeHtml(activeBranding?.system_name || "Hospital"),
    hospital_logo: logoUrl ? escapeHtml(logoUrl) : "",
    hospital_logo_block: logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" class="mc-logo" />`
      : "",
    hospital_location: escapeHtml(hospitalLocation || "—"),
    contact_phone: escapeHtml(activeBranding?.contact_phone || "—"),
    contact_email: escapeHtml(activeBranding?.contact_email || "—"),
    license_info: escapeHtml(activeBranding?.license_info || ""),
    license_info_block: activeBranding?.license_info
      ? `<p class="mc-license">${escapeHtml(activeBranding.license_info)}</p>`
      : "",
    certificate_number: escapeHtml(certificateNumber || "DRAFT"),
    verification_hint: escapeHtml(
      verificationCode
        ? `Verification code: ${verificationCode} (QR placeholder)`
        : "Scan QR at hospital portal when enabled"
    ),
  };

  const headerRendered = applyPlaceholders(docTemplate.header_html, brandingVars);
  const footerRendered = applyPlaceholders(docTemplate.footer_html, brandingVars);

  const stampUrl =
    docTemplate.has_template_stamp && docTemplate.stamp_image_file
      ? resolvePublicFileUrl(docTemplate.stamp_image_file)
      : null;

  const signatureHtml = buildSignatureHtml({
    signatureType,
    templateSignatureUrl,
    userSignatureUrl,
  });

  const vars = {
    ...brandingVars,
    certificate_header: headerRendered,
    certificate_footer: footerRendered,
    patient_name: escapeHtml(patient?.full_name || "—"),
    patient_id: escapeHtml(
      patient?.patientProfile?.patient_code || patient?.user_id || "—"
    ),
    patient_age: escapeHtml(age != null ? String(age) : "—"),
    patient_gender: escapeHtml(gender),
    visit_date: escapeHtml(visitDate),
    visit_department: escapeHtml(
      doctor?.internalProfile?.departmentRef?.name ||
        doctor?.internalProfile?.department ||
        "—"
    ),
    visit_service: escapeHtml(
      schedule?.appointment_type || appointment?.notes || "Consultation"
    ),
    doctor_name: escapeHtml(doctor?.full_name || "—"),
    doctor_title_block: doctorTitle
      ? `, ${escapeHtml(doctorTitle)}`
      : "",
    doctor_specialization: escapeHtml(
      doctor?.internalProfile?.job_title || "—"
    ),
    doctor_department: escapeHtml(
      doctor?.internalProfile?.departmentRef?.name ||
        doctor?.internalProfile?.department ||
        "—"
    ),
    doctor_license_block: licenseNumber
      ? `<p><strong>License:</strong> ${escapeHtml(licenseNumber)}</p>`
      : "",
    doctor_remarks: escapeHtml(doctorNotes || "—").replace(/\n/g, "<br/>"),
    signature: signatureHtml,
    hospital_stamp: buildStampHtml(stampUrl),
    signature_date: escapeHtml(issueDate),
    ...(sectionVars || {}),
  };

  const bodyHtml = applyPlaceholders(docTemplate.html_content, vars);
  return `<div data-certificate-export="true">${bodyHtml}</div>`;
}

module.exports = {
  renderMedicalCertificateDocument,
  resolveTemplate,
  applyPlaceholders,
};
