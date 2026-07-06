"use strict";

/** Stable IDs for idempotent ophthalmology clinic demo seeding. */
const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";

const CLINICAL_DEPARTMENTS = [
  {
    department_id: "00000000-0000-4000-8000-000000000010",
    code: "RECEPTION",
    name: "Reception & Front Desk",
    slug: "reception-front-desk",
  },
  {
    department_id: "00000000-0000-4000-8000-000000000011",
    code: "OPHTHALMOLOGY",
    name: "Ophthalmology",
    slug: "ophthalmology",
  },
  {
    department_id: "00000000-0000-4000-8000-000000000012",
    code: "OPTOMETRY",
    name: "Optometry",
    slug: "optometry",
  },
  {
    department_id: "00000000-0000-4000-8000-000000000013",
    code: "LABORATORY",
    name: "Laboratory & Diagnostics",
    slug: "laboratory-diagnostics",
  },
  {
    department_id: "00000000-0000-4000-8000-000000000014",
    code: "IMAGING",
    name: "Ophthalmic Imaging",
    slug: "ophthalmic-imaging",
  },
  {
    department_id: "00000000-0000-4000-8000-000000000015",
    code: "OUTPATIENT",
    name: "General Outpatient",
    slug: "general-outpatient",
  },
  {
    department_id: "00000000-0000-4000-8000-000000000016",
    code: "PHARMACY_CLINIC",
    name: "Hospital Pharmacy",
    slug: "hospital-pharmacy",
  },
];

const CLINICAL_ROLES = [
  {
    role_id: "00000000-0000-4000-8000-000000000020",
    name: "Doctor",
    description: "Clinical physician — diagnosis, workflow, and prescribing.",
  },
  {
    role_id: "00000000-0000-4000-8000-000000000021",
    name: "Nurse",
    description: "Clinical nurse — assessment, workflow, and care documentation.",
  },
  {
    role_id: "00000000-0000-4000-8000-000000000022",
    name: "Receptionist",
    description: "Front desk — patient intake, scheduling, and workflow routing.",
  },
  {
    role_id: "00000000-0000-4000-8000-000000000023",
    name: "Lab Technician",
    description: "Laboratory staff — investigation reports and workflow handoffs.",
  },
  {
    role_id: "00000000-0000-4000-8000-000000000024",
    name: "Optometrist",
    description: "Optometry specialist — refraction and vision assessment.",
  },
];

const DEMO_EMAIL_DOMAIN = "@ophthalmology.demo";

/** Stable IDs for the ophthalmology walkthrough appointment (re-seed refreshes visit date to today). */
const DEMO_SCHEDULE_ID = "00000000-0000-4000-8000-000000000040";
const DEMO_APPOINTMENT_ID = "00000000-0000-4000-8000-000000000041";
const DEMO_NURSE_LOG_ID = "00000000-0000-4000-8000-000000000042";
const DEMO_FORWARD_LOG_ID = "00000000-0000-4000-8000-000000000043";
const DEMO_WORKFLOW_TASK_ID = "00000000-0000-4000-8000-000000000044";
const DEMO_PATIENT_EMAIL = "amanuel.tadesse@patient.demo.novacure";
const RECEPTION_STAFF_ID = "00000000-0000-4000-8000-000000000030";
const OPHTHALMOLOGIST_STAFF_ID = "00000000-0000-4000-8000-000000000031";
const NURSE_STAFF_ID = "00000000-0000-4000-8000-000000000032";
const LAB_STAFF_ID = "00000000-0000-4000-8000-000000000033";

/**
 * Demo staff for ophthalmology workflow presentations.
 * Password for all accounts: password
 */
const OPHTHALMOLOGY_DEMO_STAFF = [
  {
    user_id: "00000000-0000-4000-8000-000000000030",
    email: `reception${DEMO_EMAIL_DOMAIN}`,
    full_name: "Sara Bekele",
    phone_number: "251911100001",
    role_name: "Receptionist",
    department_code: "RECEPTION",
    title_code: "REC",
    job_title: "Front Desk Receptionist",
    employee_id: "OPH-REC-001",
    diagnosis: null,
  },
  {
    user_id: "00000000-0000-4000-8000-000000000031",
    email: `ophthalmologist${DEMO_EMAIL_DOMAIN}`,
    full_name: "Dr. Solomon Tesfaye",
    phone_number: "251911100002",
    role_name: "Doctor",
    department_code: "OPHTHALMOLOGY",
    title_code: "DR",
    job_title: "Consultant Ophthalmologist",
    employee_id: "OPH-DOC-001",
    is_dept_head: "OPHTHALMOLOGY",
    diagnosis: {
      template_title: "Ophthalmology Comprehensive Examination",
      config_title: "Ophthalmology Comprehensive Examination",
    },
  },
  {
    user_id: "00000000-0000-4000-8000-000000000032",
    email: `nurse${DEMO_EMAIL_DOMAIN}`,
    full_name: "Hanna Mekonnen",
    phone_number: "251911100003",
    role_name: "Nurse",
    department_code: "OPHTHALMOLOGY",
    title_code: "NURSE",
    job_title: "Ophthalmic Nurse",
    employee_id: "OPH-NUR-001",
    diagnosis: {
      template_title: "Nurse Assessment Form",
      config_title: "Ophthalmic Nursing Assessment",
    },
  },
  {
    user_id: "00000000-0000-4000-8000-000000000033",
    email: `laboratory${DEMO_EMAIL_DOMAIN}`,
    full_name: "Meron Haile",
    phone_number: "251911100004",
    role_name: "Lab Technician",
    department_code: "LABORATORY",
    title_code: "TECH",
    job_title: "Medical Laboratory Technologist",
    employee_id: "OPH-LAB-001",
    diagnosis: {
      template_title: "Ophthalmology Laboratory Report",
      config_title: "Laboratory & Investigation Report",
    },
  },
  {
    user_id: "00000000-0000-4000-8000-000000000034",
    email: `imaging${DEMO_EMAIL_DOMAIN}`,
    full_name: "Dawit Alemu",
    phone_number: "251911100005",
    role_name: "Lab Technician",
    department_code: "IMAGING",
    title_code: "TECH",
    job_title: "Ophthalmic Imaging Technologist",
    employee_id: "OPH-IMG-001",
    diagnosis: {
      template_title: "General Doctor Diagnosis",
      config_title: "Ophthalmic Imaging Report",
    },
  },
  {
    user_id: "00000000-0000-4000-8000-000000000035",
    email: `optometrist${DEMO_EMAIL_DOMAIN}`,
    full_name: "Dr. Ruth Girma",
    phone_number: "251911100006",
    role_name: "Optometrist",
    department_code: "OPTOMETRY",
    title_code: "DR",
    job_title: "Senior Optometrist",
    employee_id: "OPH-OPT-001",
    is_dept_head: "OPTOMETRY",
    diagnosis: {
      template_title: "General Doctor Diagnosis",
      config_title: "Refraction & Visual Assessment",
    },
  },
  {
    user_id: "00000000-0000-4000-8000-000000000036",
    email: `pharmacist${DEMO_EMAIL_DOMAIN}`,
    full_name: "Yonas Kebede",
    phone_number: "251911100007",
    role_name: "Nurse",
    department_code: "PHARMACY_CLINIC",
    title_code: "PHARM",
    job_title: "Clinical Pharmacist",
    employee_id: "OPH-PHM-001",
    diagnosis: null,
  },
];

const ROLE_PERMISSION_MATRIX = {
  Doctor: {
    patients: ["read", "receive_patient"],
    workflow: ["read", "submit", "forward", "return", "prescribe", "complete"],
    diagnosis_forms: ["read"],
    clinical_suggestion: ["read"],
  },
  Nurse: {
    patients: ["read", "receive_patient"],
    workflow: ["read", "submit", "forward", "return", "prescribe", "complete"],
    diagnosis_forms: ["read"],
    clinical_suggestion: ["read"],
  },
  Receptionist: {
    patients: ["read", "receive_patient", "schedule", "create"],
    workflow: ["read", "submit", "forward", "return", "complete"],
    diagnosis_forms: ["read"],
    clinical_suggestion: ["read"],
  },
  "Lab Technician": {
    patients: ["read", "receive_patient"],
    workflow: ["read", "submit", "forward", "return", "complete"],
    diagnosis_forms: ["read"],
    clinical_suggestion: ["read"],
  },
  Optometrist: {
    patients: ["read", "receive_patient"],
    workflow: ["read", "submit", "forward", "return", "complete"],
    diagnosis_forms: ["read"],
    clinical_suggestion: ["read"],
  },
};

module.exports = {
  ADMIN_USER_ID,
  CLINICAL_DEPARTMENTS,
  CLINICAL_ROLES,
  DEMO_EMAIL_DOMAIN,
  DEMO_SCHEDULE_ID,
  DEMO_APPOINTMENT_ID,
  DEMO_NURSE_LOG_ID,
  DEMO_FORWARD_LOG_ID,
  DEMO_WORKFLOW_TASK_ID,
  DEMO_PATIENT_EMAIL,
  RECEPTION_STAFF_ID,
  OPHTHALMOLOGIST_STAFF_ID,
  NURSE_STAFF_ID,
  LAB_STAFF_ID,
  OPHTHALMOLOGY_DEMO_STAFF,
  ROLE_PERMISSION_MATRIX,
};
