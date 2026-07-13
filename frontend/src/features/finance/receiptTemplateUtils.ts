export const DEFAULT_RECEIPT_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt {{receipt_number}}</title>
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
  <h1>{{hospital_name}}</h1>
  <div class="muted">Payment Receipt</div>
  <div class="muted">Receipt # {{receipt_number}}</div>
  <div class="muted">Date: {{paid_at}}</div>
  <div class="muted">Cashier: {{cashier_name}}</div>
  <div style="margin-top:12px">
    <strong>{{patient_name}}</strong>
    <div class="muted">{{patient_code}}</div>
    <div class="muted">Visit: {{appointment_at}}</div>
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
    <tbody>{{line_items}}</tbody>
  </table>
  <div class="totals">
    <div><span>Bill total</span><span>{{account_grand_total}}</span></div>
    <div><span>Previously paid</span><span>{{previously_paid}}</span></div>
    <div class="grand"><span>This payment</span><span>{{amount}}</span></div>
    <div><span>Remaining balance</span><span>{{balance_due}}</span></div>
  </div>
  <table>
    <thead>
      <tr><th>Payment method</th><th style="text-align:right">Amount</th><th>Reference</th></tr>
    </thead>
    <tbody>{{tenders}}</tbody>
  </table>
  {{reference_note_block}}
</body>
</html>`;
