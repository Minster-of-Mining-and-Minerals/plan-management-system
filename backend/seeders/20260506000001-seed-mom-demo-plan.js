"use strict";

const { v4: uuidv4, v5: uuidv5 } = require("uuid");

const ID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/** Fixed IDs for idempotent re-runs */
const IDS = {
  MOM_GOV: "10000000-0000-4000-8000-000000000001",
  MIDI_GOV: "10000000-0000-4000-8000-000000000002",
  GIE_GOV: "10000000-0000-4000-8000-000000000003",
  MASTER: "20000000-0000-4000-8000-000000000001",
  ANNUAL_2026: "20000000-0000-4000-8000-000000000011",
  ANNUAL_2027: "20000000-0000-4000-8000-000000000012",
  ANNUAL_2028: "20000000-0000-4000-8000-000000000013",
  PERIOD_2026_Q1: "20000000-0000-4000-8000-000000000021",
  PERIOD_2026_Q2: "20000000-0000-4000-8000-000000000022",
  PERIOD_2026_Q3: "20000000-0000-4000-8000-000000000023",
  PERIOD_2026_Q4: "20000000-0000-4000-8000-000000000024",
  DEFAULT_PLAN_RULE: "60000000-0000-4000-8000-000000000001",
  STRATEGIC: "40000000-0000-4000-8000-000000000001",
  GOAL_1: "40000000-0000-4000-8000-000000000011",
  GOAL_2: "40000000-0000-4000-8000-000000000012",
  GOAL_3: "40000000-0000-4000-8000-000000000013",
  GOAL_4: "40000000-0000-4000-8000-000000000014",
  GOAL_5: "40000000-0000-4000-8000-000000000015",
};

const KPI = {
  G1_K1: "41000000-0000-4000-8000-000000000111",
  G1_K2: "41000000-0000-4000-8000-000000000112",
  G2_K1: "41000000-0000-4000-8000-000000000121",
  G2_K2: "41000000-0000-4000-8000-000000000122",
  G3_K1: "41000000-0000-4000-8000-000000000131",
  G3_K2: "41000000-0000-4000-8000-000000000132",
  G4_K1: "41000000-0000-4000-8000-000000000141",
  G4_K2: "41000000-0000-4000-8000-000000000142",
  G5_K1: "41000000-0000-4000-8000-000000000151",
  G5_K2: "41000000-0000-4000-8000-000000000152",
};

const TASK = {
  G1_K1_T1: "50000000-0000-4000-8000-000000000001",
  G1_K1_T2: "50000000-0000-4000-8000-000000000002",
  G1_K2_T1: "50000000-0000-4000-8000-000000000003",
  G1_K2_T2: "50000000-0000-4000-8000-000000000004",
  G2_K1_T1: "50000000-0000-4000-8000-000000000005",
  G2_K1_T2: "50000000-0000-4000-8000-000000000006",
  G2_K2_T1: "50000000-0000-4000-8000-000000000007",
  G2_K2_T2: "50000000-0000-4000-8000-000000000008",
  G3_K1_T1: "50000000-0000-4000-8000-000000000009",
  G3_K1_T2: "50000000-0000-4000-8000-000000000010",
  G3_K2_T1: "50000000-0000-4000-8000-000000000011",
  G3_K2_T2: "50000000-0000-4000-8000-000000000012",
  G4_K1_T1: "50000000-0000-4000-8000-000000000013",
  G4_K1_T2: "50000000-0000-4000-8000-000000000014",
  G4_K2_T1: "50000000-0000-4000-8000-000000000015",
  G4_K2_T2: "50000000-0000-4000-8000-000000000016",
  G5_K1_T1: "50000000-0000-4000-8000-000000000017",
  G5_K2_T1: "50000000-0000-4000-8000-000000000018",
};

/** Year 1 annual target allocations keyed by master node id */
const YEAR1_ANNUAL_TARGETS = {
  [IDS.GOAL_1]: 90,
  [IDS.GOAL_3]: 400,
  [TASK.G2_K1_T1]: 35,
  [IDS.GOAL_5]: 15,
};

/** Year 2 partial annual allocations (multi-year draft → annual cascade demo) */
const YEAR2_ANNUAL_TARGETS = {
  [IDS.GOAL_1]: 100,
  [IDS.GOAL_3]: 500,
  [TASK.G2_K1_T1]: 40,
};

/**
 * Quarterly period target splits keyed by master node id.
 * Each array must sum to the corresponding annual target for that node in year 1.
 */
const PERIOD_TARGET_SPLITS = {
  [IDS.GOAL_1]: [20, 25, 20, 25],
  [IDS.GOAL_3]: [100, 100, 100, 100],
  [IDS.GOAL_5]: [4, 4, 3, 4],
  [TASK.G2_K1_T1]: [9, 9, 9, 8],
};

const DEMO_PLANNING_CONFIG_ID = "90000000-0000-4000-8000-000000000001";

const EXECUTION_PERIODS_2026 = [
  {
    plan_version_id: IDS.PERIOD_2026_Q1,
    period_label: "Q1",
    sequence_index: 1,
    status: "draft",
    is_locked: false,
  },
  {
    plan_version_id: IDS.PERIOD_2026_Q2,
    period_label: "Q2",
    sequence_index: 2,
    status: "draft",
    is_locked: false,
  },
  {
    plan_version_id: IDS.PERIOD_2026_Q3,
    period_label: "Q3",
    sequence_index: 3,
    status: "draft",
    is_locked: false,
  },
  {
    plan_version_id: IDS.PERIOD_2026_Q4,
    period_label: "Q4",
    sequence_index: 4,
    status: "draft",
    is_locked: false,
  },
];

function entityId(type, path) {
  return uuidv5(`${type}:${path}`, ID_NAMESPACE);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function node(
  id,
  planVersionId,
  parentId,
  type,
  title,
  description,
  weight,
  level,
  order,
  opts = {}
) {
  return {
    plan_node_id: id,
    plan_version_id: planVersionId,
    parent_id: parentId,
    source_plan_node_id: opts.sourcePlanNodeId ?? null,
    type,
    title,
    description,
    weight,
    weight_mode: opts.weightMode ?? null,
    target_unit: opts.targetUnit ?? null,
    level,
    order,
    is_active: true,
    assignment_sharing_mode: opts.sharingMode ?? "exclusive",
    annual_target: opts.annualTarget ?? null,
  };
}

async function findDepartmentId(queryInterface, governmentStructureId, name) {
  const rows = await queryInterface.sequelize.query(
    `SELECT internal_structure_id FROM internal_structures
     WHERE government_structure_id = :govId AND name = :name LIMIT 1`,
    {
      replacements: { govId: governmentStructureId, name },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0]?.internal_structure_id ?? null;
}

async function seedPlanningConfiguration(queryInterface, now) {
  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));
  if (!tableNames.includes("planning_configurations")) {
    return;
  }

  const [existing] = await queryInterface.sequelize.query(
    `SELECT planning_configuration_id FROM planning_configurations WHERE planning_configuration_id = :id LIMIT 1`,
    {
      replacements: { id: DEMO_PLANNING_CONFIG_ID },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  const configPayload = {
    breakdown_mode: "quarterly",
    custom_periods: [],
    updated_at: now,
  };

  if (existing) {
    await queryInterface.bulkUpdate(
      "planning_configurations",
      configPayload,
      { planning_configuration_id: DEMO_PLANNING_CONFIG_ID }
    );
  } else {
    await queryInterface.bulkInsert("planning_configurations", [
      {
        planning_configuration_id: DEMO_PLANNING_CONFIG_ID,
        government_structure_id: null,
        min_duration_years: 1,
        max_duration_years: 10,
        draft_entity_label_singular: "Plan Draft",
        draft_entity_label_plural: "Plan Drafts",
        create_action_label: "Create Plan Draft",
        planning_period_label: "Planning Period",
        duration_label: "Duration",
        start_year_label: "Start Date",
        end_year_label: "End Date",
        target_units: [
          { id: "person", label: "Person", symbol: "persons" },
          { id: "km", label: "Kilometer", symbol: "km" },
          { id: "birr", label: "Birr", symbol: "ETB" },
          { id: "ton", label: "Ton", symbol: "t" },
          { id: "unit", label: "Unit", symbol: "units" },
        ],
        breakdown_mode: "quarterly",
        custom_periods: [],
        created_at: now,
        updated_at: now,
      },
    ]);
  }
}

function buildPeriodTargetsForQuarter(nodeIdMap, quarterIndex) {
  const targets = {};
  for (const [masterNodeId, splits] of Object.entries(PERIOD_TARGET_SPLITS)) {
    const annualNodeId = nodeIdMap.get(masterNodeId);
    const value = splits[quarterIndex];
    if (annualNodeId && value != null) {
      targets[annualNodeId] = value;
    }
  }
  return targets;
}

async function seedExecutionPeriods({
  queryInterface,
  annual,
  annualNodes,
  nodeIdMap,
  annualAssignmentPayload,
  now,
}) {
  const annualNodePayload = annualNodes.map(({ created_at, updated_at, ...rest }) => rest);

  await queryInterface.bulkInsert(
    "plan_versions",
    EXECUTION_PERIODS_2026.map((period) => ({
      plan_version_id: period.plan_version_id,
      version_kind: "execution_period",
      parent_plan_version_id: annual.plan_version_id,
      period_label: period.period_label,
      planning_year: annual.planning_year,
      sequence_index: period.sequence_index,
      is_locked: period.is_locked,
      finalized_at: null,
      draft_name: `${annual.draft_name} — ${period.period_label}`,
      planning_start_date: `${annual.planning_year}-01-01`,
      planning_end_date: `${annual.planning_year}-12-31`,
      start_month: 1,
      end_month: 12,
      start_year: annual.planning_year,
      end_year: annual.planning_year,
      planning_duration_years: 1,
      year: annual.planning_year,
      version_number: 100 + period.sequence_index,
      status: period.status,
      government_structure_id: IDS.MOM_GOV,
      based_on_version_id: null,
      plan_rule_id: IDS.DEFAULT_PLAN_RULE,
      created_at: now,
      updated_at: now,
    }))
  );

  const periodNodeMaps = new Map();

  for (let i = 0; i < EXECUTION_PERIODS_2026.length; i += 1) {
    const period = EXECUTION_PERIODS_2026[i];
    const periodTargets = buildPeriodTargetsForQuarter(nodeIdMap, i);

    const { periodNodes, nodeIdMap: periodNodeIdMap } = copyNodesToPeriod(
      annualNodePayload,
      period.plan_version_id,
      periodTargets
    );

    periodNodeMaps.set(period.plan_version_id, periodNodeIdMap);

    await queryInterface.bulkInsert(
      "plan_nodes",
      periodNodes.map((n) => ({ ...n, created_at: now, updated_at: now }))
    );

    const { newExternal, newInternal } = copyAssignments(
      annualAssignmentPayload,
      periodNodeIdMap
    );

    if (newExternal.length > 0) {
      await queryInterface.bulkInsert(
        "external_assignments",
        newExternal.map((a) => ({ ...a, created_at: now, updated_at: now }))
      );
    }
    if (newInternal.length > 0) {
      await queryInterface.bulkInsert(
        "internal_assignments",
        newInternal.map((a) => ({ ...a, created_at: now, updated_at: now }))
      );
    }
  }

  return periodNodeMaps;
}

function userIdForDept(sectorKey, deptName, roleKey) {
  return entityId("user", `${sectorKey}/${slugify(deptName)}/${roleKey}`);
}

async function removeExistingDemo(queryInterface) {
  const versionIds = [
    IDS.MASTER,
    IDS.ANNUAL_2026,
    IDS.ANNUAL_2027,
    IDS.ANNUAL_2028,
    IDS.PERIOD_2026_Q1,
    IDS.PERIOD_2026_Q2,
    IDS.PERIOD_2026_Q3,
    IDS.PERIOD_2026_Q4,
  ];

  const nodes = await queryInterface.sequelize.query(
    `SELECT plan_node_id FROM plan_nodes WHERE plan_version_id IN (:versionIds)`,
    {
      replacements: { versionIds },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  const nodeIds = nodes.map((n) => n.plan_node_id);

  if (nodeIds.length > 0) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));

    if (tableNames.includes("plan_node_action_logs")) {
      await queryInterface.bulkDelete("plan_node_action_logs", {
        plan_node_id: nodeIds,
      });
    }

    await queryInterface.bulkDelete("internal_assignments", {
      plan_node_id: nodeIds,
    });
    await queryInterface.bulkDelete("external_assignments", {
      plan_node_id: nodeIds,
    });
    await queryInterface.bulkDelete("plan_nodes", {
      plan_version_id: versionIds,
    });
  }

  await queryInterface.bulkDelete("plan_versions", {
    plan_version_id: versionIds,
  });
}

function buildMasterHierarchy(planVersionId) {
  const pv = planVersionId;

  return [
    node(
      IDS.STRATEGIC,
      pv,
      null,
      "strategic",
      "Increase National Mineral Production",
      "Overarching strategic focus to grow mineral output, strengthen geological capacity, attract investment, and modernize sector governance across the Ministry of Mines enterprise.",
      0,
      1,
      1,
      { sharingMode: "shared" }
    ),

    node(
      IDS.GOAL_1,
      pv,
      IDS.STRATEGIC,
      "goal",
      "Increase Gold Production",
      "Raise national gold output through licensing reforms, production monitoring, and operational support to active mining operations.",
      300,
      2,
      1,
      { weightMode: "number", targetUnit: "ton" }
    ),
    node(
      KPI.G1_K1,
      pv,
      IDS.GOAL_1,
      "kpi",
      "Improve Mining Licenses",
      "Streamline exploration and mining license issuance to unlock new gold production capacity.",
      50,
      3,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G1_K1_T1,
      pv,
      KPI.G1_K1,
      "task",
      "Deploy digital licensing portal",
      "Launch an integrated online portal for license applications, fee payment, and status tracking.",
      55,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G1_K1_T2,
      pv,
      KPI.G1_K1,
      "task",
      "Train regional licensing officers",
      "Conduct licensing procedure workshops in priority gold-producing regions.",
      45,
      4,
      2,
      { weightMode: "percentage" }
    ),
    node(
      KPI.G1_K2,
      pv,
      IDS.GOAL_1,
      "kpi",
      "Expand Production Monitoring",
      "Track and report gold production volumes across licensed operations nationwide.",
      50,
      3,
      2,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G1_K2_T1,
      pv,
      KPI.G1_K2,
      "task",
      "Install production tracking systems",
      "Deploy quarterly production reporting systems at large-scale gold mines.",
      60,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G1_K2_T2,
      pv,
      KPI.G1_K2,
      "task",
      "Publish quarterly gold production dashboard",
      "Public dashboard showing regional gold output trends and license-linked production.",
      40,
      4,
      2,
      { weightMode: "percentage" }
    ),

    node(
      IDS.GOAL_2,
      pv,
      IDS.STRATEGIC,
      "goal",
      "Strengthen Geological Survey Capacity",
      "Modernize mapping systems, improve data collection, and expand geoscience services through GIE.",
      100,
      2,
      2,
      { weightMode: "percentage" }
    ),
    node(
      KPI.G2_K1,
      pv,
      IDS.GOAL_2,
      "kpi",
      "Modernize Mapping Systems",
      "Upgrade geospatial mapping infrastructure and digitize legacy geological map archives.",
      60,
      3,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G2_K1_T1,
      pv,
      KPI.G2_K1,
      "task",
      "Digitize geological maps",
      "Scan, georeference, and publish priority geological map sheets to the national geodata repository.",
      100,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G2_K1_T2,
      pv,
      KPI.G2_K1,
      "task",
      "Deploy GIS mapping workstations",
      "Equip mapping teams with modern GIS hardware and software across regional offices.",
      40,
      4,
      2,
      { weightMode: "percentage" }
    ),
    node(
      KPI.G2_K2,
      pv,
      IDS.GOAL_2,
      "kpi",
      "Improve Data Collection",
      "Enhance field survey coverage and geological data quality for investment decision-making.",
      40,
      3,
      2,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G2_K2_T1,
      pv,
      KPI.G2_K2,
      "task",
      "Improve geological data validation",
      "Establish QA procedures for incoming geological datasets and survey submissions.",
      55,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G2_K2_T2,
      pv,
      KPI.G2_K2,
      "task",
      "Expand field survey teams",
      "Recruit and equip additional field geologists for priority mineral belts.",
      45,
      4,
      2,
      { weightMode: "percentage" }
    ),

    node(
      IDS.GOAL_3,
      pv,
      IDS.STRATEGIC,
      "goal",
      "Increase Foreign Investment",
      "Attract international mining investment through promotion programs and improved licensing services.",
      1500,
      2,
      3,
      { weightMode: "number", targetUnit: "birr" }
    ),
    node(
      KPI.G3_K1,
      pv,
      IDS.GOAL_3,
      "kpi",
      "Investor Attraction Program",
      "Design and execute targeted campaigns to promote Ethiopia's mining investment opportunities.",
      50,
      3,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G3_K1_T1,
      pv,
      KPI.G3_K1,
      "task",
      "Launch international mining investment forum",
      "Host a flagship investor forum in Addis Ababa with roadshows in Dubai and Johannesburg.",
      55,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G3_K1_T2,
      pv,
      KPI.G3_K1,
      "task",
      "Publish investor opportunity catalogue",
      "Produce a bilingual catalogue of priority mineral blocks and investment incentives.",
      45,
      4,
      2,
      { weightMode: "percentage" }
    ),
    node(
      KPI.G3_K2,
      pv,
      IDS.GOAL_3,
      "kpi",
      "Licensing Service Improvement",
      "Reduce licensing bottlenecks and improve investor-facing licensing service quality.",
      50,
      3,
      2,
      { weightMode: "percentage", sharingMode: "exclusive" }
    ),
    node(
      TASK.G3_K2_T1,
      pv,
      KPI.G3_K2,
      "task",
      "Reduce application backlog by 40%",
      "Clear pending investor licensing applications through dedicated fast-track review teams.",
      60,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G3_K2_T2,
      pv,
      KPI.G3_K2,
      "task",
      "Establish investor licensing help desk",
      "Single-window support desk for foreign investors navigating licensing requirements.",
      40,
      4,
      2,
      { weightMode: "percentage" }
    ),

    node(
      IDS.GOAL_4,
      pv,
      IDS.STRATEGIC,
      "goal",
      "Enhance Sector Governance & Compliance",
      "Strengthen environmental compliance, mine safety oversight, and institutional monitoring.",
      100,
      2,
      4,
      { weightMode: "percentage" }
    ),
    node(
      KPI.G4_K1,
      pv,
      IDS.GOAL_4,
      "kpi",
      "Environmental Compliance Inspections",
      "Complete environmental compliance inspections at all active large-scale mining operations.",
      55,
      3,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G4_K1_T1,
      pv,
      KPI.G4_K1,
      "task",
      "Deploy quarterly environmental inspection teams",
      "Schedule and execute quarterly field inspections with standardized checklists.",
      50,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G4_K1_T2,
      pv,
      KPI.G4_K1,
      "task",
      "Track remediation action plans",
      "Document non-compliance findings and monitor corrective action timelines.",
      50,
      4,
      2,
      { weightMode: "percentage" }
    ),
    node(
      KPI.G4_K2,
      pv,
      IDS.GOAL_4,
      "kpi",
      "Mine Safety Performance",
      "Reduce reportable mine safety incidents and improve safety training coverage.",
      45,
      3,
      2,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G4_K2_T1,
      pv,
      KPI.G4_K2,
      "task",
      "Roll out mine safety training program",
      "Train artisanal and small-scale miners on safe extraction practices.",
      55,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G4_K2_T2,
      pv,
      KPI.G4_K2,
      "task",
      "Update mine closure guidelines",
      "Revise closure and rehabilitation guidelines aligned with national environmental standards.",
      45,
      4,
      2,
      { weightMode: "percentage" }
    ),

    node(
      IDS.GOAL_5,
      pv,
      IDS.STRATEGIC,
      "goal",
      "Reduce Licensing Processing Time",
      "Cut average licensing processing time by half through process redesign and digital workflows.",
      50,
      2,
      5,
      { weightMode: "percentage" }
    ),
    node(
      KPI.G5_K1,
      pv,
      IDS.GOAL_5,
      "kpi",
      "Process Redesign & Automation",
      "Redesign end-to-end licensing workflows and automate approval routing.",
      55,
      3,
      1,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G5_K1_T1,
      pv,
      KPI.G5_K1,
      "task",
      "Map and streamline licensing workflow",
      "Document current-state processes and implement lean workflow improvements.",
      100,
      4,
      1,
      { weightMode: "percentage" }
    ),
    node(
      KPI.G5_K2,
      pv,
      IDS.GOAL_5,
      "kpi",
      "Service Level Monitoring",
      "Track and publish average licensing turnaround times by license category.",
      45,
      3,
      2,
      { weightMode: "percentage" }
    ),
    node(
      TASK.G5_K2_T1,
      pv,
      KPI.G5_K2,
      "task",
      "Publish monthly licensing SLA dashboard",
      "Dashboard showing processing times, backlog, and SLA compliance by region.",
      100,
      4,
      1,
      { weightMode: "percentage" }
    ),
  ];
}

function copyNodesToAnnual(masterNodes, annualVersionId, annualTargetBySourceId = {}) {
  const nodeIdMap = new Map();
  const annualNodes = [];

  for (const source of masterNodes) {
    nodeIdMap.set(source.plan_node_id, uuidv4());
  }

  for (const source of masterNodes) {
    const newId = nodeIdMap.get(source.plan_node_id);
    const annualTarget = annualTargetBySourceId[source.plan_node_id] ?? null;

    annualNodes.push({
      plan_node_id: newId,
      plan_version_id: annualVersionId,
      parent_id: source.parent_id ? nodeIdMap.get(source.parent_id) : null,
      source_plan_node_id: source.plan_node_id,
      type: source.type,
      title: source.title,
      description: source.description,
      weight: source.weight,
      weight_mode: source.weight_mode,
      target_unit: source.target_unit,
      level: source.level,
      order: source.order,
      is_active: source.is_active,
      assignment_sharing_mode: source.assignment_sharing_mode,
      annual_target: annualTarget,
    });
  }

  return { annualNodes, nodeIdMap };
}

function copyNodesToPeriod(annualNodes, periodVersionId, periodTargetByAnnualNodeId = {}) {
  const nodeIdMap = new Map();
  const periodNodes = [];

  for (const source of annualNodes) {
    nodeIdMap.set(source.plan_node_id, uuidv4());
  }

  for (const source of annualNodes) {
    const newId = nodeIdMap.get(source.plan_node_id);
    const periodTarget = periodTargetByAnnualNodeId[source.plan_node_id] ?? null;

    periodNodes.push({
      plan_node_id: newId,
      plan_version_id: periodVersionId,
      parent_id: source.parent_id ? nodeIdMap.get(source.parent_id) : null,
      source_plan_node_id: source.plan_node_id,
      type: source.type,
      title: source.title,
      description: source.description,
      weight: source.weight,
      weight_mode: source.weight_mode,
      target_unit: source.target_unit,
      level: source.level,
      order: source.order,
      is_active: source.is_active,
      assignment_sharing_mode: source.assignment_sharing_mode,
      annual_target: source.annual_target,
      period_target: periodTarget,
    });
  }

  return { periodNodes, nodeIdMap };
}

function copyAssignments(masterAssignments, nodeIdMap, externalIdMap = new Map()) {
  const newExternal = [];
  const newInternal = [];
  const internalIdMap = new Map();

  for (const ext of masterAssignments.external) {
    const newId = uuidv4();
    externalIdMap.set(ext.external_assignment_id, newId);
    newExternal.push({
      external_assignment_id: newId,
      plan_node_id: nodeIdMap.get(ext.plan_node_id),
      government_structure_id: ext.government_structure_id,
      is_visible: ext.is_visible,
      requires_report: ext.requires_report,
      is_active: ext.is_active ?? true,
    });
  }

  for (const int of masterAssignments.internal) {
    const newId = uuidv4();
    internalIdMap.set(int.internal_assignment_id, newId);
    newInternal.push({
      internal_assignment_id: newId,
      plan_node_id: nodeIdMap.get(int.plan_node_id),
      internal_structure_id: int.internal_structure_id,
      user_id: int.user_id,
      action_id: int.action_id,
      is_active: int.is_active ?? true,
      branch_external_assignment_id: int.branch_external_assignment_id
        ? externalIdMap.get(int.branch_external_assignment_id) ?? null
        : null,
      branch_internal_assignment_id: int.branch_internal_assignment_id
        ? internalIdMap.get(int.branch_internal_assignment_id) ?? null
        : null,
    });
  }

  return { newExternal, newInternal };
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const finalizedAt = new Date("2026-01-15T10:00:00.000Z");

    const momExists = await queryInterface.sequelize.query(
      `SELECT government_structure_id FROM government_structures WHERE government_structure_id = :id LIMIT 1`,
      {
        replacements: { id: IDS.MOM_GOV },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (momExists.length === 0) {
      console.log(
        "Ministry of Mines structure not found. Run organizational hierarchy seeder first (20260505500001)."
      );
      return;
    }

    await removeExistingDemo(queryInterface);
    await seedPlanningConfiguration(queryInterface, now);

    const dept = {
      momPlanning: await findDepartmentId(queryInterface, IDS.MOM_GOV, "Planning Directorate"),
      momLicensing: await findDepartmentId(
        queryInterface,
        IDS.MOM_GOV,
        "Mining Licensing Directorate"
      ),
      momMe: await findDepartmentId(
        queryInterface,
        IDS.MOM_GOV,
        "Monitoring & Evaluation Directorate"
      ),
      momEnv: await findDepartmentId(
        queryInterface,
        IDS.MOM_GOV,
        "Environmental Compliance Directorate"
      ),
      momHr: await findDepartmentId(queryInterface, IDS.MOM_GOV, "Human Resources Directorate"),
      momIct: await findDepartmentId(queryInterface, IDS.MOM_GOV, "ICT Directorate"),
      midiLicensing: await findDepartmentId(
        queryInterface,
        IDS.MIDI_GOV,
        "Licensing Department"
      ),
      midiInvestment: await findDepartmentId(
        queryInterface,
        IDS.MIDI_GOV,
        "Investment Promotion Department"
      ),
      midiMineral: await findDepartmentId(
        queryInterface,
        IDS.MIDI_GOV,
        "Mineral Development Department"
      ),
      gieMapping: await findDepartmentId(queryInterface, IDS.GIE_GOV, "Mapping Department"),
      gieSurvey: await findDepartmentId(
        queryInterface,
        IDS.GIE_GOV,
        "Geological Survey Department"
      ),
      gieData: await findDepartmentId(queryInterface, IDS.GIE_GOV, "Data Management Department"),
      gieLab: await findDepartmentId(queryInterface, IDS.GIE_GOV, "Laboratory Department"),
    };

    const requiredDepts = [
      dept.momPlanning,
      dept.midiLicensing,
      dept.gieMapping,
      dept.gieSurvey,
      dept.midiInvestment,
    ];

    if (requiredDepts.some((id) => !id)) {
      console.warn(
        "Required departments missing — re-run organizational hierarchy seeder (20260505500001), then retry."
      );
      return;
    }

    const userGeologySenior = userIdForDept("gie", "Geological Survey Department", "senior-officer");
    const userMappingHead = userIdForDept("gie", "Mapping Department", "head");
    const userLicensingOfficer = userIdForDept("midi", "Licensing Department", "officer");
    const userInvestmentCoordinator = userIdForDept(
      "midi",
      "Investment Promotion Department",
      "coordinator"
    );

    const actions = await queryInterface.sequelize.query(
      `SELECT assignment_action_id, code FROM plan_assignment_actions WHERE code IN ('EXECUTION', 'MONITORING_REPORTING', 'APPROVAL')`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const actionMap = Object.fromEntries(actions.map((a) => [a.code, a.assignment_action_id]));

    if (!actionMap.EXECUTION) {
      console.warn("Plan assignment actions not found — skipping demo plan seeder.");
      return;
    }

    // ── Master draft (finalized, 3-year period) ─────────────────────────
    await queryInterface.bulkInsert("plan_versions", [
      {
        plan_version_id: IDS.MASTER,
        version_kind: "master",
        parent_plan_version_id: null,
        planning_year: null,
        sequence_index: null,
        is_locked: false,
        finalized_at: finalizedAt,
        draft_name: "National Mining Development Plan",
        planning_start_date: "2026-01-01",
        planning_end_date: "2028-12-31",
        start_month: 1,
        end_month: 12,
        start_year: 2026,
        end_year: 2028,
        planning_duration_years: 3,
        year: 2026,
        version_number: 0,
        status: "finalized",
        government_structure_id: IDS.MOM_GOV,
        based_on_version_id: null,
        plan_rule_id: IDS.DEFAULT_PLAN_RULE,
        created_at: now,
        updated_at: now,
      },
    ]);

    const masterNodes = buildMasterHierarchy(IDS.MASTER).map((n) => ({
      ...n,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("plan_nodes", masterNodes);

    const extStrategicMidi = uuidv4();
    const extStrategicGie = uuidv4();
    const extGoal1Midi = uuidv4();
    const extGoal2Gie = uuidv4();
    const extGoal3Midi = uuidv4();
    const extKpiMappingGie = uuidv4();

    const externalAssignments = [
      {
        external_assignment_id: extStrategicMidi,
        plan_node_id: IDS.STRATEGIC,
        government_structure_id: IDS.MIDI_GOV,
        is_visible: true,
        requires_report: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        external_assignment_id: extStrategicGie,
        plan_node_id: IDS.STRATEGIC,
        government_structure_id: IDS.GIE_GOV,
        is_visible: true,
        requires_report: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        external_assignment_id: extGoal1Midi,
        plan_node_id: IDS.GOAL_1,
        government_structure_id: IDS.MIDI_GOV,
        is_visible: true,
        requires_report: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        external_assignment_id: extGoal2Gie,
        plan_node_id: IDS.GOAL_2,
        government_structure_id: IDS.GIE_GOV,
        is_visible: true,
        requires_report: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        external_assignment_id: extGoal3Midi,
        plan_node_id: IDS.GOAL_3,
        government_structure_id: IDS.MIDI_GOV,
        is_visible: true,
        requires_report: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        external_assignment_id: extKpiMappingGie,
        plan_node_id: KPI.G2_K1,
        government_structure_id: IDS.GIE_GOV,
        is_visible: true,
        requires_report: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    const internalSpec = [
      { nodeId: IDS.STRATEGIC, deptId: dept.momPlanning, action: "MONITORING_REPORTING" },
      { nodeId: IDS.GOAL_1, deptId: dept.midiMineral, action: "EXECUTION" },
      { nodeId: KPI.G1_K1, deptId: dept.momLicensing, action: "EXECUTION" },
      { nodeId: TASK.G1_K1_T1, deptId: dept.momIct, action: "EXECUTION" },
      { nodeId: TASK.G1_K1_T2, deptId: dept.momHr, action: "EXECUTION" },
      { nodeId: KPI.G1_K2, deptId: dept.momMe, action: "MONITORING_REPORTING" },
      { nodeId: TASK.G1_K2_T1, deptId: dept.midiMineral, action: "EXECUTION" },
      { nodeId: TASK.G1_K2_T2, deptId: dept.momMe, action: "MONITORING_REPORTING" },
      { nodeId: IDS.GOAL_2, deptId: dept.gieSurvey, action: "EXECUTION" },
      {
        nodeId: KPI.G2_K1,
        deptId: dept.gieMapping,
        action: "EXECUTION",
        userId: userMappingHead,
      },
      { nodeId: TASK.G2_K1_T1, deptId: dept.gieMapping, action: "EXECUTION" },
      { nodeId: TASK.G2_K1_T2, deptId: dept.gieData, action: "EXECUTION" },
      { nodeId: KPI.G2_K2, deptId: dept.gieSurvey, action: "EXECUTION" },
      {
        nodeId: TASK.G2_K2_T1,
        deptId: dept.gieSurvey,
        action: "EXECUTION",
        userId: userGeologySenior,
      },
      { nodeId: TASK.G2_K2_T2, deptId: dept.gieLab, action: "EXECUTION" },
      { nodeId: IDS.GOAL_3, deptId: dept.midiInvestment, action: "EXECUTION" },
      { nodeId: KPI.G3_K1, deptId: dept.midiInvestment, action: "EXECUTION" },
      {
        nodeId: TASK.G3_K1_T1,
        deptId: dept.midiInvestment,
        action: "EXECUTION",
        userId: userInvestmentCoordinator,
      },
      { nodeId: TASK.G3_K1_T2, deptId: dept.midiInvestment, action: "EXECUTION" },
      { nodeId: KPI.G3_K2, deptId: dept.midiLicensing, action: "EXECUTION" },
      {
        nodeId: TASK.G3_K2_T1,
        deptId: dept.midiLicensing,
        action: "EXECUTION",
        userId: userLicensingOfficer,
      },
      { nodeId: TASK.G3_K2_T2, deptId: dept.midiLicensing, action: "EXECUTION" },
      { nodeId: IDS.GOAL_4, deptId: dept.momEnv, action: "EXECUTION" },
      { nodeId: KPI.G4_K1, deptId: dept.momEnv, action: "EXECUTION" },
      { nodeId: TASK.G4_K1_T1, deptId: dept.momEnv, action: "EXECUTION" },
      { nodeId: TASK.G4_K1_T2, deptId: dept.momEnv, action: "APPROVAL" },
      { nodeId: KPI.G4_K2, deptId: dept.momHr, action: "EXECUTION" },
      { nodeId: TASK.G4_K2_T1, deptId: dept.momHr, action: "EXECUTION" },
      { nodeId: TASK.G4_K2_T2, deptId: dept.momPlanning, action: "APPROVAL" },
      { nodeId: IDS.GOAL_5, deptId: dept.momLicensing, action: "EXECUTION" },
      { nodeId: KPI.G5_K1, deptId: dept.momIct, action: "EXECUTION" },
      { nodeId: TASK.G5_K1_T1, deptId: dept.momPlanning, action: "EXECUTION" },
      { nodeId: KPI.G5_K2, deptId: dept.momMe, action: "MONITORING_REPORTING" },
      { nodeId: TASK.G5_K2_T1, deptId: dept.momMe, action: "MONITORING_REPORTING" },
    ];

    const internalAssignments = internalSpec.map(
      ({ nodeId, deptId, action, userId: assignedUserId }) => ({
        internal_assignment_id: uuidv4(),
        plan_node_id: nodeId,
        internal_structure_id: deptId,
        user_id: assignedUserId ?? null,
        action_id: actionMap[action],
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    );

    await queryInterface.bulkInsert("external_assignments", externalAssignments);
    await queryInterface.bulkInsert("internal_assignments", internalAssignments);

    const masterAssignmentPayload = {
      external: externalAssignments.map(({ created_at, updated_at, ...rest }) => rest),
      internal: internalAssignments.map(({ created_at, updated_at, ...rest }) => rest),
    };

    // ── Annual execution versions (all open for target setting until finalized) ──
    const annualVersions = [
      {
        plan_version_id: IDS.ANNUAL_2026,
        planning_year: 2026,
        sequence_index: 1,
        status: "draft",
        is_locked: false,
        draft_name: "National Mining Development Plan — Year 1 (2026)",
      },
      {
        plan_version_id: IDS.ANNUAL_2027,
        planning_year: 2027,
        sequence_index: 2,
        status: "draft",
        is_locked: false,
        draft_name: "National Mining Development Plan — Year 2 (2027)",
      },
      {
        plan_version_id: IDS.ANNUAL_2028,
        planning_year: 2028,
        sequence_index: 3,
        status: "draft",
        is_locked: false,
        draft_name: "National Mining Development Plan — Year 3 (2028)",
      },
    ];

    await queryInterface.bulkInsert(
      "plan_versions",
      annualVersions.map((annual) => ({
        plan_version_id: annual.plan_version_id,
        version_kind: "annual",
        parent_plan_version_id: IDS.MASTER,
        planning_year: annual.planning_year,
        sequence_index: annual.sequence_index,
        is_locked: annual.is_locked,
        finalized_at: null,
        draft_name: annual.draft_name,
        planning_start_date: `${annual.planning_year}-01-01`,
        planning_end_date: `${annual.planning_year}-12-31`,
        start_month: 1,
        end_month: 12,
        start_year: annual.planning_year,
        end_year: annual.planning_year,
        planning_duration_years: 1,
        year: annual.planning_year,
        version_number: annual.sequence_index,
        status: annual.status,
        government_structure_id: IDS.MOM_GOV,
        based_on_version_id: null,
        plan_rule_id: IDS.DEFAULT_PLAN_RULE,
        created_at: now,
        updated_at: now,
      }))
    );

    const masterNodePayload = masterNodes.map(
      ({ created_at, updated_at, ...rest }) => rest
    );

    for (const annual of annualVersions) {
      const annualTargetMap =
        annual.planning_year === 2026
          ? YEAR1_ANNUAL_TARGETS
          : annual.planning_year === 2027
            ? YEAR2_ANNUAL_TARGETS
            : {};

      const { annualNodes, nodeIdMap } = copyNodesToAnnual(
        masterNodePayload,
        annual.plan_version_id,
        annualTargetMap
      );

      await queryInterface.bulkInsert(
        "plan_nodes",
        annualNodes.map((n) => ({ ...n, created_at: now, updated_at: now }))
      );

      const { newExternal, newInternal } = copyAssignments(
        masterAssignmentPayload,
        nodeIdMap
      );

      if (newExternal.length > 0) {
        await queryInterface.bulkInsert(
          "external_assignments",
          newExternal.map((a) => ({ ...a, created_at: now, updated_at: now }))
        );
      }
      if (newInternal.length > 0) {
        await queryInterface.bulkInsert(
          "internal_assignments",
          newInternal.map((a) => ({ ...a, created_at: now, updated_at: now }))
        );
      }

      if (annual.planning_year === 2026) {
        const actionLogs = [
          {
            action_log_id: uuidv4(),
            plan_node_id: nodeIdMap.get(TASK.G1_K2_T1),
            action_id: actionMap.EXECUTION,
            user_id: userGeologySenior,
            comment: "Production tracking pilot deployed at three large-scale gold mines.",
            status: "approved",
            created_at: now,
          },
          {
            action_log_id: uuidv4(),
            plan_node_id: nodeIdMap.get(TASK.G3_K1_T1),
            action_id: actionMap.EXECUTION,
            user_id: userInvestmentCoordinator,
            comment: "Investment forum planning underway — venue and agenda confirmed.",
            status: "submitted",
            created_at: now,
          },
          {
            action_log_id: uuidv4(),
            plan_node_id: nodeIdMap.get(TASK.G2_K2_T1),
            action_id: actionMap.EXECUTION,
            user_id: userGeologySenior,
            comment: "Data validation SOP draft under review.",
            status: "pending",
            created_at: now,
          },
          {
            action_log_id: uuidv4(),
            plan_node_id: nodeIdMap.get(TASK.G3_K2_T1),
            action_id: actionMap.EXECUTION,
            user_id: userLicensingOfficer,
            comment: "Backlog reduction initiative — 18% cleared in Q1.",
            status: "submitted",
            created_at: now,
          },
        ];

        const tables = await queryInterface.showAllTables();
        const tableNames = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));
        if (tableNames.includes("plan_node_action_logs")) {
          const validLogs = actionLogs.filter((log) => log.plan_node_id);
          if (validLogs.length > 0) {
            await queryInterface.bulkInsert("plan_node_action_logs", validLogs);
          }
        }
      }
    }

    console.log("National Mining Development Plan — complete demo seeded successfully.");
    console.log("");
    console.log("  PLANNING CONFIGURATION");
    console.log("    Breakdown mode: Quarterly (Q1, Q2, Q3, Q4)");
    console.log("");
    console.log("  STRATEGIC DRAFT (master, finalized)");
    console.log("    Period: 2026–2028 (3 years)");
    console.log("    Hierarchy: 1 strategic → 5 goals → KPIs → tasks");
    console.log("    Draft targets: Gold 300t, Investment 1500M ETB, Licensing 50%, etc.");
    console.log("    Shared assignment: National Mineral Production → MIDI + GIE");
    console.log("    Exclusive assignment: Licensing Service Improvement → Licensing only");
    console.log("");
    console.log("  ANNUAL VERSIONS");
    console.log("    2026 / 2027 / 2028 — open for annual target setting");
    console.log("    Execution periods: initialize from the UI after annual execution is finalized");
    console.log("");
    console.log("  TARGET CASCADE");
    console.log("    Draft → Annual: sum across years ≤ draft target");
    console.log("    Annual → Period: sum across quarters ≤ annual target");
  },

  async down(queryInterface) {
    await removeExistingDemo(queryInterface);
    console.log("National Mining Development Plan demo data removed.");
  },
};
