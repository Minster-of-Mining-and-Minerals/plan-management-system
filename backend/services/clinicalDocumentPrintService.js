"use strict";

const db = require("../models");
const diagnosisFormConfigService = require("./diagnosisFormConfigService");
const { SystemBranding, User, ClinicalDocument } = db;
const { PLATFORM_LOGO_URL } = require("../config/platformBranding");
const { resolveBrandingAssetUrl } = require("../utils/resolvePublicFileUrl");

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

function renderValue(val, fieldType) {
  if (val == null || val === "") return '<span class="empty">—</span>';
  if (fieldType === "boolean") {
    return val ? "Yes" : "No";
  }
  if (fieldType === "file" || fieldType === "canvas") {
    // If it's a file URL/signature or canvas drawing URL
    if (typeof val === "string" && (val.startsWith("http") || val.startsWith("/api/attachments") || val.startsWith("data:"))) {
      return `<img src="${escapeHtml(val)}" class="field-image" alt="Field Drawing/Attachment" />`;
    }
  }
  if (Array.isArray(val)) {
    return val.map((v) => `<li>${escapeHtml(v)}</li>`).join("");
  }
  if (typeof val === "object") {
    return `<pre class="json-value">${escapeHtml(JSON.stringify(val, null, 2))}</pre>`;
  }
  return escapeHtml(String(val)).replace(/\n/g, "<br/>");
}

class ClinicalDocumentPrintService {
  async getActiveBranding() {
    return SystemBranding.findOne({ where: { is_active: true } });
  }

  async renderPrintHtml(documentId) {
    const document = await ClinicalDocument.findByPk(documentId, {
      include: [
        { model: User, as: "patient", include: [{ model: db.PatientProfile, as: "patientProfile" }] },
        { model: User, as: "creator", attributes: ["user_id", "full_name"] },
        { model: User, as: "reviewer", attributes: ["user_id", "full_name"] },
        { model: User, as: "approver", attributes: ["user_id", "full_name"] },
      ],
    });

    if (!document) {
      throw new Error("Clinical document not found");
    }

    const branding = await this.getActiveBranding();
    const hospitalName = branding?.system_name || "NovaCure Clinical Center";
    const logoPath = branding?.logo_url || PLATFORM_LOGO_URL;
    const logoUrl = resolveBrandingAssetUrl(logoPath);
    const location = formatLocation(branding);
    const contact = [branding?.contact_phone, branding?.contact_email].filter(Boolean).join(" | ");

    // Fetch dynamic form configuration structure
    let groupedConfig = null;
    if (document.form_config_id) {
      groupedConfig = await diagnosisFormConfigService.getGroupedFormConfigForConfig(
        document.form_config_id,
        { visibleOnly: true }
      );
    }

    // Build Form Content HTML
    let formContentHtml = "";
    if (groupedConfig && Array.isArray(groupedConfig.sections)) {
      for (const section of groupedConfig.sections) {
        let sectionRows = "";
        const fields = section.fields || [];
        for (const field of fields) {
          const val = document.form_data[field.field_key];
          sectionRows += `
            <tr class="field-row">
              <td class="field-label">${escapeHtml(field.label)}</td>
              <td class="field-value">${renderValue(val, field.field_type)}</td>
            </tr>
          `;
        }

        if (sectionRows) {
          formContentHtml += `
            <div class="section-container">
              <h3 class="section-title">${escapeHtml(section.title)}</h3>
              <table class="section-table">
                <tbody>
                  ${sectionRows}
                </tbody>
              </table>
            </div>
          `;
        }
      }
    } else {
      // Fallback: If no form template, just dump the JSON keys
      let fallbackRows = "";
      for (const [key, value] of Object.entries(document.form_data)) {
        fallbackRows += `
          <tr class="field-row">
            <td class="field-label">${escapeHtml(key)}</td>
            <td class="field-value">${renderValue(value)}</td>
          </tr>
        `;
      }
      if (fallbackRows) {
        formContentHtml += `
          <div class="section-container">
            <table class="section-table">
              <tbody>
                ${fallbackRows}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    // Signatures HTML
    let signaturesHtml = "";
    const roles = ["author", "reviewer", "approver"];
    for (const r of roles) {
      const sig = document.signatures[r];
      if (sig) {
        let sigDisplay = "";
        if (sig.signature_value && sig.signature_value.startsWith("data:")) {
          sigDisplay = `<img src="${escapeHtml(sig.signature_value)}" class="signature-image" alt="${r} signature" />`;
        } else {
          sigDisplay = `<div class="typed-signature">${escapeHtml(sig.signature_value || sig.full_name)}</div>`;
        }

        signaturesHtml += `
          <div class="signature-box">
            <div class="signature-role">${r.toUpperCase()}</div>
            <div class="signature-display-box">${sigDisplay}</div>
            <div class="signature-name">${escapeHtml(sig.full_name)}</div>
            <div class="signature-date">Signed: ${new Date(sig.signed_at).toLocaleDateString("en-GB")}</div>
          </div>
        `;
      } else {
        signaturesHtml += `
          <div class="signature-box pending">
            <div class="signature-role">${r.toUpperCase()}</div>
            <div class="signature-display-box pending-sig">PENDING SIGNATURE</div>
            <div class="signature-name">—</div>
            <div class="signature-date">—</div>
          </div>
        `;
      }
    }

    const patientAge = document.patient?.age || "—";
    const patientGender = document.patient?.gender || document.patient?.sex || "—";
    const patientCode = document.patient?.patientProfile?.patient_code || document.patient?.patient_id || "—";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(document.title)}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 40px;
      font-size: 14px;
      line-height: 1.5;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1a365d;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .hospital-info h1 {
      margin: 0;
      font-size: 24px;
      color: #1a365d;
      font-weight: 700;
    }
    .hospital-info p {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #555;
    }
    .hospital-logo img {
      max-height: 60px;
    }
    .document-title-container {
      text-align: center;
      margin-bottom: 30px;
    }
    .document-title {
      font-size: 20px;
      text-transform: uppercase;
      font-weight: bold;
      color: #2b6cb0;
      margin: 0 0 5px 0;
    }
    .document-meta-subtitle {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
    .patient-card {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      color: #718096;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .meta-value {
      font-weight: 600;
      font-size: 13px;
    }
    .section-container {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 15px;
      color: #2c5282;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin: 0 0 15px 0;
      font-weight: bold;
      text-transform: uppercase;
    }
    .section-table {
      width: 100%;
      border-collapse: collapse;
    }
    .field-row {
      border-bottom: 1px solid #edf2f7;
    }
    .field-label {
      width: 25%;
      padding: 8px 12px 8px 0;
      font-weight: 600;
      color: #4a5568;
      vertical-align: top;
    }
    .field-value {
      padding: 8px 0;
      vertical-align: top;
    }
    .field-image {
      max-width: 400px;
      max-height: 200px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      margin-top: 5px;
    }
    .empty {
      color: #a0aec0;
      font-style: italic;
    }
    .json-value {
      background: #f7fafc;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      margin: 0;
    }
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 30%;
      border: 1px dashed #cbd5e0;
      border-radius: 6px;
      padding: 15px;
      text-align: center;
      background: #fff;
    }
    .signature-box.pending {
      background: #fffaf0;
      border-color: #fbd38d;
    }
    .signature-role {
      font-size: 11px;
      font-weight: bold;
      color: #4a5568;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
    }
    .signature-display-box {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
    }
    .signature-image {
      max-height: 55px;
      max-width: 100%;
    }
    .typed-signature {
      font-family: "Brush Script MT", cursive, sans-serif;
      font-size: 24px;
      color: #2b6cb0;
    }
    .pending-sig {
      color: #dd6b20;
      font-weight: bold;
      font-size: 11px;
    }
    .signature-name {
      font-weight: 600;
      font-size: 12px;
    }
    .signature-date {
      font-size: 10px;
      color: #718096;
      margin-top: 2px;
    }
    @media print {
      body {
        padding: 0;
      }
      .signature-box.pending {
        background: none;
      }
      @page {
        margin: 1.5cm;
      }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="hospital-info">
      <h1>${escapeHtml(hospitalName)}</h1>
      <p>${escapeHtml(location)}</p>
      <p>${escapeHtml(contact)}</p>
    </div>
    <div class="hospital-logo">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : ""}
    </div>
  </div>

  <div class="document-title-container">
    <h2 class="document-title">${escapeHtml(document.title)}</h2>
    <p class="document-meta-subtitle">
      Document ID: ${escapeHtml(document.document_id)} | Version: ${document.version} | Status: ${escapeHtml(document.status.toUpperCase())}
    </p>
  </div>

  <div class="patient-card">
    <div class="meta-item">
      <span class="meta-label">Patient Name</span>
      <span class="meta-value">${escapeHtml(document.patient?.full_name || "—")}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Patient ID</span>
      <span class="meta-value">${escapeHtml(patientCode)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Age</span>
      <span class="meta-value">${escapeHtml(patientAge)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Gender</span>
      <span class="meta-value">${escapeHtml(patientGender)}</span>
    </div>
  </div>

  ${formContentHtml}

  <div class="signatures-container">
    ${signaturesHtml}
  </div>
</body>
</html>
    `;
  }
}

module.exports = new ClinicalDocumentPrintService();
