"use strict";

const DIAGNOSIS_MODEL_NAME = "Diagnosis";

const DIAGNOSIS_FIELD_TYPES = [
  "input",
  "textarea",
  "number",
  "select",
  "checkbox",
  "radio",
  "date",
  "time",
  "file",
  "richtext",
  "switch",
  "canvas_annotation",
  "repeater",
];

const DEFAULT_DIAGNOSIS_SECTIONS = [
  "Vital Signs",
  "Symptoms",
  "Examination",
  "Observation",
  "Notes",
  "Laboratory Requests",
];

const DIAGNOSIS_RECORD_STATUSES = ["draft", "submitted", "finalized"];

module.exports = {
  DIAGNOSIS_MODEL_NAME,
  DIAGNOSIS_FIELD_TYPES,
  DEFAULT_DIAGNOSIS_SECTIONS,
  DIAGNOSIS_RECORD_STATUSES,
};
