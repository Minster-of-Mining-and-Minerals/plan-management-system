"use strict";

const { DEFAULT_DIAGNOSIS_SECTIONS } = require("./diagnosisFormConstants");

const buildGroups = (sections) =>
  sections.map((title, index) => ({
    title,
    description: null,
    sort_order: index,
    is_visible: true,
    is_required: false,
  }));

/** Baseline section titles seeded for a standalone staff diagnosis form config. */
const DEFAULT_DIAGNOSIS_GROUPS = buildGroups(DEFAULT_DIAGNOSIS_SECTIONS);

/** Baseline fields used for direct staff form creation (no template source). */
const DEFAULT_DIAGNOSIS_FIELDS = [
  {
    section: "Vital Signs",
    field_key: "blood_pressure",
    label: "Blood pressure",
    field_type: "input",
    sort_order: 0,
    config: { placeholder: "e.g. 120/80" },
  },
  {
    section: "Vital Signs",
    field_key: "heart_rate",
    label: "Heart rate (bpm)",
    field_type: "number",
    sort_order: 1,
  },
  {
    section: "Vital Signs",
    field_key: "temperature",
    label: "Temperature (°C)",
    field_type: "number",
    sort_order: 2,
  },
  {
    section: "Symptoms",
    field_key: "chief_complaint",
    label: "Chief complaint",
    field_type: "textarea",
    is_required: true,
    sort_order: 0,
  },
  {
    section: "Symptoms",
    field_key: "symptom_duration",
    label: "Duration",
    field_type: "input",
    sort_order: 1,
  },
  {
    section: "Examination",
    field_key: "physical_examination",
    label: "Physical examination",
    field_type: "textarea",
    sort_order: 0,
  },
  {
    section: "Observation",
    field_key: "clinical_observation",
    label: "Clinical observation",
    field_type: "richtext",
    sort_order: 0,
  },
  {
    section: "Notes",
    field_key: "clinical_notes",
    label: "Clinical notes",
    field_type: "textarea",
    sort_order: 0,
  },
  {
    section: "Laboratory Requests",
    field_key: "lab_requests",
    label: "Requested tests",
    field_type: "textarea",
    sort_order: 0,
    config: { placeholder: "List laboratory tests if needed" },
  },
];

const TEMPLATE_PRESETS = {
  "General Doctor Diagnosis": {
    groups: buildGroups([
      "Patient Summary",
      "Vital Signs",
      "Symptoms",
      "Examination",
      "Assessment & Plan",
      "Laboratory Requests",
      "Notes",
    ]),
    fields: [
      {
        section: "Patient Summary",
        field_key: "visit_reason",
        label: "Visit reason",
        field_type: "textarea",
        is_required: true,
        sort_order: 0,
      },
      {
        section: "Vital Signs",
        field_key: "blood_pressure",
        label: "Blood pressure",
        field_type: "input",
        sort_order: 0,
        config: { placeholder: "e.g. 120/80" },
      },
      {
        section: "Vital Signs",
        field_key: "heart_rate",
        label: "Heart rate (bpm)",
        field_type: "number",
        sort_order: 1,
      },
      {
        section: "Symptoms",
        field_key: "chief_complaint",
        label: "Chief complaint",
        field_type: "textarea",
        is_required: true,
        sort_order: 0,
      },
      {
        section: "Examination",
        field_key: "physical_exam_findings",
        label: "Physical examination findings",
        field_type: "textarea",
        sort_order: 0,
      },
      {
        section: "Assessment & Plan",
        field_key: "working_diagnosis",
        label: "Working diagnosis",
        field_type: "textarea",
        is_required: true,
        sort_order: 0,
      },
      {
        section: "Assessment & Plan",
        field_key: "treatment_plan",
        label: "Treatment plan",
        field_type: "richtext",
        sort_order: 1,
      },
      {
        section: "Laboratory Requests",
        field_key: "lab_requests",
        label: "Requested tests",
        field_type: "textarea",
        sort_order: 0,
      },
      {
        section: "Notes",
        field_key: "clinical_notes",
        label: "Clinical notes",
        field_type: "textarea",
        sort_order: 0,
      },
    ],
  },
  "Emergency Diagnosis": {
    groups: buildGroups([
      "Triage",
      "Immediate Assessment",
      "Emergency Interventions",
      "Observation",
      "Disposition",
      "Notes",
    ]),
    fields: [
      {
        section: "Triage",
        field_key: "triage_priority",
        label: "Triage priority",
        field_type: "select",
        is_required: true,
        sort_order: 0,
        config: { options: ["Resuscitation", "Emergency", "Urgent", "Less Urgent"] },
      },
      {
        section: "Triage",
        field_key: "arrival_mode",
        label: "Arrival mode",
        field_type: "select",
        sort_order: 1,
        config: { options: ["Walk-in", "Ambulance", "Referral"] },
      },
      {
        section: "Immediate Assessment",
        field_key: "airway_status",
        label: "Airway status",
        field_type: "select",
        sort_order: 0,
        config: { options: ["Patent", "Compromised", "Obstructed"] },
      },
      {
        section: "Immediate Assessment",
        field_key: "glasgow_coma_scale",
        label: "Glasgow coma scale",
        field_type: "number",
        sort_order: 1,
      },
      {
        section: "Emergency Interventions",
        field_key: "immediate_interventions",
        label: "Immediate interventions",
        field_type: "textarea",
        sort_order: 0,
      },
      {
        section: "Observation",
        field_key: "response_to_intervention",
        label: "Response to interventions",
        field_type: "textarea",
        sort_order: 0,
      },
      {
        section: "Disposition",
        field_key: "disposition",
        label: "Disposition",
        field_type: "radio",
        sort_order: 0,
        config: { options: ["Admit", "Transfer", "Discharge", "ICU"] },
      },
      {
        section: "Notes",
        field_key: "emergency_notes",
        label: "Emergency notes",
        field_type: "textarea",
        sort_order: 0,
      },
    ],
  },
  "Pediatric Diagnosis": {
    groups: buildGroups([
      "Pediatric Intake",
      "Growth & Development",
      "Symptoms",
      "Examination",
      "Assessment & Plan",
      "Notes",
    ]),
    fields: [
      {
        section: "Pediatric Intake",
        field_key: "guardian_name",
        label: "Guardian name",
        field_type: "input",
        is_required: true,
        sort_order: 0,
      },
      {
        section: "Pediatric Intake",
        field_key: "immunization_status",
        label: "Immunization status",
        field_type: "select",
        sort_order: 1,
        config: { options: ["Up to date", "Delayed", "Unknown"] },
      },
      {
        section: "Growth & Development",
        field_key: "weight_kg",
        label: "Weight (kg)",
        field_type: "number",
        sort_order: 0,
      },
      {
        section: "Growth & Development",
        field_key: "height_cm",
        label: "Height (cm)",
        field_type: "number",
        sort_order: 1,
      },
      {
        section: "Symptoms",
        field_key: "pediatric_chief_complaint",
        label: "Chief complaint",
        field_type: "textarea",
        is_required: true,
        sort_order: 0,
      },
      {
        section: "Examination",
        field_key: "developmental_observation",
        label: "Developmental observations",
        field_type: "textarea",
        sort_order: 0,
      },
      {
        section: "Assessment & Plan",
        field_key: "pediatric_plan",
        label: "Pediatric care plan",
        field_type: "richtext",
        sort_order: 0,
      },
      {
        section: "Notes",
        field_key: "pediatric_notes",
        label: "Additional notes",
        field_type: "textarea",
        sort_order: 0,
      },
    ],
  },
  "Cardiology Diagnosis": {
    groups: buildGroups([
      "Cardiac Symptoms",
      "Cardiac Vitals",
      "Examination",
      "Investigations",
      "Cardiology Assessment",
      "Notes",
    ]),
    fields: [
      {
        section: "Cardiac Symptoms",
        field_key: "chest_pain_type",
        label: "Chest pain type",
        field_type: "select",
        is_required: true,
        sort_order: 0,
        config: { options: ["Typical", "Atypical", "Non-cardiac", "No chest pain"] },
      },
      {
        section: "Cardiac Symptoms",
        field_key: "dyspnea_grade",
        label: "Dyspnea grade",
        field_type: "select",
        sort_order: 1,
        config: { options: ["NYHA I", "NYHA II", "NYHA III", "NYHA IV"] },
      },
      {
        section: "Cardiac Vitals",
        field_key: "cardiac_blood_pressure",
        label: "Blood pressure",
        field_type: "input",
        sort_order: 0,
      },
      {
        section: "Cardiac Vitals",
        field_key: "cardiac_heart_rate",
        label: "Heart rate",
        field_type: "number",
        sort_order: 1,
      },
      {
        section: "Investigations",
        field_key: "ecg_findings",
        label: "ECG findings",
        field_type: "textarea",
        sort_order: 0,
      },
      {
        section: "Investigations",
        field_key: "echo_requested",
        label: "Echocardiogram requested",
        field_type: "switch",
        sort_order: 1,
      },
      {
        section: "Cardiology Assessment",
        field_key: "cardiac_impression",
        label: "Cardiology impression",
        field_type: "richtext",
        is_required: true,
        sort_order: 0,
      },
      {
        section: "Notes",
        field_key: "cardiology_notes",
        label: "Cardiology notes",
        field_type: "textarea",
        sort_order: 0,
      },
    ],
  },
  "Nurse Assessment Form": {
    groups: buildGroups([
      "Nursing Intake",
      "Vital Signs",
      "Functional Assessment",
      "Risk Screening",
      "Care Notes",
    ]),
    fields: [
      {
        section: "Nursing Intake",
        field_key: "allergies_documented",
        label: "Documented allergies",
        field_type: "textarea",
        sort_order: 0,
      },
      {
        section: "Nursing Intake",
        field_key: "pain_score",
        label: "Pain score (0-10)",
        field_type: "number",
        sort_order: 1,
      },
      {
        section: "Vital Signs",
        field_key: "nurse_blood_pressure",
        label: "Blood pressure",
        field_type: "input",
        sort_order: 0,
      },
      {
        section: "Vital Signs",
        field_key: "nurse_temperature",
        label: "Temperature",
        field_type: "number",
        sort_order: 1,
      },
      {
        section: "Functional Assessment",
        field_key: "mobility_status",
        label: "Mobility status",
        field_type: "select",
        sort_order: 0,
        config: { options: ["Independent", "Assisted", "Bedridden"] },
      },
      {
        section: "Risk Screening",
        field_key: "fall_risk",
        label: "Fall risk",
        field_type: "radio",
        sort_order: 0,
        config: { options: ["Low", "Moderate", "High"] },
      },
      {
        section: "Risk Screening",
        field_key: "pressure_ulcer_risk",
        label: "Pressure ulcer risk",
        field_type: "radio",
        sort_order: 1,
        config: { options: ["Low", "Moderate", "High"] },
      },
      {
        section: "Care Notes",
        field_key: "nursing_care_notes",
        label: "Nursing care notes",
        field_type: "textarea",
        sort_order: 0,
      },
    ],
  },
};

const STARTER_DIAGNOSIS_TEMPLATES = [
  {
    title: "General Doctor Diagnosis",
    description: "Standard outpatient clinical diagnosis form.",
  },
  {
    title: "Emergency Diagnosis",
    description: "Rapid triage and emergency assessment fields.",
  },
  {
    title: "Pediatric Diagnosis",
    description: "Pediatric-focused examination and notes.",
  },
  {
    title: "Cardiology Diagnosis",
    description: "Cardiology-specific vitals and assessment.",
  },
  {
    title: "Nurse Assessment Form",
    description: "Nursing intake and observation template.",
  },
];

function getTemplatePresetByTitle(title) {
  if (!title) return null;
  return TEMPLATE_PRESETS[title] || null;
}

module.exports = {
  DEFAULT_DIAGNOSIS_GROUPS,
  DEFAULT_DIAGNOSIS_FIELDS,
  TEMPLATE_PRESETS,
  STARTER_DIAGNOSIS_TEMPLATES,
  getTemplatePresetByTitle,
};
