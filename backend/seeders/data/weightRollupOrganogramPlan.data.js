"use strict";

const { SECTOR_ID, SECTOR_NAME } = require("./alternativeMomOrganogram.data");
const { buildPlanTree } = require("./weightRollupPlanTreeBuilder");

const PLAN_RULE_ID = "60000000-0000-4000-8000-000000000002";

/** Draft-owned fork of the global template — edits stay on this plan only. */
const PLAN_RULE_SNAPSHOT_ID = "60000000-0000-4000-8000-000000000403";

const PLAN_RULE_TEMPLATE_NAME = "Weight Rollup Based 3-Level Plan";

/**
 * Office rule pattern:
 * - Strategic: no target, no contribution weight
 * - Goal: no target, contribution weight for rollup
 * - KPI: target required (weight starts here, leaf node for execution & reporting)
 */
const PLAN_RULE_SNAPSHOT_STEPS = [
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000041",
    step_order: 1,
    node_type: "strategic",
    label: "Strategic Focus Area",
    requires_weight: false,
    requires_contribution_weight: false,
    color_hex: "#7C3AED",
  },
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000042",
    step_order: 2,
    node_type: "goal",
    label: "Goal",
    requires_weight: false,
    requires_contribution_weight: true,
    color_hex: "#2563EB",
  },
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000043",
    step_order: 3,
    node_type: "kpi",
    label: "KPI / Indicator",
    requires_weight: true,
    requires_contribution_weight: false,
    color_hex: "#059669",
  },
];

const PLANNING_CONFIG_ID = "90000000-0000-4000-8000-000000000402";

const PLAN_IDS = {
  MASTER: "20000000-0000-4000-8000-000000000401",
  ANNUAL_2026: "20000000-0000-4000-8000-000000000411",
  ANNUAL_2027: "20000000-0000-4000-8000-000000000412",
  ANNUAL_2028: "20000000-0000-4000-8000-000000000413",
  PERIOD_2029_Q1: "20000000-0000-4000-8000-000000000421",
  PERIOD_2029_Q2: "20000000-0000-4000-8000-000000000422",
  PERIOD_2029_Q3: "20000000-0000-4000-8000-000000000423",
  PERIOD_2029_Q4: "20000000-0000-4000-8000-000000000424",
  PERIOD_2030_Q1: "20000000-0000-4000-8000-000000000431",
  PERIOD_2030_Q2: "20000000-0000-4000-8000-000000000432",
  PERIOD_2030_Q3: "20000000-0000-4000-8000-000000000433",
  PERIOD_2030_Q4: "20000000-0000-4000-8000-000000000434",
  PERIOD_2031_Q1: "20000000-0000-4000-8000-000000000441",
  PERIOD_2031_Q2: "20000000-0000-4000-8000-000000000442",
  PERIOD_2031_Q3: "20000000-0000-4000-8000-000000000443",
  PERIOD_2031_Q4: "20000000-0000-4000-8000-000000000444",
};

const PLAN_DRAFT_NAME =
  "Weight Rollup QA — Alternative MoM Mineral Sector (2029–2031)";

/** Annual allocation skew: 50% / 30% / 20% across planning years (not equal thirds). */
const ANNUAL_TARGET_YEAR_RATIOS = [0.5, 0.3, 0.2];

const ANNUAL_VERSIONS = [
  {
    plan_version_id: PLAN_IDS.ANNUAL_2026,
    planning_year: 2029,
    sequence_index: 1,
    draft_name: `${PLAN_DRAFT_NAME} — Year 1 (2029)`,
  },
  {
    plan_version_id: PLAN_IDS.ANNUAL_2027,
    planning_year: 2030,
    sequence_index: 2,
    draft_name: `${PLAN_DRAFT_NAME} — Year 2 (2030)`,
  },
  {
    plan_version_id: PLAN_IDS.ANNUAL_2028,
    planning_year: 2031,
    sequence_index: 3,
    draft_name: `${PLAN_DRAFT_NAME} — Year 3 (2031)`,
  },
];

const EXECUTION_PERIODS_BY_ANNUAL = {
  [PLAN_IDS.ANNUAL_2026]: [
    { plan_version_id: PLAN_IDS.PERIOD_2029_Q1, period_label: "Q1", sequence_index: 1, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2029_Q2, period_label: "Q2", sequence_index: 2, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2029_Q3, period_label: "Q3", sequence_index: 3, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2029_Q4, period_label: "Q4", sequence_index: 4, status: "draft", is_locked: false },
  ],
  [PLAN_IDS.ANNUAL_2027]: [
    { plan_version_id: PLAN_IDS.PERIOD_2030_Q1, period_label: "Q1", sequence_index: 1, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2030_Q2, period_label: "Q2", sequence_index: 2, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2030_Q3, period_label: "Q3", sequence_index: 3, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2030_Q4, period_label: "Q4", sequence_index: 4, status: "draft", is_locked: false },
  ],
  [PLAN_IDS.ANNUAL_2028]: [
    { plan_version_id: PLAN_IDS.PERIOD_2031_Q1, period_label: "Q1", sequence_index: 1, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2031_Q2, period_label: "Q2", sequence_index: 2, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2031_Q3, period_label: "Q3", sequence_index: 3, status: "draft", is_locked: false },
    { plan_version_id: PLAN_IDS.PERIOD_2031_Q4, period_label: "Q4", sequence_index: 4, status: "draft", is_locked: false },
  ],
};

const EXECUTION_PERIODS_2029 = EXECUTION_PERIODS_BY_ANNUAL[PLAN_IDS.ANNUAL_2026];

const ALL_EXECUTION_PERIOD_VERSION_IDS = Object.values(EXECUTION_PERIODS_BY_ANNUAL)
  .flat()
  .map((period) => period.plan_version_id);

const { nodeIds: NODE_IDS, strategicAreas } = buildPlanTree();

const PLAN_TREE = { strategicAreas };

const EXPECTED_NODE_COUNTS = {
  strategic: 3,
  goal: 9,
  kpi: 27,
  task: 0,
};

module.exports = {
  PLAN_RULE_ID,
  PLAN_RULE_SNAPSHOT_ID,
  PLAN_RULE_TEMPLATE_NAME,
  PLAN_RULE_SNAPSHOT_STEPS,
  PLANNING_CONFIG_ID,
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  ANNUAL_TARGET_YEAR_RATIOS,
  ANNUAL_VERSIONS,
  EXECUTION_PERIODS_2029,
  EXECUTION_PERIODS_BY_ANNUAL,
  ALL_EXECUTION_PERIOD_VERSION_IDS,
  NODE_IDS,
  PLAN_TREE,
  EXPECTED_NODE_COUNTS,
  PARENT_SECTOR_ID: SECTOR_ID,
  PARENT_SECTOR_NAME: SECTOR_NAME,
};
