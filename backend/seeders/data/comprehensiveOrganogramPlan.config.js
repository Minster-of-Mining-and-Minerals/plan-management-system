"use strict";

const {
  SECTOR_ID: ALT_MOM_SECTOR_ID,
  SECTOR_NAME: ALT_MOM_SECTOR_NAME,
  ROOT_MINISTER_NAME,
} = require("./alternativeMomOrganogram.data");
const {
  INSTITUTES,
  ROOT_DIRECTOR_GENERAL,
} = require("./alternativeMomInstitutesOrganogram.data");

const PLAN_IDS = {
  MASTER: "20000000-0000-4000-8000-000000000301",
  ANNUAL_2026: "20000000-0000-4000-8000-000000000311",
  ANNUAL_2027: "20000000-0000-4000-8000-000000000312",
  ANNUAL_2028: "20000000-0000-4000-8000-000000000313",
  DEFAULT_PLAN_RULE: "60000000-0000-4000-8000-000000000001",
};

const VALIDATION_GROUP_ID = "a1000000-0000-4000-8000-000000000002";

const PLAN_DRAFT_NAME =
  "የአማራጭ የማዕድን ሚኒስቴር የ2016 ዓ.ም. የዕቅድና የድርጊት መርሃ ግብር (2018–2020 ዓ.ም.)";

const PLANNING_VALIDATION_DEPT_NAME =
  "Planning, Monitoring and Evaluation Executive Officer";

const ANNUAL_VERSIONS = [
  {
    plan_version_id: PLAN_IDS.ANNUAL_2026,
    planning_year: 2026,
    sequence_index: 1,
    draft_name: `${PLAN_DRAFT_NAME} — ዓመት 1 (2026)`,
  },
  {
    plan_version_id: PLAN_IDS.ANNUAL_2027,
    planning_year: 2027,
    sequence_index: 2,
    draft_name: `${PLAN_DRAFT_NAME} — ዓመት 2 (2027)`,
  },
  {
    plan_version_id: PLAN_IDS.ANNUAL_2028,
    planning_year: 2028,
    sequence_index: 3,
    draft_name: `${PLAN_DRAFT_NAME} — ዓመት 3 (2028)`,
  },
];

module.exports = {
  PLAN_IDS,
  VALIDATION_GROUP_ID,
  PLAN_DRAFT_NAME,
  PLANNING_VALIDATION_DEPT_NAME,
  ANNUAL_VERSIONS,
  PARENT_SECTOR_ID: ALT_MOM_SECTOR_ID,
  PARENT_SECTOR_NAME: ALT_MOM_SECTOR_NAME,
  ROOT_MINISTER_NAME,
  ROOT_DIRECTOR_GENERAL,
  INSTITUTES,
};
