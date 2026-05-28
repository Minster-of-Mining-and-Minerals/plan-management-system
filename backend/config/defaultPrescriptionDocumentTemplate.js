"use strict";

const DEFAULT_PRESCRIPTION_DOCUMENT_HTML = `<div class="rx-document">
  <header class="rx-header">
    {{hospital_logo_block}}
    <h1>{{hospital_name}}</h1>
    <p>{{hospital_location}}</p>
    <p>{{contact_phone}} · {{contact_email}}</p>
    {{license_info_block}}
  </header>
  <section class="rx-patient">
    <p><strong>Patient:</strong> {{patient_name}} ({{patient_id}})</p>
    <p><strong>Age / Sex:</strong> {{patient_age}} / {{patient_sex}}</p>
    <p><strong>Visit:</strong> {{visit_id}} · {{visit_date}}</p>
  </section>
  <section class="rx-prescriber">
    <p><strong>Prescriber:</strong> {{doctor_name}}, {{doctor_title}}</p>
    <p>{{doctor_specialization}} · {{doctor_department}}</p>
  </section>
  <section class="rx-body">{{prescriptions}}</section>
  <footer class="rx-footer">
    <div class="rx-signature">{{signature}}</div>
    <p>Date: {{signature_date}}</p>
  </footer>
</div>`;

module.exports = { DEFAULT_PRESCRIPTION_DOCUMENT_HTML };
