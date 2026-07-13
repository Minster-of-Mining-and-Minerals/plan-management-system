"use strict";

const { v5: uuidv5 } = require("uuid");

const ID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/** Deterministic plan node ids for stable re-seeding. */
function nodeId(type, s, g = 0, k = 0, t = 0) {
  return uuidv5(`weight-rollup-qa:${type}:${s}:${g}:${k}:${t}`, ID_NAMESPACE);
}

const CONTRIBUTION_SPLITS = {
  goalsByStrategic: [
    [38, 34, 28],
    [41, 33, 26],
    [45, 31, 24],
  ],
  kpisByGoal: [
    [42, 35, 23],
    [37, 31, 32],
    [44, 28, 28],
    [39, 36, 25],
    [46, 30, 24],
    [40, 33, 27],
    [43, 29, 28],
    [36, 38, 26],
    [41, 34, 25],
  ],
  tasksByKpi: [
    [19, 14, 9],
    [16, 12, 7],
    [11, 8, 4],
    [18, 13, 6],
    [15, 11, 5],
    [14, 10, 4],
    [17, 12, 7],
    [13, 9, 5],
    [12, 8, 3],
  ],
};

const KPI_MODES = [
  { weightMode: "percentage" },
  { weightMode: "percentage" },
  { weightMode: "number", targetUnit: "ton" },
  { weightMode: "number", targetUnit: "birr" },
  { weightMode: "frequency" },
  { weightMode: "percentage" },
  { weightMode: "number", targetUnit: "person" },
  { weightMode: "frequency" },
  { weightMode: "percentage" },
];

const STRATEGIC_SPECS = [
  {
    title: "Mineral Resources Development Programme",
    departmentName: "State Minister, Mineral Resources Development Sector",
    goalDepartments: [
      "Executive Lead, Mining Operations, Processing License and Administration",
      "Executive Lead, Mining Mega Projects",
      "Environment and Community Development Desk",
    ],
    goalTitles: [
      "Mining licensing and operations administration",
      "Mega mining project delivery",
      "Environment and community safeguarding",
    ],
    kpiDepartments: [
      "License Operations Administration Desk",
      "Mining License Operations Desk",
      "Head, Mega Projects Desk",
      "Head, Mega Project Monitoring and Support Desk (1)",
      "Environment and Community Development Desk",
      "License Operations Administration Desk",
      "Mining License Operations Desk",
      "Head, Mega Projects Desk",
      "Head, Mega Project Monitoring and Support Desk (2)",
    ],
  },
  {
    title: "Trade and Artisanal Mining Programme",
    departmentName: "Executive Lead, Mining Trade and Artisanal Mining Operations",
    goalDepartments: [
      "Artisanal Mining Operations Desk",
      "Mining Trade Operations Desk",
      "Ministry Deputy Advisor",
    ],
    goalTitles: [
      "Artisanal mining formalization",
      "Mining trade operations expansion",
      "Cross-cutting mineral sector coordination",
    ],
    kpiDepartments: [
      "Artisanal Mining Operations Desk",
      "Mining Trade Operations Desk",
      "Environment and Community Development Desk",
      "Artisanal Mining Operations Desk",
      "Mining Trade Operations Desk",
      "License Operations Administration Desk",
      "Mining License Operations Desk",
      "Head, Mega Projects Desk",
      "Mining Trade Operations Desk",
    ],
  },
  {
    title: "Sector Governance and Institutional Support",
    departmentName: "Chief Executive Officer",
    goalDepartments: [
      "Planning, Monitoring and Evaluation Executive Officer",
      "Institutional Transformation Executive Officer",
      "Capacity and Human Resource Development Executive Officer",
    ],
    goalTitles: [
      "Planning and monitoring excellence",
      "Institutional transformation delivery",
      "Capacity and workforce development",
    ],
    kpiDepartments: [
      "Planning, Monitoring and Evaluation Executive Officer",
      "Institutional Transformation Executive Officer",
      "Capacity and Human Resource Development Executive Officer",
      "Procurement and Finance Executive Officer",
      "Basic Services Executive Officer",
      "Information Communication Technology Executive Officer",
      "Women and Social Affairs Mainstreaming Executive Officer",
      "Planning, Monitoring and Evaluation Executive Officer",
      "Institutional Transformation Executive Officer",
    ],
  },
];

const KPI_TITLE_TEMPLATES = [
  "Operational throughput",
  "Compliance coverage",
  "Service delivery volume",
  "Field inspection cadence",
  "Stakeholder engagement reach",
  "Process turnaround time",
  "Quality assurance score",
  "Reporting completeness",
  "Implementation milestones",
];

const TASK_TITLE_TEMPLATES = [
  "Execute priority work package",
  "Monitor and report progress",
  "Resolve delivery blockers",
];

function scaleTaskWeights(kpiWeight, splits) {
  const sum = splits.reduce((total, value) => total + value, 0);
  if (sum <= 0) return splits;
  const scaled = splits.map((value) => Math.round((kpiWeight * value) / sum));
  const scaledSum = scaled.reduce((total, value) => total + value, 0);
  const diff = kpiWeight - scaledSum;
  if (diff !== 0) {
    scaled[scaled.length - 1] += diff;
  }
  return scaled;
}

function buildPlanTree() {
  const nodeIds = {};
  const strategicAreas = [];
  let goalSplitIndex = 0;
  let kpiSplitIndex = 0;
  let taskSplitIndex = 0;
  let kpiModeIndex = 0;

  for (let s = 0; s < STRATEGIC_SPECS.length; s++) {
    const spec = STRATEGIC_SPECS[s];
    const strategicId = nodeId("S", s + 1);
    nodeIds[`STRATEGIC_${s + 1}`] = strategicId;

    const goals = [];
    const goalContributions = CONTRIBUTION_SPLITS.goalsByStrategic[s];

    for (let g = 0; g < 3; g++) {
      const goalId = nodeId("G", s + 1, g + 1);
      nodeIds[`GOAL_S${s + 1}_G${g + 1}`] = goalId;

      const kpis = [];
      const kpiWeights = CONTRIBUTION_SPLITS.kpisByGoal[goalSplitIndex % CONTRIBUTION_SPLITS.kpisByGoal.length];
      goalSplitIndex++;

      for (let k = 0; k < 3; k++) {
        const kpiId = nodeId("K", s + 1, g + 1, k + 1);

        const mode = KPI_MODES[kpiModeIndex % KPI_MODES.length];
        kpiModeIndex++;
        const kpiWeight = kpiWeights[k];
        const taskSplits = scaleTaskWeights(
          kpiWeight,
          CONTRIBUTION_SPLITS.tasksByKpi[taskSplitIndex % CONTRIBUTION_SPLITS.tasksByKpi.length]
        );
        taskSplitIndex++;

        const tasks = [];
        for (let t = 0; t < 3; t++) {
          const taskId = nodeId("T", s + 1, g + 1, k + 1, t + 1);
          const dept =
            spec.kpiDepartments[(s * 9 + g * 3 + k + t) % spec.kpiDepartments.length];
          tasks.push({
            id: taskId,
            title: `${TASK_TITLE_TEMPLATES[t]} — ${KPI_TITLE_TEMPLATES[k]} (${spec.goalTitles[g]})`,
            departmentName: dept,
            weight: taskSplits[t],
            weightMode: mode.weightMode,
            targetUnit: mode.targetUnit ?? null,
          });
        }

        kpis.push({
          id: kpiId,
          title: `${KPI_TITLE_TEMPLATES[k]} — ${spec.goalTitles[g]}`,
          departmentName: spec.kpiDepartments[(s * 3 + g * 3 + k) % spec.kpiDepartments.length],
          weight: kpiWeight,
          weightMode: mode.weightMode,
          targetUnit: mode.targetUnit ?? null,
          tasks,
        });
      }

      goals.push({
        id: goalId,
        title: spec.goalTitles[g],
        departmentName: spec.goalDepartments[g],
        weight: 0,
        contributionWeight: goalContributions[g],
        kpis,
      });
    }

    strategicAreas.push({
      strategic: {
        id: strategicId,
        title: spec.title,
        departmentName: spec.departmentName,
        weight: 0,
      },
      goals,
    });
  }

  return { nodeIds, strategicAreas };
}

module.exports = {
  buildPlanTree,
  CONTRIBUTION_SPLITS,
};
