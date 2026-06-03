"use strict";

const medicalWorkflowService = require("./medicalWorkflowService");

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value) {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldMatchesCategory(fieldKey, label, category) {
  const text = `${fieldKey} ${label}`.toLowerCase();
  if (category === "diagnosis") {
    return /diagnos|condition|icd|impression|assessment/.test(text);
  }
  if (category === "treatment") {
    return /treat|therapy|plan|medication|rx|prescri/.test(text);
  }
  if (category === "lab") {
    return /lab|test|result|pathology|blood|urine|imaging|x-?ray|mri|ct\b/.test(
      text
    );
  }
  if (category === "procedure") {
    return /procedur|surgery|operation|intervention|note/.test(text);
  }
  return false;
}

function collectFieldsFromLog(log, category) {
  const rows = [];
  const formData = log.form_data || {};
  const schema = log.formSchema;

  if (schema?.steps) {
    for (const step of schema.steps) {
      for (const field of step.fields || []) {
        if (field.field_type === "file" || field.field_type === "canvas_annotation") {
          continue;
        }
        const key = field.field_key;
        if (!(key in formData)) continue;
        const label = field.label || humanizeKey(key);
        if (category && !fieldMatchesCategory(key, label, category)) continue;
        const value = formData[key];
        if (value === undefined || value === null || value === "") continue;
        rows.push({ label, value: formatValue(value) });
      }
    }
  }

  if (!rows.length && category) {
    for (const [key, value] of Object.entries(formData)) {
      if (value === undefined || value === null || value === "") continue;
      const label = humanizeKey(key);
      if (!fieldMatchesCategory(key, label, category)) continue;
      rows.push({ label, value: formatValue(value) });
    }
  }

  if (!rows.length && !category) {
    for (const [key, value] of Object.entries(formData)) {
      if (value === undefined || value === null || value === "") continue;
      if (key === "prescription_id") continue;
      rows.push({ label: humanizeKey(key), value: formatValue(value) });
    }
  }

  return rows;
}

function rowsToHtml(title, rows) {
  if (!rows.length) {
    return `<div class="mc-section-block mc-empty"><h3>${escapeHtml(title)}</h3><p>—</p></div>`;
  }
  const list = rows
    .map(
      (r) =>
        `<p><strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.value)}</p>`
    )
    .join("");
  return `<div class="mc-section-block"><h3>${escapeHtml(title)}</h3>${list}</div>`;
}

function buildPrescriptionHtml(log) {
  const rx = log.prescription;
  if (!rx) {
    return `<div class="mc-section-block mc-empty"><h3>Prescription reference</h3><p>—</p></div>`;
  }
  const items = (rx.items || [])
    .map(
      (item, i) =>
        `<li>${i + 1}. ${escapeHtml(item.item_name || "Item")} — ${escapeHtml(
          [item.strength, item.dosage, item.frequency, item.duration]
            .filter(Boolean)
            .join(", ") || "—"
        )}</li>`
    )
    .join("");
  return `<div class="mc-section-block"><h3>Prescription reference</h3>
    <p><strong>Issued:</strong> ${escapeHtml(
      rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-GB") : "—"
    )} · <strong>By:</strong> ${escapeHtml(rx.prescriber?.full_name || "—")}</p>
    <ul class="mc-list">${items || "<li>—</li>"}</ul>
  </div>`;
}

function buildReferralHtml(log) {
  const sender = log.sender?.full_name || "—";
  const receiver = log.receiver?.full_name || "—";
  const action = log.action_type === "return" ? "Returned" : "Forwarded";
  const note =
    log.form_data?.notes || log.form_data?.comment || log.header_title || "";
  return `<div class="mc-section-block"><h3>Referral / routing</h3>
    <p><strong>${escapeHtml(action)}</strong> from ${escapeHtml(sender)} to ${escapeHtml(receiver)}</p>
    ${note ? `<p>${escapeHtml(formatValue(note))}</p>` : ""}
  </div>`;
}

async function buildWorkflowSectionHtml({
  scheduleId,
  appointmentId,
  patientId,
  staffId,
  includeOptions,
}) {
  const timeline = await medicalWorkflowService.listTimeline({
    scheduleId,
    appointmentId,
    patientId,
    staffId,
  });

  const diagnosisRows = [];
  const treatmentRows = [];
  const labRows = [];
  const procedureRows = [];
  const prescriptionBlocks = [];
  const referralBlocks = [];

  for (const log of timeline) {
    if (log.action_type === "prescribe" && includeOptions.prescription_reference) {
      prescriptionBlocks.push(buildPrescriptionHtml(log));
    }
    if (
      (log.action_type === "forward" || log.action_type === "return") &&
      includeOptions.referral
    ) {
      referralBlocks.push(buildReferralHtml(log));
    }
    if (log.action_type === "submit" || log.action_type === "complete") {
      if (includeOptions.diagnosis) {
        diagnosisRows.push(...collectFieldsFromLog(log, "diagnosis"));
      }
      if (includeOptions.treatment) {
        treatmentRows.push(...collectFieldsFromLog(log, "treatment"));
      }
      if (includeOptions.lab_results) {
        labRows.push(...collectFieldsFromLog(log, "lab"));
      }
      if (includeOptions.procedure_notes) {
        procedureRows.push(...collectFieldsFromLog(log, "procedure"));
        if (!procedureRows.length) {
          procedureRows.push(...collectFieldsFromLog(log, null));
        }
      }
    }
  }

  const dedupe = (rows) => {
    const seen = new Set();
    return rows.filter((r) => {
      const key = `${r.label}:${r.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    section_diagnosis: includeOptions.diagnosis
      ? rowsToHtml("Diagnosis summary", dedupe(diagnosisRows))
      : "",
    section_treatment: includeOptions.treatment
      ? rowsToHtml("Treatment summary", dedupe(treatmentRows))
      : "",
    section_prescription: includeOptions.prescription_reference
      ? prescriptionBlocks.join("") ||
        `<div class="mc-section-block mc-empty"><h3>Prescription reference</h3><p>—</p></div>`
      : "",
    section_lab_results: includeOptions.lab_results
      ? rowsToHtml("Laboratory / investigations", dedupe(labRows))
      : "",
    section_procedure_notes: includeOptions.procedure_notes
      ? rowsToHtml("Procedure / clinical notes", dedupe(procedureRows))
      : "",
    section_referral: includeOptions.referral
      ? referralBlocks.join("") ||
        `<div class="mc-section-block mc-empty"><h3>Referral information</h3><p>—</p></div>`
      : "",
  };
}

module.exports = {
  buildWorkflowSectionHtml,
};
