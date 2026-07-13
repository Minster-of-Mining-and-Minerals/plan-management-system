"use strict";

/**
 * Ordered steps for 20260101000000-complete-database-schema.js
 * Paths point to archive/pre-squash/ after running scripts/archive-pre-squash-migrations.js
 */
const BASE = "../../archive/pre-squash";

module.exports = [
  require(`${BASE}/20260101000001-create-permissions-and-rbac`),
  require(`${BASE}/20260101000002-create-users`),
  require(`${BASE}/20260101000003-create-user-rbac-junctions`),
  require(`${BASE}/20260101000004-create-departments-and-user-titles`),
  require(`${BASE}/20260101000005-create-user-profiles`),
  require(`${BASE}/20260101000006-create-form-field-system`),
  require(`${BASE}/20260101000007-create-system-branding-and-audit-logs`),
  require(`${BASE}/20260101000008-create-attachments`),
  require(`${BASE}/20260103000001-create-patient-schedules`),
  require(`${BASE}/20260104000001-create-staff-appointments-and-notifications`),
  require(`${BASE}/20260105000001-create-diagnosis-form-system`),
  require(`${BASE}/20260106000001-create-diagnosis-templates`),
  require(`${BASE}/20260109000001-create-medical-workflow`),
  require(`${BASE}/20260528000001-create-prescription-ecosystem`),
  require(`${BASE}/20260608000001-create-pharmacy-ecosystem`),
  require(`${BASE}/20260609000001-create-prescription-pharmacy-forwards`),
  require(`${BASE}/20260610000001-pharmacy-forward-lifecycle`),
  require(`${BASE}/20260612000001-create-medical-certificate-ecosystem`),
  require(`${BASE}/20260612000002-create-medical-diagrams`),
  require(`${BASE}/20260613000001-create-medical-diagram-categories`),
  require(`${BASE}/20260614000001-create-clinical-suggestions`),
  require(`${BASE}/20260615000001-seed-ophthalmology-diagnosis-template`),
  require(`${BASE}/20260706000001-seed-ophthalmology-lab-report-template`),
  require(`${BASE}/20260707000001-upgrade-ophthalmology-form-engine-v2`),
  require(`${BASE}/20260712000001-create-billing-ecosystem`),
];
