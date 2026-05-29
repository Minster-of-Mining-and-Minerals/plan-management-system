"use strict";

const { Op } = require("sequelize");
const {
  SystemBranding,
  PrescriptionDocumentTemplate,
} = require("../models");
const { DEFAULT_PRESCRIPTION_DOCUMENT_HTML } = require("../config/defaultPrescriptionDocumentTemplate");
const {
  DEFAULT_DOCUMENT_TEMPLATE_CODE,
  GLASSES_DOCUMENT_TEMPLATE_CODE,
} = require("../config/prescriptionConstants");
const { PLATFORM_LOGO_URL } = require("../config/platformBranding");
const {
  resolvePublicFileUrl,
  resolveBrandingAssetUrl,
} = require("../utils/resolvePublicFileUrl");

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

function isGlassesDocumentTemplate(docTemplate) {
  if (!docTemplate) return false;
  if (docTemplate.code === GLASSES_DOCUMENT_TEMPLATE_CODE) return true;
  return String(docTemplate.html_content || "").includes("{{glasses_rx_table}}");
}

function parseGlassesNotesSections(notes) {
  const text = String(notes || "").trim();
  const result = {
    diagnosis: "—",
    visual_acuity: "—",
    refraction_type: "—",
    additional_info: "—",
    lens_frame_options: "—",
    near_addition_instructions: "—",
    clinical_notes: text || "—",
  };

  if (!text) return result;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const clinicalLines = [];

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/i);
    if (!match) {
      clinicalLines.push(line);
      continue;
    }
    const key = match[1].toLowerCase().replace(/\s+/g, "_");
    const value = match[2].trim();
    if (key in result && key !== "clinical_notes") {
      result[key] = value || "—";
    } else if (/^clinical\s*notes?$/i.test(match[1])) {
      result.clinical_notes = value || "—";
    } else {
      clinicalLines.push(line);
    }
  }

  if (clinicalLines.length && result.clinical_notes === text) {
    result.clinical_notes = clinicalLines.join("\n");
  }

  return result;
}

function pickGlassesEyeRow(items, eye) {
  const pattern =
    eye === "right" ? /\b(right|re\b|r\.?\s*eye)\b/i : /\b(left|le\b|l\.?\s*eye)\b/i;
  return items.find((item) => pattern.test(String(item.item_name || "")));
}

function cell(value) {
  const v = value != null && String(value).trim() !== "" ? String(value).trim() : "—";
  return escapeHtml(v);
}

function buildGlassesRxTableHtml(items = []) {
  const right = pickGlassesEyeRow(items, "right");
  const left = pickGlassesEyeRow(items, "left");

  const row = (label, item) => {
    if (!item) {
      return `<tr>
        <th class="rx-glasses-eye-label">${escapeHtml(label)}</th>
        <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
      </tr>`;
    }
    return `<tr>
      <th class="rx-glasses-eye-label">${escapeHtml(label)}</th>
      <td>${cell(item.strength)}</td>
      <td>${cell(item.dosage)}</td>
      <td>${cell(item.frequency)}</td>
      <td>${cell(item.duration)}</td>
      <td>${cell(item.route)}</td>
    </tr>`;
  };

  const extraRows = items
    .filter((item) => item !== right && item !== left)
    .map(
      (item) => `<tr class="rx-glasses-extra-row">
      <td colspan="6"><strong>${cell(item.item_name)}</strong>
        ${[item.strength, item.dosage, item.frequency, item.duration, item.route]
          .filter((v) => v && String(v).trim() && String(v).trim() !== "—")
          .map((v) => cell(v))
          .join(" · ")}
        ${
          item.instructions || item.notes
            ? `<br/><em>${escapeHtml(
                [item.instructions, item.notes].filter(Boolean).join(" — ")
              )}</em>`
            : ""
        }
      </td>
    </tr>`
    )
    .join("");

  return `<table class="rx-items-table rx-glasses-table">
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
      ${row("Right eye", right)}
      ${row("Left eye", left)}
      ${extraRows}
    </tbody>
  </table>`;
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
  const logoPath = activeBranding?.logo_url || PLATFORM_LOGO_URL;
  const logoUrl = resolveBrandingAssetUrl(logoPath);

  const signatureHtml = buildSignatureHtml({
    signatureType,
    templateSignatureUrl,
    userSignatureUrl,
  });

  const glassesTemplate = isGlassesDocumentTemplate(docTemplate);
  const noteSections = parseGlassesNotesSections(notes);
  const issueDate = new Date().toLocaleDateString("en-GB");
  const refractionDate = appointment?.admitted_at
    ? new Date(appointment.admitted_at).toLocaleDateString("en-GB")
    : issueDate;

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
    prescriptions: glassesTemplate ? buildGlassesRxTableHtml(items) : buildItemsHtml(items),
    glasses_rx_table: buildGlassesRxTableHtml(items),
    signature: signatureHtml,
    signature_date: escapeHtml(issueDate),
    notes: escapeHtml(notes || ""),
    clinical_notes: escapeHtml(
      noteSections.clinical_notes.replace(/\n/g, "<br/>")
    ),
    diagnosis: escapeHtml(noteSections.diagnosis),
    visual_acuity: escapeHtml(noteSections.visual_acuity),
    refraction_type: escapeHtml(noteSections.refraction_type),
    refraction_date: escapeHtml(refractionDate),
    prescription_date: escapeHtml(issueDate),
    additional_info: escapeHtml(noteSections.additional_info),
    lens_frame_options: escapeHtml(noteSections.lens_frame_options),
    near_addition_instructions: escapeHtml(noteSections.near_addition_instructions),
  };

  return applyPlaceholders(docTemplate.html_content, vars);
}

module.exports = {
  renderPrescriptionDocument,
  getActiveBranding,
  formatLocation,
  buildItemsHtml,
  buildGlassesRxTableHtml,
  isGlassesDocumentTemplate,
};
