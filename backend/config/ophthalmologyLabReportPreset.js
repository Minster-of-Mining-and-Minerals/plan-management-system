"use strict";

const OPHTHALMOLOGY_LAB_TEMPLATE_TITLE = "Ophthalmology Laboratory Report";
const OPHTHALMOLOGY_LAB_TEMPLATE_DESCRIPTION =
  "Structured lab investigation report for ophthalmology clinics — diabetic screening, inflammation markers, and metabolic panels.";

const OPHTHALMOLOGY_LAB_SECTIONS = [
  "Request Summary",
  "Hematology",
  "Biochemistry",
  "Inflammation & Infection",
  "Interpretation",
  "Notes",
];

function buildOphthalmologyLabGroups() {
  return OPHTHALMOLOGY_LAB_SECTIONS.map((title, index) => ({
    title,
    description: null,
    sort_order: index,
    is_visible: true,
    is_required: false,
  }));
}

function buildOphthalmologyLabFields() {
  return [
    {
      section: "Request Summary",
      field_key: "oph_lab_ordered_tests",
      label: "Ordered tests",
      field_type: "textarea",
      is_required: true,
      sort_order: 0,
      config: {
        placeholder:
          "e.g. FBS, HbA1c, ESR, CRP, lipid profile, renal function",
      },
    },
    {
      section: "Request Summary",
      field_key: "oph_lab_clinical_indication",
      label: "Clinical indication",
      field_type: "textarea",
      sort_order: 1,
      config: {
        placeholder: "e.g. Diabetic retinopathy screening, uveitis workup",
      },
    },
    {
      section: "Request Summary",
      field_key: "oph_lab_priority",
      label: "Priority",
      field_type: "select",
      sort_order: 2,
      config: { options: ["Routine", "Urgent", "STAT"] },
    },
    {
      section: "Hematology",
      field_key: "oph_lab_hb",
      label: "Hemoglobin (g/dL)",
      field_type: "number",
      sort_order: 0,
    },
    {
      section: "Hematology",
      field_key: "oph_lab_wbc",
      label: "WBC (×10³/µL)",
      field_type: "number",
      sort_order: 1,
    },
    {
      section: "Hematology",
      field_key: "oph_lab_platelets",
      label: "Platelets (×10³/µL)",
      field_type: "number",
      sort_order: 2,
    },
    {
      section: "Biochemistry",
      field_key: "oph_lab_fbs",
      label: "Fasting blood sugar (mg/dL)",
      field_type: "number",
      sort_order: 0,
    },
    {
      section: "Biochemistry",
      field_key: "oph_lab_hba1c",
      label: "HbA1c (%)",
      field_type: "number",
      sort_order: 1,
    },
    {
      section: "Biochemistry",
      field_key: "oph_lab_creatinine",
      label: "Serum creatinine (mg/dL)",
      field_type: "number",
      sort_order: 2,
    },
    {
      section: "Biochemistry",
      field_key: "oph_lab_urea",
      label: "Blood urea (mg/dL)",
      field_type: "number",
      sort_order: 3,
    },
    {
      section: "Inflammation & Infection",
      field_key: "oph_lab_esr",
      label: "ESR (mm/hr)",
      field_type: "number",
      sort_order: 0,
    },
    {
      section: "Inflammation & Infection",
      field_key: "oph_lab_crp",
      label: "CRP (mg/L)",
      field_type: "number",
      sort_order: 1,
    },
    {
      section: "Inflammation & Infection",
      field_key: "oph_lab_rheumatoid_factor",
      label: "Rheumatoid factor",
      field_type: "select",
      sort_order: 2,
      config: { options: ["Negative", "Positive", "Not done"] },
    },
    {
      section: "Interpretation",
      field_key: "oph_lab_interpretation",
      label: "Lab interpretation",
      field_type: "richtext",
      is_required: true,
      sort_order: 0,
      config: {
        placeholder: "Summarize abnormal values and relevance to eye disease",
      },
    },
    {
      section: "Interpretation",
      field_key: "oph_lab_critical_values",
      label: "Critical values notified",
      field_type: "switch",
      sort_order: 1,
    },
    {
      section: "Notes",
      field_key: "oph_lab_technician_notes",
      label: "Technician notes",
      field_type: "textarea",
      sort_order: 0,
    },
  ];
}

module.exports = {
  OPHTHALMOLOGY_LAB_TEMPLATE_TITLE,
  OPHTHALMOLOGY_LAB_TEMPLATE_DESCRIPTION,
  OPHTHALMOLOGY_LAB_SECTIONS,
  buildOphthalmologyLabGroups,
  buildOphthalmologyLabFields,
};
