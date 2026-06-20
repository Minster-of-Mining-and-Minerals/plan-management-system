"use strict";

/** Fixed sector structure IDs (plan versions reference MOM) */
const SECTOR_IDS = {
  MOM: "10000000-0000-4000-8000-000000000001",
  MIDI: "10000000-0000-4000-8000-000000000002",
  GIE: "10000000-0000-4000-8000-000000000003",
};

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const USER_ROLE_ID = "10000000-0000-4000-8000-000000000010";

const MOM_DESCRIPTION =
  "Federal Ministry responsible for mineral exploration, mining regulation, licensing, geological surveys, investment promotion, environmental compliance, and sector development.";

const MIDI_DESCRIPTION =
  "Mining Investment Development Institute — responsible for mining investment promotion, investor support, licensing facilitation, sector development, and mining project coordination.";

const GIE_DESCRIPTION =
  "Geological Information Enterprise — responsible for geological surveys, mapping, geological data management, exploration support, laboratory services, and geospatial information.";

const MOM_DEPARTMENTS = [
  { name: "Minister Office" },
  { name: "Planning Directorate" },
  { name: "Human Resources Directorate" },
  { name: "Finance Directorate" },
  { name: "ICT Directorate" },
  { name: "Monitoring & Evaluation Directorate" },
  { name: "Mining Licensing Directorate" },
  { name: "Environmental Compliance Directorate" },
];

const MIDI_DEPARTMENTS = [
  { name: "Director General Office" },
  { name: "Investment Promotion Department" },
  { name: "Licensing Department" },
  { name: "Mineral Development Department" },
  { name: "Investor Support Department" },
  { name: "Project Management Department" },
  { name: "Human Resources Directorate" },
  { name: "Finance Directorate" },
];

const GIE_DEPARTMENTS = [
  { name: "Chief Executive Office" },
  { name: "Geological Survey Department" },
  { name: "Mapping Department" },
  { name: "Data Management Department" },
  { name: "Laboratory Department" },
  { name: "Exploration Support Department" },
  { name: "Strategic Planning Directorate" },
  { name: "Human Resources Directorate" },
];

/** Two demo users per department (Ministry of Mines sector). */
const MOM_USER_TEMPLATES = [
  { roleKey: "head", title: "Department Head", namePattern: (short) => `${short} Head` },
  { roleKey: "officer", title: "Officer", namePattern: (short) => `${short} Officer` },
];

const DIRECTORATE_USER_TEMPLATES = [
  { roleKey: "director", title: "Director", namePattern: (short) => `Director ${short}` },
  { roleKey: "deputy-director", title: "Deputy Director", namePattern: (short) => `Deputy Director ${short}` },
  { roleKey: "head", title: "Department Head", namePattern: (short) => `${short} Department Head` },
  { roleKey: "senior-officer", title: "Senior Officer", namePattern: (short) => `Senior ${short} Officer` },
  { roleKey: "officer", title: "Officer", namePattern: (short) => `${short} Officer` },
  { roleKey: "analyst", title: "Analyst", namePattern: (short) => `${short} Analyst` },
  { roleKey: "expert", title: "Expert", namePattern: (short) => `${short} Expert` },
  { roleKey: "coordinator", title: "Coordinator", namePattern: (short) => `${short} Coordinator` },
];

const DEPARTMENT_USER_TEMPLATES = DIRECTORATE_USER_TEMPLATES;

module.exports = {
  SECTOR_IDS,
  ADMIN_USER_ID,
  USER_ROLE_ID,
  MOM_DESCRIPTION,
  MIDI_DESCRIPTION,
  GIE_DESCRIPTION,
  MOM_DEPARTMENTS,
  MIDI_DEPARTMENTS,
  GIE_DEPARTMENTS,
  MOM_USER_TEMPLATES,
  DIRECTORATE_USER_TEMPLATES,
  DEPARTMENT_USER_TEMPLATES,
};
