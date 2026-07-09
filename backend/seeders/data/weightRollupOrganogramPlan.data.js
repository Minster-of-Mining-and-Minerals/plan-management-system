"use strict";

const { SECTOR_ID, SECTOR_NAME } = require("./alternativeMomOrganogram.data");

const PLAN_RULE_ID = "60000000-0000-4000-8000-000000000002";

const PLAN_IDS = {
  MASTER: "20000000-0000-4000-8000-000000000401",
  ANNUAL_2026: "20000000-0000-4000-8000-000000000411",
  ANNUAL_2027: "20000000-0000-4000-8000-000000000412",
  ANNUAL_2028: "20000000-0000-4000-8000-000000000413",
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

const NODE_IDS = {
  STRATEGIC: "42000000-0000-4000-8000-000000000401",
  GOAL_OPS: "42000000-0000-4000-8000-000000000411",
  GOAL_MEGA: "42000000-0000-4000-8000-000000000412",
  KPI_LICENSE_ADMIN: "42000000-0000-4000-8000-000000000421",
  KPI_MINING_LICENSE: "42000000-0000-4000-8000-000000000422",
  KPI_MEGA_PROJECTS: "42000000-0000-4000-8000-000000000431",
  KPI_MEGA_MONITOR: "42000000-0000-4000-8000-000000000432",
  TASK_LA1: "43000000-0000-4000-8000-000000000501",
  TASK_LA2: "43000000-0000-4000-8000-000000000502",
  TASK_ML1: "43000000-0000-4000-8000-000000000503",
  TASK_ML2: "43000000-0000-4000-8000-000000000504",
  TASK_MP1: "43000000-0000-4000-8000-000000000505",
  TASK_MP2: "43000000-0000-4000-8000-000000000506",
  TASK_MM1: "43000000-0000-4000-8000-000000000507",
  TASK_MM2: "43000000-0000-4000-8000-000000000508",
};

/**
 * Fixed 4-level tree with uneven planning weights and task contribution weights
 * so execution rollup differs from a simple average.
 *
 * Expected task-weighted KPI rollup example (if all tasks hit 100% achievement):
 *   KPI_LICENSE_ADMIN: 70% + 30% = 100% (weights 70/30)
 *   KPI_MINING_LICENSE: 40% + 60% weighted → 100%
 */
const PLAN_TREE = {
  strategic: {
    id: NODE_IDS.STRATEGIC,
    title: "Mineral Resources Development Programme",
    departmentName: "State Minister, Mineral Resources Development Sector",
    weight: 0,
  },
  goals: [
    {
      id: NODE_IDS.GOAL_OPS,
      title: "Mining licensing and operations administration",
      departmentName:
        "Executive Lead, Mining Operations, Processing License and Administration",
      weight: 350,
      kpis: [
        {
          id: NODE_IDS.KPI_LICENSE_ADMIN,
          title: "License operations administration",
          departmentName: "License Operations Administration Desk",
          weight: 210,
          tasks: [
            {
              id: NODE_IDS.TASK_LA1,
              title: "Process routine license applications",
              departmentName: "License Operations Administration Desk",
              weight: 147,
              contributionWeight: 70,
            },
            {
              id: NODE_IDS.TASK_LA2,
              title: "Clear license operations backlog",
              departmentName: "License Operations Administration Desk",
              weight: 63,
              contributionWeight: 30,
            },
          ],
        },
        {
          id: NODE_IDS.KPI_MINING_LICENSE,
          title: "Mining license operations throughput",
          departmentName: "Mining License Operations Desk",
          weight: 140,
          tasks: [
            {
              id: NODE_IDS.TASK_ML1,
              title: "Issue new mining licenses on schedule",
              departmentName: "Mining License Operations Desk",
              weight: 56,
              contributionWeight: 40,
            },
            {
              id: NODE_IDS.TASK_ML2,
              title: "Renew and amend mining licenses",
              departmentName: "Mining License Operations Desk",
              weight: 84,
              contributionWeight: 60,
            },
          ],
        },
      ],
    },
    {
      id: NODE_IDS.GOAL_MEGA,
      title: "Mega mining project delivery",
      departmentName: "Executive Lead, Mining Mega Projects",
      weight: 650,
      kpis: [
        {
          id: NODE_IDS.KPI_MEGA_PROJECTS,
          title: "Mega project pipeline delivery",
          departmentName: "Head, Mega Projects Desk",
          weight: 390,
          tasks: [
            {
              id: NODE_IDS.TASK_MP1,
              title: "Advance priority mega projects",
              departmentName: "Head, Mega Projects Desk",
              weight: 273,
              contributionWeight: 80,
            },
            {
              id: NODE_IDS.TASK_MP2,
              title: "Resolve mega project blockers",
              departmentName: "Head, Mega Projects Desk",
              weight: 117,
              contributionWeight: 20,
            },
          ],
        },
        {
          id: NODE_IDS.KPI_MEGA_MONITOR,
          title: "Mega project monitoring coverage",
          departmentName: "Head, Mega Project Monitoring and Support Desk (1)",
          weight: 260,
          tasks: [
            {
              id: NODE_IDS.TASK_MM1,
              title: "Conduct quarterly mega project reviews",
              departmentName: "Head, Mega Project Monitoring and Support Desk (1)",
              weight: 143,
              contributionWeight: 55,
            },
            {
              id: NODE_IDS.TASK_MM2,
              title: "Publish mega project monitoring reports",
              departmentName: "Head, Mega Project Monitoring and Support Desk (2)",
              weight: 117,
              contributionWeight: 45,
            },
          ],
        },
      ],
    },
  ],
};

module.exports = {
  PLAN_RULE_ID,
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  ANNUAL_TARGET_YEAR_RATIOS,
  ANNUAL_VERSIONS,
  NODE_IDS,
  PLAN_TREE,
  PARENT_SECTOR_ID: SECTOR_ID,
  PARENT_SECTOR_NAME: SECTOR_NAME,
};
