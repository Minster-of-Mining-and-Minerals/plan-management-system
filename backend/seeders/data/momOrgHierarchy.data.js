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
  {
    name: "Strategic Planning Directorate",
    children: [
      { name: "Planning Department" },
      { name: "Monitoring Department" },
      { name: "Evaluation Department" },
    ],
  },
  { name: "Human Resources Directorate" },
  {
    name: "Finance Directorate",
    children: [
      { name: "Budget Department" },
      { name: "Accounting Department" },
      { name: "Treasury Department" },
    ],
  },
  {
    name: "ICT Directorate",
    children: [
      { name: "Infrastructure Department" },
      { name: "Software Development Department" },
      { name: "Database Administration Department" },
      { name: "Cyber Security Department" },
    ],
  },
  { name: "Legal Affairs Directorate" },
  { name: "Procurement Directorate" },
  { name: "Internal Audit Directorate" },
  { name: "Mining Licensing Directorate" },
  { name: "Environmental Compliance Directorate" },
  { name: "Public Relations Directorate" },
];

const MIDI_DEPARTMENTS = [
  { name: "Director General Office" },
  {
    name: "Investment Promotion Directorate",
    children: [
      { name: "Domestic Investment Department" },
      { name: "Foreign Investment Department" },
      { name: "Marketing and Outreach Department" },
    ],
  },
  {
    name: "Investor Support Directorate",
    children: [
      { name: "Project Facilitation Department" },
      { name: "Investor Relations Department" },
      { name: "Business Advisory Department" },
    ],
  },
  { name: "Licensing Coordination Directorate" },
  { name: "Strategic Planning Directorate" },
  { name: "Human Resources Directorate" },
  { name: "Finance Directorate" },
  {
    name: "ICT Directorate",
    children: [
      { name: "Infrastructure Department" },
      { name: "Application Development Department" },
      { name: "Database Department" },
    ],
  },
  { name: "Legal Affairs Directorate" },
  { name: "Monitoring and Evaluation Directorate" },
];

const GIE_DEPARTMENTS = [
  { name: "Chief Executive Office" },
  {
    name: "Geological Survey Directorate",
    children: [
      { name: "Field Survey Department" },
      { name: "Mineral Exploration Department" },
      { name: "Hydrogeology Department" },
    ],
  },
  {
    name: "Geological Mapping Directorate",
    children: [
      { name: "Mapping Department" },
      { name: "GIS Department" },
      { name: "Cartography Department" },
    ],
  },
  { name: "Geospatial Information Directorate" },
  {
    name: "Laboratory Services Directorate",
    children: [
      { name: "Mineral Analysis Department" },
      { name: "Sample Processing Department" },
      { name: "Quality Assurance Department" },
    ],
  },
  { name: "Research and Development Directorate" },
  { name: "Strategic Planning Directorate" },
  { name: "Finance Directorate" },
  { name: "Human Resources Directorate" },
  { name: "ICT Directorate" },
  { name: "Procurement Directorate" },
];

const DIRECTORATE_USER_TEMPLATES = [
  { roleKey: "director", title: "Director", namePattern: (short) => `Director ${short}` },
  { roleKey: "deputy-director", title: "Deputy Director", namePattern: (short) => `Deputy Director ${short}` },
  { roleKey: "senior-expert", title: "Senior Expert", namePattern: (short) => `Senior ${short} Expert` },
];

const DEPARTMENT_USER_TEMPLATES = [
  { roleKey: "head", title: "Department Head", namePattern: (short) => `${short} Department Head` },
  { roleKey: "senior-officer", title: "Senior Officer", namePattern: (short) => `Senior ${short} Officer` },
  { roleKey: "officer", title: "Officer", namePattern: (short) => `${short} Officer` },
];

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
  DIRECTORATE_USER_TEMPLATES,
  DEPARTMENT_USER_TEMPLATES,
};
