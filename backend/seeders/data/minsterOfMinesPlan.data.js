"use strict";

const PLAN_IDS = {
  MASTER: "20000000-0000-4000-8000-000000000201",
  ANNUAL_2026: "20000000-0000-4000-8000-000000000211",
  ANNUAL_2027: "20000000-0000-4000-8000-000000000212",
  ANNUAL_2028: "20000000-0000-4000-8000-000000000213",
  DEFAULT_PLAN_RULE: "60000000-0000-4000-8000-000000000001",
};

const PLAN_DRAFT_NAME =
  "የሚኒስትር ኦፍ ማይንስ የ2026–2028 ዓመት ዕቅድና የድርጊት መርሃ ግብር";

const PARENT_SECTOR_NAME = "Minster Of Mines";

/**
 * One strategic focus per government structure (MoM, MIDI, GIE).
 * Each strategic has 2 goals (L2 sub-departments) with 2 KPIs (L3 leaf units).
 */
const SECTOR_PLAN_BLOCKS = [
  {
    sectorName: "Minster Of Mines",
    strategic: {
      id: "40000000-0000-4000-8000-000000000201",
      title: "የማዕድን ፈቃድ መስጠት እና የተቋማት አገልግሎት ማሻሻል",
      description:
        "Strengthen mineral licensing, policy coordination, and corporate services across the ministry.",
    },
    rootDeptName: "Ministry Headquarters",
    goals: [
      {
        id: "40000000-0000-4000-8000-000000000211",
        subDeptName: "Policy & Planning Directorate",
        title: "የስትራቴጂክ እቅድ እና ክትትል አገልግሎት ማሻሻል",
        description: "Improve strategic planning, monitoring, and evaluation services.",
        kpis: [
          {
            id: "41000000-0000-4000-8000-000000000211",
            leafName: "Strategic Planning Unit",
            title: "የስትራቴጂክ እቅድ ሰነዶችን በጊዜ ማዘጋጀት",
            description: "Prepare and submit annual strategic plans on schedule.",
          },
          {
            id: "41000000-0000-4000-8000-000000000212",
            leafName: "Monitoring & Evaluation Unit",
            title: "የክትትል እና ግምገማ ሪፖርት ማስኬድ",
            description: "Execute monitoring visits and publish evaluation reports.",
          },
        ],
      },
      {
        id: "40000000-0000-4000-8000-000000000212",
        subDeptName: "Corporate Services Directorate",
        title: "የኮርፖሬት አገልግሎት እና የሰው ሀብት አመራር",
        description: "Strengthen HR, finance, and procurement support for sector programmes.",
        kpis: [
          {
            id: "41000000-0000-4000-8000-000000000213",
            leafName: "Human Resources Unit",
            title: "የሰው ሀብት አቅም ግንባታ ፕሮግራም ማከናወን",
            description: "Deliver staff capacity-building programmes on time.",
          },
          {
            id: "41000000-0000-4000-8000-000000000214",
            leafName: "Finance & Procurement Unit",
            title: "የበጀት አፈጻጸም ክትትል ማሻሻል",
            description: "Improve budget execution tracking and procurement compliance.",
          },
        ],
      },
    ],
  },
  {
    sectorName: "MIDI",
    strategic: {
      id: "40000000-0000-4000-8000-000000000202",
      title: "የማዕድን ኢንቨስትመንት እና ፈቃድ አገልግሎት ማሻሻል",
      description:
        "Promote mining investment, streamline licensing, and support sector development projects.",
    },
    rootDeptName: "Director General Office",
    goals: [
      {
        id: "40000000-0000-4000-8000-000000000221",
        subDeptName: "Investment & Licensing Directorate",
        title: "ለውጭ እና ሀገር ውስጥ ባለሃብቶች የፈቃድ አገልግሎት ማሻሻል",
        description: "Improve investment promotion and licensing service delivery.",
        kpis: [
          {
            id: "41000000-0000-4000-8000-000000000221",
            leafName: "Investment Promotion Unit",
            title: "የኢንቨስትመንት ማስተዋወቂያ ፕሮግራሞችን ማከናወን",
            description: "Run investor outreach and promotion campaigns.",
          },
          {
            id: "41000000-0000-4000-8000-000000000222",
            leafName: "Licensing Operations Unit",
            title: "የፈቃድ ማመልከቻዎችን በጊዜ መስተናገድ",
            description: "Process licensing applications within agreed service timelines.",
          },
        ],
      },
      {
        id: "40000000-0000-4000-8000-000000000222",
        subDeptName: "Sector Development Directorate",
        title: "የዘርፍ ልማት እና የተቋም ድጋፍ አገልግሎት",
        description: "Coordinate sector development projects and investor support.",
        kpis: [
          {
            id: "41000000-0000-4000-8000-000000000223",
            leafName: "Project Management Unit",
            title: "የዘርፍ ልማት ፕሮጀክቶችን መከታተል",
            description: "Track milestone delivery for sector development projects.",
          },
          {
            id: "41000000-0000-4000-8000-000000000224",
            leafName: "Investor Support Unit",
            title: "ለተቋማት የአጋዥ ማማከሪያ አገልግሎት መስጠት",
            description: "Provide advisory support to licensed mining enterprises.",
          },
        ],
      },
    ],
  },
  {
    sectorName: "GIE",
    strategic: {
      id: "40000000-0000-4000-8000-000000000203",
      title: "የጂኦሳይንስ እና የመረጃ አገልግሎት ማሻሻል",
      description:
        "Expand geological survey, mapping, laboratory, and geoscience data services.",
    },
    rootDeptName: "Chief Executive Office",
    goals: [
      {
        id: "40000000-0000-4000-8000-000000000231",
        subDeptName: "Geoscience Directorate",
        title: "የጂኦሎጂካል ምርምር እና ካርታ አገልግሎት ማሻሻል",
        description: "Improve field survey coverage and cartographic products.",
        kpis: [
          {
            id: "41000000-0000-4000-8000-000000000231",
            leafName: "Geological Survey Unit",
            title: "የመስክ ጂኦሎጂካል ምርምር ማከናወን",
            description: "Complete planned geological field surveys.",
          },
          {
            id: "41000000-0000-4000-8000-000000000232",
            leafName: "Mapping & Cartography Unit",
            title: "የማዕድን ካርታ ምርቶችን ማዘመን",
            description: "Publish updated geological maps for priority belts.",
          },
        ],
      },
      {
        id: "40000000-0000-4000-8000-000000000232",
        subDeptName: "Data & Laboratory Directorate",
        title: "የመረጃ አስተዳደር እና የላብራቶሪ አገልግሎት",
        description: "Strengthen geoscience data management and laboratory services.",
        kpis: [
          {
            id: "41000000-0000-4000-8000-000000000233",
            leafName: "Geological Data Management Unit",
            title: "የጂኦሳይንስ ዳታ ቤዝ ማዘመን",
            description: "Maintain and publish geological datasets to stakeholders.",
          },
          {
            id: "41000000-0000-4000-8000-000000000234",
            leafName: "Laboratory Services Unit",
            title: "የላብራቶሪ ምርመራ አገልግሎት መስጠት",
            description: "Deliver sample analysis services within SLA targets.",
          },
        ],
      },
    ],
  },
];

module.exports = {
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  PARENT_SECTOR_NAME,
  SECTOR_PLAN_BLOCKS,
};
