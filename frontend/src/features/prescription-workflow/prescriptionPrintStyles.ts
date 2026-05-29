/** Screen preview + print/export styles for prescription documents. */
export const PRESCRIPTION_PRINT_CSS = `
[data-prescription-export] {
  box-sizing: border-box;
  background: #ffffff;
  color: #111111;
}

.rx-document {
  box-sizing: border-box;
  font-family: Georgia, "Times New Roman", serif;
  color: #111111;
  width: 100%;
  max-width: 148mm;
  margin: 0 auto;
  padding: 8mm 10mm;
  font-size: 10pt;
  line-height: 1.45;
}

.rx-header {
  text-align: center;
  border-bottom: 2px solid #094c81;
  padding-bottom: 10px;
  margin-bottom: 12px;
}

.rx-logo {
  display: block;
  max-height: 48px;
  max-width: 120px;
  width: auto;
  height: auto;
  margin: 0 auto 6px;
  object-fit: contain;
}

.rx-header h1 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: #094c81;
}

.rx-header p {
  margin: 2px 0;
  font-size: 0.8rem;
}

.rx-patient,
.rx-prescriber {
  font-size: 0.8rem;
  margin-bottom: 10px;
  line-height: 1.5;
}

.rx-patient p,
.rx-prescriber p {
  margin: 2px 0;
}

.rx-body {
  margin: 12px 0;
}

.rx-items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
  table-layout: fixed;
}

.rx-items-table th,
.rx-items-table td {
  border: 1px solid #000000;
  padding: 4px 6px;
  text-align: left;
  vertical-align: top;
  word-wrap: break-word;
}

.rx-items-table th {
  background: #f5f5f5;
  font-weight: 600;
  border-color: #000000;
}

.rx-item-notes td {
  font-size: 0.68rem;
  color: #444444;
}

.rx-footer {
  margin-top: 16px;
  border-top: 1px solid #000000;
  padding-top: 12px;
}

.rx-signature-image {
  display: block;
  max-height: 48px;
  max-width: 160px;
  width: auto;
  height: auto;
  object-fit: contain;
}

.rx-signature-placeholder {
  color: #888888;
  font-style: italic;
  margin: 0;
}

.rx-license {
  font-size: 0.7rem;
  color: #666666;
  margin-top: 4px;
}

.rx-empty {
  color: #888888;
  font-style: italic;
}

/* Glasses / ophthalmic prescription layout */
.rx-document-glasses .rx-glasses-title {
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 10px;
  color: #094c81;
}

.rx-glasses-patient-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  font-size: 0.8rem;
}

.rx-glasses-meta {
  margin: 12px 0;
  padding: 8px 0;
  border-top: 1px solid #000000;
  border-bottom: 1px solid #000000;
  font-size: 0.78rem;
}

.rx-glasses-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}

.rx-glasses-prescriber-line {
  margin: 6px 0 0;
  font-size: 0.75rem;
  color: #444444;
}

.rx-glasses-table .rx-glasses-eye-label {
  font-weight: 700;
  text-align: left;
  background: #f5f5f5;
  width: 22%;
}

.rx-glasses-table th.rx-glasses-eye-col {
  width: 22%;
}

.rx-glasses-dispensing {
  margin-top: 12px;
  font-size: 0.72rem;
  line-height: 1.45;
}

.rx-glasses-section-label {
  font-weight: 700;
  font-size: 0.78rem;
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.rx-glasses-dispensing-list {
  margin: 0 0 8px;
  padding-left: 1.1rem;
}

.rx-glasses-dispensing-list li {
  margin-bottom: 3px;
}

.rx-glasses-clinical-notes {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid #000000;
}

.rx-glasses-notes-body {
  font-size: 0.78rem;
  line-height: 1.5;
  min-height: 2.5rem;
  white-space: pre-wrap;
}

.rx-glasses-footer {
  margin-top: 16px;
}

.rx-glasses-signature-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  align-items: end;
}

.rx-signature-block {
  text-align: center;
}

.rx-signature-label {
  font-size: 0.7rem;
  color: #444444;
  margin: 4px 0 0;
  border-top: 1px solid #000000;
  padding-top: 4px;
}

.rx-print-name,
.rx-print-date {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  min-height: 2rem;
}

.rx-glasses-extra-row td {
  font-size: 0.72rem;
  background: #fafafa;
}

@media print {
  @page {
    size: A5 portrait;
    margin: 8mm 10mm;
  }

  [data-prescription-export],
  .rx-document {
    box-shadow: none !important;
    max-width: 148mm;
    width: 100%;
  }
}

`;
