"use strict";

const { DEFAULT_DIAGNOSIS_SECTIONS } = require("./diagnosisFormConstants");

/** Default section titles seeded for a new staff diagnosis form config. */
const DEFAULT_DIAGNOSIS_GROUPS = DEFAULT_DIAGNOSIS_SECTIONS.map((title, index) => ({
  title,
  description: null,
  sort_order: index,
  is_visible: true,
  is_required: false,
}));

/** Starter fields per section (optional — admins can customize). */
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

module.exports = {
  DEFAULT_DIAGNOSIS_GROUPS,
  DEFAULT_DIAGNOSIS_FIELDS,
};
