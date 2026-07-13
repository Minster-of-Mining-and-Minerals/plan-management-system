"use strict";

const { escapeHtml, formatMoney, formatDateTime, buildLineItemsHtml, buildTendersHtml } = require("./cashierReceipt");

function replaceAll(template, key, value) {
  return template.split(`{{${key}}}`).join(value ?? "");
}

function renderReceiptFromTemplate(templateHtml, receipt, branding = {}) {
  const hospitalName = branding.hospital_name || "Payment Receipt";
  const referenceNoteBlock = receipt.reference_note
    ? `<p class="muted" style="margin-top:16px">Note: ${escapeHtml(receipt.reference_note)}</p>`
    : "";

  const values = {
    hospital_name: escapeHtml(hospitalName),
    receipt_number: escapeHtml(receipt.receipt_number),
    paid_at: formatDateTime(receipt.paid_at),
    cashier_name: escapeHtml(receipt.cashier_name || "—"),
    patient_name: escapeHtml(receipt.patient_name || "Patient"),
    patient_code: escapeHtml(receipt.patient_code || ""),
    appointment_at: formatDateTime(receipt.appointment_at),
    line_items: buildLineItemsHtml(receipt.entries || [], receipt.currency),
    account_grand_total: formatMoney(receipt.account_grand_total, receipt.currency),
    previously_paid: formatMoney(receipt.previously_paid, receipt.currency),
    amount: formatMoney(receipt.amount, receipt.currency),
    balance_due: formatMoney(receipt.balance_due, receipt.currency),
    tenders: buildTendersHtml(receipt.tenders || [], receipt.currency),
    reference_note_block: referenceNoteBlock,
  };

  let html = templateHtml;
  for (const [key, value] of Object.entries(values)) {
    html = replaceAll(html, key, value);
  }
  return html;
}

module.exports = {
  renderReceiptFromTemplate,
};
