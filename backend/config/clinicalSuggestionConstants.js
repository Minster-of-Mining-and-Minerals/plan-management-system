"use strict";

const CLINICAL_SUGGESTION_CATEGORIES = [
  "diagnosis",
  "assessment",
  "plan",
  "prescription",
  "referral",
  "procedure",
  "certificate",
  "general",
];

const DEFAULT_CLINICAL_PHRASES = [
  { text: "Patient presents with", category: "general" },
  { text: "Patient previously diagnosed with", category: "diagnosis" },
  { text: "Chief complaint:", category: "general" },
  { text: "History of present illness:", category: "general" },
  { text: "Physical examination:", category: "general" },
  { text: "Assessment:", category: "assessment" },
  { text: "Plan:", category: "plan" },
  { text: "Normal chest examination findings.", category: "assessment" },
  { text: "No evidence of acute cardiac distress.", category: "assessment" },
  { text: "Recommend further imaging if symptoms persist.", category: "plan" },
  { text: "Follow up in two weeks.", category: "plan" },
  { text: "Patient advised to return if symptoms worsen.", category: "plan" },
  { text: "Take medication as prescribed.", category: "prescription" },
  { text: "Refer to specialist for further evaluation.", category: "referral" },
];

module.exports = {
  CLINICAL_SUGGESTION_CATEGORIES,
  DEFAULT_CLINICAL_PHRASES,
};
