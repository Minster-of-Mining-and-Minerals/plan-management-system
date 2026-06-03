"use strict";

const DEFAULT_MEDICAL_CERTIFICATE_HEADER_HTML = `<header class="mc-header">
  {{hospital_logo_block}}
  <h1>{{hospital_name}}</h1>
  <p class="mc-hospital-address">{{hospital_location}}</p>
  <p class="mc-hospital-contact">{{contact_phone}} · {{contact_email}}</p>
  {{license_info_block}}
</header>`;

const DEFAULT_MEDICAL_CERTIFICATE_FOOTER_HTML = `<footer class="mc-footer">
  <div class="mc-verification">
    <p><strong>Certificate ID:</strong> {{certificate_number}}</p>
    <p class="mc-verification-hint">{{verification_hint}}</p>
  </div>
  <p class="mc-footer-note">This document was generated electronically and is valid without a wet signature when digitally verified.</p>
</footer>`;

const DEFAULT_MEDICAL_CERTIFICATE_BODY_HTML = `<div class="mc-document" data-certificate-root>
  <div data-certificate-header class="mc-header-slot">{{certificate_header}}</div>
  <main class="mc-body" data-certificate-body>
    <h2 class="mc-title">Medical Certificate</h2>
    <section class="mc-meta">
      <p><strong>Patient:</strong> {{patient_name}} ({{patient_id}})</p>
      <p><strong>Age / Gender:</strong> {{patient_age}} / {{patient_gender}}</p>
      <p><strong>Visit date:</strong> {{visit_date}} · <strong>Department / service:</strong> {{visit_department}} · {{visit_service}}</p>
    </section>
    <section class="mc-doctor">
      <p><strong>Attending physician:</strong> {{doctor_name}}{{doctor_title_block}}</p>
      <p>{{doctor_specialization}} · {{doctor_department}}</p>
      {{doctor_license_block}}
    </section>
    <section class="mc-section">{{section_diagnosis}}</section>
    <section class="mc-section">{{section_treatment}}</section>
    <section class="mc-section">{{section_prescription}}</section>
    <section class="mc-section">{{section_lab_results}}</section>
    <section class="mc-section">{{section_procedure_notes}}</section>
    <section class="mc-section">{{section_referral}}</section>
    <section class="mc-notes">
      <h3>Remarks</h3>
      <div class="mc-notes-body">{{doctor_remarks}}</div>
    </section>
    <section class="mc-signature-block">
      <div class="mc-signature-row">
        <div class="mc-signature-col">
          <div class="mc-signature-image-wrap">{{signature}}</div>
          <p class="mc-signature-label">Physician signature</p>
        </div>
        <div class="mc-signature-col mc-stamp-col">{{hospital_stamp}}</div>
      </div>
      <p class="mc-signed-date"><strong>Signed:</strong> {{signature_date}}</p>
    </section>
  </main>
  <div data-certificate-footer class="mc-footer-slot">{{certificate_footer}}</div>
</div>`;

module.exports = {
  DEFAULT_MEDICAL_CERTIFICATE_HEADER_HTML,
  DEFAULT_MEDICAL_CERTIFICATE_FOOTER_HTML,
  DEFAULT_MEDICAL_CERTIFICATE_BODY_HTML,
};
