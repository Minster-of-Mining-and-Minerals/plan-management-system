"use strict";

const { Op } = require("sequelize");
const {
  SystemBranding,
  PrescriptionDocumentTemplate,
} = require("../models");
const { DEFAULT_PRESCRIPTION_DOCUMENT_HTML } = require("../config/defaultPrescriptionDocumentTemplate");
const { DEFAULT_DOCUMENT_TEMPLATE_CODE } = require("../config/prescriptionConstants");
const { resolvePublicFileUrl } = require("../utils/resolvePublicFileUrl");

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLocation(branding) {
  if (!branding) return "";
  const parts = [
    branding.organization_address,
    branding.organization_city,
    branding.organization_region,
    branding.organization_country,
    branding.organization_branch,
  ].filter(Boolean);
  return parts.join(", ");
}

function buildItemsHtml(items = []) {
  if (!items.length) {
    return '<p class="rx-empty">No prescription items recorded.</p>';
  }
  return `<table class="rx-items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Strength</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Route</th>
        <th>Duration</th>
        <th>Qty</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.item_name)}</td>
        <td>${escapeHtml(item.strength || "—")}</td>
        <td>${escapeHtml(item.dosage || "—")}</td>
        <td>${escapeHtml(item.frequency || "—")}</td>
        <td>${escapeHtml(item.route || "—")}</td>
        <td>${escapeHtml(item.duration || "—")}</td>
        <td>${escapeHtml(item.quantity || "—")}</td>
      </tr>
      ${
        item.instructions || item.notes
          ? `<tr class="rx-item-notes"><td></td><td colspan="7"><em>${escapeHtml(
              [item.instructions, item.notes].filter(Boolean).join(" — ")
            )}</em></td></tr>`
          : ""
      }`
        )
        .join("")}
    </tbody>
  </table>`;
}

function buildSignatureHtml({ signatureType, templateSignatureUrl, userSignatureUrl }) {
  if (signatureType === "none") {
    return '<p class="rx-signature-placeholder">—</p>';
  }
  const url = signatureType === "user" ? userSignatureUrl : templateSignatureUrl;
  if (!url) {
    return '<p class="rx-signature-placeholder">Signature on file</p>';
  }
  const src = resolvePublicFileUrl(url);
  if (!src) {
    return '<p class="rx-signature-placeholder">Signature on file</p>';
  }
  return `<img src="${escapeHtml(src)}" alt="Signature" class="rx-signature-image" />`;
}

function applyPlaceholders(html, vars) {
  let output = html;
  for (const [key, value] of Object.entries(vars)) {
    const token = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    output = output.replace(token, value ?? "");
  }
  return output;
}

async function getActiveBranding() {
  return SystemBranding.findOne({ where: { is_active: true } });
}

async function resolveDocumentTemplate(documentTemplateId, categoryId) {
  if (documentTemplateId) {
    const row = await PrescriptionDocumentTemplate.findByPk(documentTemplateId);
    if (row && row.status === "active") return row;
  }
  const byCategory = categoryId
    ? await PrescriptionDocumentTemplate.findOne({
        where: { category_id: categoryId, status: "active" },
        order: [["is_default", "DESC"], ["created_at", "ASC"]],
      })
    : null;
  if (byCategory) return byCategory;

  const fallback = await PrescriptionDocumentTemplate.findOne({
    where: {
      status: "active",
      [Op.or]: [{ is_default: true }, { code: DEFAULT_DOCUMENT_TEMPLATE_CODE }],
    },
    order: [["is_default", "DESC"]],
  });
  if (fallback) return fallback;

  return {
    html_content: DEFAULT_PRESCRIPTION_DOCUMENT_HTML,
  };
}

async function renderPrescriptionDocument({
  branding,
  documentTemplateId,
  categoryId,
  patient,
  appointment,
  prescriber,
  items,
  signatureType,
  templateSignatureUrl,
  userSignatureUrl,
  notes,
}) {
  const activeBranding = branding || (await getActiveBranding());
  const docTemplate = await resolveDocumentTemplate(documentTemplateId, categoryId);
  const hospitalLocation = formatLocation(activeBranding);
  const logoUrl = activeBranding?.logo_url
    ? resolvePublicFileUrl(activeBranding.logo_url)
    : "";

  const signatureHtml = buildSignatureHtml({
    signatureType,
    templateSignatureUrl,
    userSignatureUrl,
  });

  const vars = {
    hospital_name: escapeHtml(activeBranding?.system_name || "Hospital"),
    hospital_logo: logoUrl ? escapeHtml(logoUrl) : "",
    hospital_logo_block: logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" class="rx-logo" />`
      : "",
    hospital_location: escapeHtml(hospitalLocation || "—"),
    contact_phone: escapeHtml(activeBranding?.contact_phone || "—"),
    contact_email: escapeHtml(activeBranding?.contact_email || "—"),
    license_info: escapeHtml(activeBranding?.license_info || ""),
    license_info_block: activeBranding?.license_info
      ? `<p class="rx-license">${escapeHtml(activeBranding.license_info)}</p>`
      : "",
    patient_name: escapeHtml(patient?.full_name || "—"),
    patient_id: escapeHtml(
      patient?.patientProfile?.patient_code || patient?.patient_id || "—"
    ),
    patient_age: escapeHtml(patient?.age != null ? String(patient.age) : "—"),
    patient_sex: escapeHtml(patient?.sex || patient?.gender || "—"),
    visit_id: escapeHtml(appointment?.appointment_id || "—"),
    visit_date: escapeHtml(
      appointment?.admitted_at
        ? new Date(appointment.admitted_at).toLocaleDateString("en-GB")
        : new Date().toLocaleDateString("en-GB")
    ),
    doctor_name: escapeHtml(prescriber?.full_name || "—"),
    doctor_title: escapeHtml(prescriber?.internalProfile?.titleRef?.name || ""),
    doctor_specialization: escapeHtml(
      prescriber?.internalProfile?.job_title || "—"
    ),
    doctor_department: escapeHtml(
      prescriber?.internalProfile?.departmentRef?.name ||
        prescriber?.internalProfile?.department ||
        "—"
    ),
    license_number_block: "",
    prescriptions: buildItemsHtml(items),
    signature: signatureHtml,
    signature_date: escapeHtml(new Date().toLocaleDateString("en-GB")),
    notes: escapeHtml(notes || ""),
  };

  return applyPlaceholders(docTemplate.html_content, vars);
}

module.exports = {
  renderPrescriptionDocument,
  getActiveBranding,
  formatLocation,
  buildItemsHtml,
};
