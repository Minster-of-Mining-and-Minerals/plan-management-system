export const PRESCRIPTION_PRINT_CSS = `
.rx-document { font-family: Georgia, "Times New Roman", serif; color: #111; max-width: 800px; margin: 0 auto; padding: 24px; }
.rx-header { text-align: center; border-bottom: 2px solid hsl(var(--primary)); padding-bottom: 12px; margin-bottom: 16px; }
.rx-logo { max-height: 56px; margin: 0 auto 8px; display: block; }
.rx-header h1 { font-size: 1.35rem; font-weight: 700; margin: 0; color: hsl(var(--primary)); }
.rx-patient, .rx-prescriber { font-size: 0.85rem; margin-bottom: 12px; line-height: 1.5; }
.rx-body { margin: 16px 0; }
.rx-items-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.rx-items-table th, .rx-items-table td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
.rx-items-table th { background: #f5f5f5; font-weight: 600; }
.rx-item-notes td { font-size: 0.75rem; color: #444; }
.rx-footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 16px; }
.rx-signature-image { max-height: 64px; max-width: 200px; }
.rx-signature-placeholder { color: #888; font-style: italic; }
.rx-license { font-size: 0.75rem; color: #666; margin-top: 4px; }
.rx-empty { color: #888; font-style: italic; }
@media print {
  .rx-document { padding: 12mm; box-shadow: none; }
}
`;
