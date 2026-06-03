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

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function formatValue(value) {
  if (isEmptyValue(value)) return "";
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
    return /procedur|surgery|operation|intervention|clinical.?note|note/.test(
      text
    );
  }
  return false;
}

/** Collect display rows only from fields defined on the diagnosis form schema. */
function collectSchemaFieldsFromLog(log, category) {
  const rows = [];
  const formData = log.form_data || {};
  const schema = log.formSchema;

  if (!schema?.steps?.length) return rows;

  for (const step of schema.steps) {
    for (const field of step.fields || []) {
      if (field.field_type === "file" || field.field_type === "canvas_annotation") {
        continue;
      }
      const key = field.field_key;
      if (!key || !(key in formData)) continue;

      const value = formData[key];
      if (isEmptyValue(value)) continue;

      const label = field.label || humanizeKey(key);
      if (category && !fieldMatchesCategory(key, label, category)) continue;

      const formatted = formatValue(value);
      if (!formatted) continue;

      rows.push({ label, value: formatted });
    }
  }

  return rows;
}

function rowsToHtml(title, rows) {
  if (!rows.length) return "";
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
  if (!rx) return "";
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

function collectReferralNotesFromSchema(log) {
  const formData = log.form_data || {};
  const schema = log.formSchema;
  const parts = [];

  if (schema?.steps?.length) {
    for (const step of schema.steps) {
      for (const field of step.fields || []) {
        const key = field.field_key;
        if (!key || !(key in formData) || isEmptyValue(formData[key])) continue;
        parts.push(formatValue(formData[key]));
      }
    }
  }

  return parts.filter(Boolean).join(" · ");
}

function buildReferralHtml(log) {
  const sender = log.sender?.full_name || "—";
  const receiver = log.receiver?.full_name || "—";
  const action = log.action_type === "return" ? "Returned" : "Forwarded";
  const note = collectReferralNotesFromSchema(log);
  return `<div class="mc-section-block"><h3>Referral / routing</h3>
    <p><strong>${escapeHtml(action)}</strong> from ${escapeHtml(sender)} to ${escapeHtml(receiver)}</p>
    ${note ? `<p>${escapeHtml(note)}</p>` : ""}
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
      const block = buildPrescriptionHtml(log);
      if (block) prescriptionBlocks.push(block);
    }
    if (
      (log.action_type === "forward" || log.action_type === "return") &&
      includeOptions.referral
    ) {
      referralBlocks.push(buildReferralHtml(log));
    }
    if (log.action_type === "submit" || log.action_type === "complete") {
      if (includeOptions.diagnosis) {
        diagnosisRows.push(...collectSchemaFieldsFromLog(log, "diagnosis"));
      }
      if (includeOptions.treatment) {
        treatmentRows.push(...collectSchemaFieldsFromLog(log, "treatment"));
      }
      if (includeOptions.lab_results) {
        labRows.push(...collectSchemaFieldsFromLog(log, "lab"));
      }
      if (includeOptions.procedure_notes) {
        procedureRows.push(...collectSchemaFieldsFromLog(log, "procedure"));
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
      ? prescriptionBlocks.join("")
      : "",
    section_lab_results: includeOptions.lab_results
      ? rowsToHtml("Laboratory / investigations", dedupe(labRows))
      : "",
    section_procedure_notes: includeOptions.procedure_notes
      ? rowsToHtml("Procedure / clinical notes", dedupe(procedureRows))
      : "",
    section_referral: includeOptions.referral ? referralBlocks.join("") : "",
  };
}

module.exports = {
  buildWorkflowSectionHtml,
};
