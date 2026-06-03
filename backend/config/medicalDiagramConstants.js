"use strict";

const MEDICAL_DIAGRAM_STATUSES = ["active", "inactive"];

const MEDICAL_DIAGRAM_CATEGORY_STATUSES = ["active", "inactive"];

/** Starter diagram placeholders (images uploaded via admin UI). No categories seeded. */
const DEFAULT_MEDICAL_DIAGRAM_SEEDS = [
  { code: "heart", name: "Heart" },
  { code: "eye", name: "Eye" },
  { code: "brain", name: "Brain" },
  { code: "body_front", name: "Human Body Front" },
  { code: "body_back", name: "Human Body Back" },
  { code: "dental_chart", name: "Dental Chart" },
  { code: "skin_map", name: "Skin Diagram" },
  { code: "ear", name: "Ear" },
  { code: "nose", name: "Nose" },
  { code: "throat", name: "Throat" },
  { code: "lung", name: "Lung" },
  { code: "liver", name: "Liver" },
  { code: "kidney", name: "Kidney" },
  { code: "orthopedic", name: "Orthopedic Diagram" },
];

module.exports = {
  MEDICAL_DIAGRAM_STATUSES,
  MEDICAL_DIAGRAM_CATEGORY_STATUSES,
  DEFAULT_MEDICAL_DIAGRAM_SEEDS,
};
