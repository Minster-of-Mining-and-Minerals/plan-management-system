/** Screen preview + PDF export styles for medical certificates. */
export const MEDICAL_CERTIFICATE_PRINT_CSS = `
[data-certificate-export] {
  box-sizing: border-box;
  background: #ffffff;
  color: #111111;
}

.mc-document {
  box-sizing: border-box;
  font-family: Georgia, "Times New Roman", serif;
  color: #111111;
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  padding: 0;
  font-size: 11pt;
  line-height: 1.5;
}

.mc-header,
.mc-header-slot .mc-header {
  text-align: center;
  border-bottom: 2px solid #094c81;
  padding: 10px 12mm 12px;
  margin-bottom: 12px;
}

.mc-logo {
  display: block;
  max-height: 52px;
  max-width: 140px;
  margin: 0 auto 8px;
  object-fit: contain;
}

.mc-header h1 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: #094c81;
}

.mc-body {
  padding: 0 12mm 12px;
}

.mc-title {
  text-align: center;
  font-size: 1.1rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0 0 16px;
}

.mc-meta,
.mc-doctor,
.mc-notes {
  margin-bottom: 14px;
  font-size: 0.92rem;
}

.mc-section {
  margin-bottom: 10px;
}

.mc-section-block {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e5e5;
}

.mc-section-block h3 {
  font-size: 0.95rem;
  margin: 0 0 6px;
  color: #094c81;
}

.mc-section-block.mc-empty {
  opacity: 0.85;
}

.mc-list {
  margin: 6px 0 0 18px;
  padding: 0;
}

.mc-notes-body {
  min-height: 2rem;
  white-space: pre-wrap;
}

.mc-signature-block {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #cccccc;
}

.mc-signature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: end;
}

.mc-signature-image,
.mc-stamp-image {
  max-height: 56px;
  max-width: 180px;
  object-fit: contain;
}

.mc-signature-label {
  font-size: 0.75rem;
  margin-top: 4px;
  border-top: 1px solid #000;
  padding-top: 4px;
  text-align: center;
}

.mc-footer,
.mc-footer-slot .mc-footer {
  border-top: 1px solid #094c81;
  padding: 10px 12mm;
  margin-top: 16px;
  font-size: 0.78rem;
  color: #444444;
}

.mc-verification-hint {
  font-family: monospace;
  font-size: 0.72rem;
}

.mc-signature-placeholder,
.mc-stamp-placeholder {
  color: #888888;
  font-style: italic;
}
`;

export const MEDICAL_CERTIFICATE_VIEWPORT_CSS = `
[data-certificate-viewport] {
  width: 100%;
  max-width: 100%;
}

[data-certificate-viewport] [data-certificate-export] {
  width: min(794px, 100%);
  margin: 0 auto;
}
`;
