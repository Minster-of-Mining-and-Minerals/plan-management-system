"use strict";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(amount, currency = "ETB") {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildReceiptHtml(receipt) {
  const lines = (receipt.entries || [])
    .map(
      (line) => `
      <tr>
        <td>${escapeHtml(line.service_name)}</td>
        <td style="text-align:center">${escapeHtml(line.quantity)}</td>
        <td style="text-align:right">${formatMoney(line.unit_price, receipt.currency)}</td>
        <td style="text-align:right">${formatMoney(line.line_total, receipt.currency)}</td>
      </tr>`
    )
    .join("");

  const tenders = (receipt.tenders || [])
    .map(
      (t) => `
      <tr>
        <td>${escapeHtml(t.method.replace(/_/g, " "))}</td>
        <td style="text-align:right">${formatMoney(t.amount, receipt.currency)}</td>
        <td>${escapeHtml(t.reference || "—")}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(receipt.receipt_number)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .muted { color: #555; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px 4px; }
    th { text-align: left; font-size: 12px; color: #444; }
    .totals { margin-top: 16px; width: 280px; margin-left: auto; font-size: 13px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { font-weight: bold; font-size: 15px; border-top: 1px solid #111; margin-top: 6px; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>Payment Receipt</h1>
  <div class="muted">Receipt # ${escapeHtml(receipt.receipt_number)}</div>
  <div class="muted">Date: ${formatDateTime(receipt.paid_at)}</div>
  <div class="muted">Cashier: ${escapeHtml(receipt.cashier_name || "—")}</div>
  <div style="margin-top:12px">
    <strong>${escapeHtml(receipt.patient_name || "Patient")}</strong>
    <div class="muted">${escapeHtml(receipt.patient_code || "")}</div>
    <div class="muted">Visit: ${formatDateTime(receipt.appointment_at)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Service</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>

  <div class="totals">
    <div><span>Bill total</span><span>${formatMoney(receipt.account_grand_total, receipt.currency)}</span></div>
    <div><span>Previously paid</span><span>${formatMoney(receipt.previously_paid, receipt.currency)}</span></div>
    <div class="grand"><span>This payment</span><span>${formatMoney(receipt.amount, receipt.currency)}</span></div>
    <div><span>Remaining balance</span><span>${formatMoney(receipt.balance_due, receipt.currency)}</span></div>
  </div>

  <table>
    <thead>
      <tr><th>Payment method</th><th style="text-align:right">Amount</th><th>Reference</th></tr>
    </thead>
    <tbody>${tenders}</tbody>
  </table>

  ${receipt.reference_note ? `<p class="muted" style="margin-top:16px">Note: ${escapeHtml(receipt.reference_note)}</p>` : ""}
</body>
</html>`;
}

module.exports = {
  buildReceiptHtml,
  formatMoney,
  formatDateTime,
};
