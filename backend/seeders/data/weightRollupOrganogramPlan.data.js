"use strict";

const { SECTOR_ID, SECTOR_NAME } = require("./alternativeMomOrganogram.data");

const PLAN_RULE_ID = "60000000-0000-4000-8000-000000000002";

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
    {
      plan_version_id: PLAN_IDS.PERIOD_2029_Q1,
      period_label: "Q1",
      sequence_index: 1,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2029_Q2,
      period_label: "Q2",
      sequence_index: 2,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2029_Q3,
      period_label: "Q3",
      sequence_index: 3,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2029_Q4,
      period_label: "Q4",
      sequence_index: 4,
      status: "draft",
      is_locked: false,
    },
  ],
  [PLAN_IDS.ANNUAL_2027]: [
    {
      plan_version_id: PLAN_IDS.PERIOD_2030_Q1,
      period_label: "Q1",
      sequence_index: 1,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2030_Q2,
      period_label: "Q2",
      sequence_index: 2,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2030_Q3,
      period_label: "Q3",
      sequence_index: 3,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2030_Q4,
      period_label: "Q4",
      sequence_index: 4,
      status: "draft",
      is_locked: false,
    },
  ],
  [PLAN_IDS.ANNUAL_2028]: [
    {
      plan_version_id: PLAN_IDS.PERIOD_2031_Q1,
      period_label: "Q1",
      sequence_index: 1,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2031_Q2,
      period_label: "Q2",
      sequence_index: 2,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2031_Q3,
      period_label: "Q3",
      sequence_index: 3,
      status: "draft",
      is_locked: false,
    },
    {
      plan_version_id: PLAN_IDS.PERIOD_2031_Q4,
      period_label: "Q4",
      sequence_index: 4,
      status: "draft",
      is_locked: false,
    },
  ],
};

/** @deprecated Use EXECUTION_PERIODS_BY_ANNUAL */
const EXECUTION_PERIODS_2029 = EXECUTION_PERIODS_BY_ANNUAL[PLAN_IDS.ANNUAL_2026];

const ALL_EXECUTION_PERIOD_VERSION_IDS = Object.values(EXECUTION_PERIODS_BY_ANNUAL)
  .flat()
  .map((period) => period.plan_version_id);

const NODE_IDS = {
  STRATEGIC_DEV: "42000000-0000-4000-8000-000000000401",
  STRATEGIC_TRADE: "42000000-0000-4000-8000-000000000402",
  GOAL_OPS: "42000000-0000-4000-8000-000000000411",
  GOAL_MEGA: "42000000-0000-4000-8000-000000000412",
  GOAL_ENV: "42000000-0000-4000-8000-000000000413",
  GOAL_ARTISANAL: "42000000-0000-4000-8000-000000000414",
  GOAL_TRADE: "42000000-0000-4000-8000-000000000415",
  KPI_LICENSE_ADMIN: "42000000-0000-4000-8000-000000000421",
  KPI_MINING_LICENSE: "42000000-0000-4000-8000-000000000422",
  KPI_MEGA_PROJECTS: "42000000-0000-4000-8000-000000000431",
  KPI_MEGA_MONITOR: "42000000-0000-4000-8000-000000000432",
  KPI_COMMUNITY: "42000000-0000-4000-8000-000000000433",
  KPI_ENV_INSPECTION: "42000000-0000-4000-8000-000000000434",
  KPI_ARTISANAL_REG: "42000000-0000-4000-8000-000000000441",
  KPI_ARTISANAL_SAFETY: "42000000-0000-4000-8000-000000000442",
  KPI_TRADE_EXPORT: "42000000-0000-4000-8000-000000000451",
  KPI_TRADE_COMPLIANCE: "42000000-0000-4000-8000-000000000452",
  TASK_LA1: "43000000-0000-4000-8000-000000000501",
  TASK_LA2: "43000000-0000-4000-8000-000000000502",
  TASK_ML1: "43000000-0000-4000-8000-000000000503",
  TASK_ML2: "43000000-0000-4000-8000-000000000504",
  TASK_MP1: "43000000-0000-4000-8000-000000000505",
  TASK_MP2: "43000000-0000-4000-8000-000000000506",
  TASK_MM1: "43000000-0000-4000-8000-000000000507",
  TASK_MM2: "43000000-0000-4000-8000-000000000508",
  TASK_CE1: "43000000-0000-4000-8000-000000000509",
  TASK_CE2: "43000000-0000-4000-8000-000000000510",
  TASK_EI1: "43000000-0000-4000-8000-000000000511",
  TASK_EI2: "43000000-0000-4000-8000-000000000512",
  TASK_AR1: "43000000-0000-4000-8000-000000000513",
  TASK_AR2: "43000000-0000-4000-8000-000000000514",
  TASK_AS1: "43000000-0000-4000-8000-000000000515",
  TASK_AS2: "43000000-0000-4000-8000-000000000516",
  TASK_TE1: "43000000-0000-4000-8000-000000000517",
  TASK_TE2: "43000000-0000-4000-8000-000000000518",
  TASK_TC1: "43000000-0000-4000-8000-000000000519",
  TASK_TC2: "43000000-0000-4000-8000-000000000520",
};

/**
 * Rich 4-level tree for weight-rollup QA:
 * - 2 strategic focus areas, 5 goals (goal contribution weights sum to 100% per strategic)
 * - 10 KPIs and 20 tasks with uneven task contribution weights (100% per KPI)
 * - All three weight modes: percentage, number (+ unit), frequency
 * - Departments from Alternative MoM Mineral Resources sector organogram
 */
const PLAN_TREE = {
  strategicAreas: [
    {
      strategic: {
        id: NODE_IDS.STRATEGIC_DEV,
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
          weight: 450,
          weightMode: "percentage",
          contributionWeight: 45,
          kpis: [
            {
              id: NODE_IDS.KPI_LICENSE_ADMIN,
              title: "License operations administration",
              departmentName: "License Operations Administration Desk",
              weight: 270,
              weightMode: "percentage",
              tasks: [
                {
                  id: NODE_IDS.TASK_LA1,
                  title: "Process routine license applications",
                  departmentName: "License Operations Administration Desk",
                  weight: 176,
                  weightMode: "percentage",
                  contributionWeight: 65,
                },
                {
                  id: NODE_IDS.TASK_LA2,
                  title: "Clear license operations backlog",
                  departmentName: "License Operations Administration Desk",
                  weight: 94,
                  weightMode: "percentage",
                  contributionWeight: 35,
                },
              ],
            },
            {
              id: NODE_IDS.KPI_MINING_LICENSE,
              title: "Mining license throughput volume",
              departmentName: "Mining License Operations Desk",
              weight: 180,
              weightMode: "number",
              targetUnit: "ton",
              tasks: [
                {
                  id: NODE_IDS.TASK_ML1,
                  title: "Issue new mining licenses on schedule",
                  departmentName: "Mining License Operations Desk",
                  weight: 72,
                  weightMode: "number",
                  targetUnit: "ton",
                  contributionWeight: 40,
                },
                {
                  id: NODE_IDS.TASK_ML2,
                  title: "Renew and amend mining licenses",
                  departmentName: "Mining License Operations Desk",
                  weight: 108,
                  weightMode: "number",
                  targetUnit: "ton",
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
          weight: 300,
          weightMode: "number",
          targetUnit: "birr",
          contributionWeight: 30,
          kpis: [
            {
              id: NODE_IDS.KPI_MEGA_PROJECTS,
              title: "Mega project pipeline delivery",
              departmentName: "Head, Mega Projects Desk",
              weight: 180,
              weightMode: "percentage",
              tasks: [
                {
                  id: NODE_IDS.TASK_MP1,
                  title: "Advance priority mega projects",
                  departmentName: "Head, Mega Projects Desk",
                  weight: 144,
                  weightMode: "percentage",
                  contributionWeight: 80,
                },
                {
                  id: NODE_IDS.TASK_MP2,
                  title: "Resolve mega project blockers",
                  departmentName: "Head, Mega Projects Desk",
                  weight: 36,
                  weightMode: "percentage",
                  contributionWeight: 20,
                },
              ],
            },
            {
              id: NODE_IDS.KPI_MEGA_MONITOR,
              title: "Mega project monitoring coverage",
              departmentName: "Head, Mega Project Monitoring and Support Desk (1)",
              weight: 120,
              weightMode: "frequency",
              tasks: [
                {
                  id: NODE_IDS.TASK_MM1,
                  title: "Conduct quarterly mega project reviews",
                  departmentName: "Head, Mega Project Monitoring and Support Desk (1)",
                  weight: 66,
                  weightMode: "frequency",
                  contributionWeight: 55,
                },
                {
                  id: NODE_IDS.TASK_MM2,
                  title: "Publish mega project monitoring reports",
                  departmentName: "Head, Mega Project Monitoring and Support Desk (2)",
                  weight: 54,
                  weightMode: "frequency",
                  contributionWeight: 45,
                },
              ],
            },
          ],
        },
        {
          id: NODE_IDS.GOAL_ENV,
          title: "Environment and community safeguarding",
          departmentName: "Environment and Community Development Desk",
          weight: 250,
          weightMode: "percentage",
          contributionWeight: 25,
          kpis: [
            {
              id: NODE_IDS.KPI_COMMUNITY,
              title: "Community engagement outreach",
              departmentName: "Environment and Community Development Desk",
              weight: 150,
              weightMode: "number",
              targetUnit: "person",
              tasks: [
                {
                  id: NODE_IDS.TASK_CE1,
                  title: "Conduct community consultations",
                  departmentName: "Environment and Community Development Desk",
                  weight: 90,
                  weightMode: "number",
                  targetUnit: "person",
                  contributionWeight: 60,
                },
                {
                  id: NODE_IDS.TASK_CE2,
                  title: "Publish community impact briefs",
                  departmentName: "Environment and Community Development Desk",
                  weight: 60,
                  weightMode: "number",
                  targetUnit: "person",
                  contributionWeight: 40,
                },
              ],
            },
            {
              id: NODE_IDS.KPI_ENV_INSPECTION,
              title: "Environmental compliance inspections",
              departmentName: "Environment and Community Development Desk",
              weight: 100,
              weightMode: "percentage",
              tasks: [
                {
                  id: NODE_IDS.TASK_EI1,
                  title: "Schedule field environmental inspections",
                  departmentName: "Environment and Community Development Desk",
                  weight: 70,
                  weightMode: "percentage",
                  contributionWeight: 70,
                },
                {
                  id: NODE_IDS.TASK_EI2,
                  title: "Report environmental inspection findings",
                  departmentName: "Environment and Community Development Desk",
                  weight: 30,
                  weightMode: "percentage",
                  contributionWeight: 30,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      strategic: {
        id: NODE_IDS.STRATEGIC_TRADE,
        title: "Trade and Artisanal Mining Programme",
        departmentName:
          "Executive Lead, Mining Trade and Artisanal Mining Operations",
        weight: 0,
      },
      goals: [
        {
          id: NODE_IDS.GOAL_ARTISANAL,
          title: "Artisanal mining formalization",
          departmentName: "Artisanal Mining Operations Desk",
          weight: 330,
          weightMode: "number",
          targetUnit: "ton",
          contributionWeight: 55,
          kpis: [
            {
              id: NODE_IDS.KPI_ARTISANAL_REG,
              title: "Artisanal site registration drives",
              departmentName: "Artisanal Mining Operations Desk",
              weight: 198,
              weightMode: "frequency",
              tasks: [
                {
                  id: NODE_IDS.TASK_AR1,
                  title: "Register artisanal mining sites",
                  departmentName: "Artisanal Mining Operations Desk",
                  weight: 149,
                  weightMode: "frequency",
                  contributionWeight: 75,
                },
                {
                  id: NODE_IDS.TASK_AR2,
                  title: "Verify artisanal operator credentials",
                  departmentName: "Artisanal Mining Operations Desk",
                  weight: 49,
                  weightMode: "frequency",
                  contributionWeight: 25,
                },
              ],
            },
            {
              id: NODE_IDS.KPI_ARTISANAL_SAFETY,
              title: "Artisanal safety training coverage",
              departmentName: "Artisanal Mining Operations Desk",
              weight: 132,
              weightMode: "percentage",
              tasks: [
                {
                  id: NODE_IDS.TASK_AS1,
                  title: "Deliver artisanal safety workshops",
                  departmentName: "Artisanal Mining Operations Desk",
                  weight: 79,
                  weightMode: "percentage",
                  contributionWeight: 60,
                },
                {
                  id: NODE_IDS.TASK_AS2,
                  title: "Distribute artisanal safety equipment kits",
                  departmentName: "Artisanal Mining Operations Desk",
                  weight: 53,
                  weightMode: "percentage",
                  contributionWeight: 40,
                },
              ],
            },
          ],
        },
        {
          id: NODE_IDS.GOAL_TRADE,
          title: "Mining trade operations expansion",
          departmentName: "Mining Trade Operations Desk",
          weight: 270,
          weightMode: "percentage",
          contributionWeight: 45,
          kpis: [
            {
              id: NODE_IDS.KPI_TRADE_EXPORT,
              title: "Export facilitation throughput",
              departmentName: "Mining Trade Operations Desk",
              weight: 162,
              weightMode: "number",
              targetUnit: "birr",
              tasks: [
                {
                  id: NODE_IDS.TASK_TE1,
                  title: "Process mineral export clearances",
                  departmentName: "Mining Trade Operations Desk",
                  weight: 105,
                  weightMode: "number",
                  targetUnit: "birr",
                  contributionWeight: 65,
                },
                {
                  id: NODE_IDS.TASK_TE2,
                  title: "Negotiate trade partnership MOUs",
                  departmentName: "Mining Trade Operations Desk",
                  weight: 57,
                  weightMode: "number",
                  targetUnit: "birr",
                  contributionWeight: 35,
                },
              ],
            },
            {
              id: NODE_IDS.KPI_TRADE_COMPLIANCE,
              title: "Trade compliance monitoring",
              departmentName: "Mining Trade Operations Desk",
              weight: 108,
              weightMode: "percentage",
              tasks: [
                {
                  id: NODE_IDS.TASK_TC1,
                  title: "Audit mining trade documentation",
                  departmentName: "Mining Trade Operations Desk",
                  weight: 49,
                  weightMode: "percentage",
                  contributionWeight: 45,
                },
                {
                  id: NODE_IDS.TASK_TC2,
                  title: "Enforce trade compliance sanctions",
                  departmentName: "Mining Trade Operations Desk",
                  weight: 59,
                  weightMode: "percentage",
                  contributionWeight: 55,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

module.exports = {
  PLAN_RULE_ID,
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
  PARENT_SECTOR_ID: SECTOR_ID,
  PARENT_SECTOR_NAME: SECTOR_NAME,
};
