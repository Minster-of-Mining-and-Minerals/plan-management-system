/** Mirrors backend/config/glassesPrescriptionDocumentTemplate.js for editor preview. */
export const GLASSES_PRESCRIPTION_DOCUMENT_HTML = `<div class="rx-document rx-document-glasses">
  <header class="rx-header">
    {{hospital_logo_block}}
    <h1>{{hospital_name}}</h1>
    <p>{{hospital_location}}</p>
    <p>{{contact_phone}} · {{contact_email}}</p>
    {{license_info_block}}
  </header>

  <section class="rx-patient rx-glasses-patient">
    <p class="rx-glasses-title">Glasses prescription</p>
    <div class="rx-glasses-patient-grid">
      <p><strong>Patient:</strong> {{patient_name}}</p>
      <p><strong>Patient ID:</strong> {{patient_id}}</p>
      <p><strong>Age / Sex:</strong> {{patient_age}} / {{patient_sex}}</p>
      <p><strong>Visit:</strong> {{visit_id}} · {{visit_date}}</p>
      <p><strong>Diagnosis:</strong> {{diagnosis}}</p>
      <p><strong>Visual acuity (OD/OS):</strong> {{visual_acuity}}</p>
    </div>
  </section>

  <section class="rx-glasses-meta">
    <div class="rx-glasses-meta-grid">
      <p><strong>Date of refraction:</strong> {{refraction_date}}</p>
      <p><strong>Date of prescription:</strong> {{prescription_date}}</p>
      <p><strong>Consultant:</strong> {{doctor_name}}, {{doctor_title}}</p>
      <p><strong>Refraction type:</strong> {{refraction_type}}</p>
    </div>
    <p class="rx-glasses-prescriber-line">
      {{doctor_specialization}} · {{doctor_department}}
    </p>
  </section>

  <section class="rx-body rx-glasses-body">
    {{glasses_rx_table}}
  </section>

  <section class="rx-glasses-dispensing">
    <p class="rx-glasses-section-label">Information for dispensing practice</p>
    <ul class="rx-glasses-dispensing-list">
      <li>All prescriptions distributed are ready to dispense unless otherwise specified.</li>
      <li>All glasses are to be worn full time unless otherwise specified.</li>
      <li>Please assess pupillary distance (PD) at dispensing unless specified above.</li>
    </ul>
    <p class="rx-glasses-additional"><strong>Additional information:</strong> {{additional_info}}</p>
    <p class="rx-glasses-lens-options"><strong>Lens / frame options:</strong> {{lens_frame_options}}</p>
    <p class="rx-glasses-near-add"><strong>Near addition instructions:</strong> {{near_addition_instructions}}</p>
  </section>

  <section class="rx-glasses-clinical-notes">
    <p class="rx-glasses-section-label">Clinical notes</p>
    <div class="rx-glasses-notes-body">{{clinical_notes}}</div>
  </section>

  <footer class="rx-footer rx-glasses-footer">
    <div class="rx-glasses-signature-row">
      <div class="rx-signature-block">
        <div class="rx-signature">{{signature}}</div>
        <p class="rx-signature-label">Signature</p>
      </div>
      <div class="rx-signature-block">
        <p class="rx-print-name">{{doctor_name}}</p>
        <p class="rx-signature-label">Print name</p>
      </div>
      <div class="rx-signature-block">
        <p class="rx-print-date">{{signature_date}}</p>
        <p class="rx-signature-label">Date</p>
      </div>
    </div>
  </footer>
</div>`;
