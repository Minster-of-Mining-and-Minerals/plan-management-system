"use strict";

const MEDICAL_DIAGRAM_STATUSES = ["active", "inactive"];

const MEDICAL_DIAGRAM_CATEGORIES = [
  "Cardiology",
  "Ophthalmology",
  "Neurology",
  "General Anatomy",
  "Dental",
  "Dermatology",
  "ENT",
  "Pulmonology",
  "Gastroenterology",
  "Nephrology",
  "Orthopedics",
  "Other",
];

/** Starter library entries (image uploaded via admin UI). */
const DEFAULT_MEDICAL_DIAGRAM_SEEDS = [
  { code: "heart", name: "Heart", category: "Cardiology" },
  { code: "eye", name: "Eye", category: "Ophthalmology" },
  { code: "brain", name: "Brain", category: "Neurology" },
  { code: "body_front", name: "Human Body Front", category: "General Anatomy" },
  { code: "body_back", name: "Human Body Back", category: "General Anatomy" },
  { code: "dental_chart", name: "Dental Chart", category: "Dental" },
  { code: "skin_map", name: "Skin Diagram", category: "Dermatology" },
  { code: "ear", name: "Ear", category: "ENT" },
  { code: "nose", name: "Nose", category: "ENT" },
  { code: "throat", name: "Throat", category: "ENT" },
  { code: "lung", name: "Lung", category: "Pulmonology" },
  { code: "liver", name: "Liver", category: "Gastroenterology" },
  { code: "kidney", name: "Kidney", category: "Nephrology" },
  { code: "orthopedic", name: "Orthopedic Diagram", category: "Orthopedics" },
];

module.exports = {
  MEDICAL_DIAGRAM_STATUSES,
  MEDICAL_DIAGRAM_CATEGORIES,
  DEFAULT_MEDICAL_DIAGRAM_SEEDS,
};
