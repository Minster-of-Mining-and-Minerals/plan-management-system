"use strict";

const { v4: uuidv4 } = require("uuid");

/** Fixed IDs for idempotent re-runs */
const IDS = {
  MOM_GOV: "10000000-0000-4000-8000-000000000001",
  EGS_GOV: "10000000-0000-4000-8000-000000000002",
  PLAN_VERSION: "20000000-0000-4000-8000-000000000001",
  DEPT_POLICY: "30000000-0000-4000-8000-000000000001",
  DEPT_LICENSING: "30000000-0000-4000-8000-000000000002",
  DEPT_GEOLOGY: "30000000-0000-4000-8000-000000000003",
  DEPT_SAFETY: "30000000-0000-4000-8000-000000000004",
  DEPT_HR: "30000000-0000-4000-8000-000000000005",
  STRATEGIC: "40000000-0000-4000-8000-000000000001",
  GOAL_1: "40000000-0000-4000-8000-000000000011",
  GOAL_2: "40000000-0000-4000-8000-000000000012",
  GOAL_3: "40000000-0000-4000-8000-000000000013",
  GOAL_4: "40000000-0000-4000-8000-000000000014",
};

const KPI_IDS = {
  G1_K1: "41000000-0000-4000-8000-000000000111",
  G1_K2: "41000000-0000-4000-8000-000000000112",
  G2_K1: "41000000-0000-4000-8000-000000000121",
  G2_K2: "41000000-0000-4000-8000-000000000122",
  G3_K1: "41000000-0000-4000-8000-000000000131",
  G3_K2: "41000000-0000-4000-8000-000000000132",
  G4_K1: "41000000-0000-4000-8000-000000000141",
  G4_K2: "41000000-0000-4000-8000-000000000142",
};

const TASK_IDS = [
  "50000000-0000-4000-8000-000000000001",
  "50000000-0000-4000-8000-000000000002",
  "50000000-0000-4000-8000-000000000003",
  "50000000-0000-4000-8000-000000000004",
  "50000000-0000-4000-8000-000000000005",
  "50000000-0000-4000-8000-000000000006",
  "50000000-0000-4000-8000-000000000007",
  "50000000-0000-4000-8000-000000000008",
  "50000000-0000-4000-8000-000000000009",
  "50000000-0000-4000-8000-000000000010",
  "50000000-0000-4000-8000-000000000011",
  "50000000-0000-4000-8000-000000000012",
  "50000000-0000-4000-8000-000000000013",
  "50000000-0000-4000-8000-000000000014",
  "50000000-0000-4000-8000-000000000015",
  "50000000-0000-4000-8000-000000000016",
];

function node(id, planVersionId, parentId, type, title, description, weight, level, order) {
  return {
    plan_node_id: id,
    plan_version_id: planVersionId,
    parent_id: parentId,
    type,
    title,
    description,
    weight,
    level,
    order,
    is_active: true,
  };
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const existing = await queryInterface.sequelize.query(
      `SELECT plan_version_id FROM plan_versions WHERE plan_version_id = :id LIMIT 1`,
      {
        replacements: { id: IDS.PLAN_VERSION },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existing.length > 0) {
      console.log("MoM demo plan already seeded — skipping.");
      return;
    }

    // ── Government structures ──────────────────────────────────────────
    await queryInterface.bulkInsert("government_structures", [
      {
        government_structure_id: IDS.MOM_GOV,
        parent_id: null,
        name: "Ministry of Mines",
        level: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        government_structure_id: IDS.EGS_GOV,
        parent_id: IDS.MOM_GOV,
        name: "Ethiopian Geological Survey",
        level: 2,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    // ── Departments (internal structures) ──────────────────────────────
    await queryInterface.bulkInsert("internal_structures", [
      {
        internal_structure_id: IDS.DEPT_POLICY,
        government_structure_id: IDS.MOM_GOV,
        parent_id: null,
        name: "Policy & Strategic Planning Directorate",
        level: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        internal_structure_id: IDS.DEPT_LICENSING,
        government_structure_id: IDS.MOM_GOV,
        parent_id: null,
        name: "Mineral Licensing & Administration Directorate",
        level: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        internal_structure_id: IDS.DEPT_GEOLOGY,
        government_structure_id: IDS.MOM_GOV,
        parent_id: null,
        name: "Geological Survey & Data Management Division",
        level: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        internal_structure_id: IDS.DEPT_SAFETY,
        government_structure_id: IDS.MOM_GOV,
        parent_id: null,
        name: "Mine Safety & Environmental Compliance Directorate",
        level: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        internal_structure_id: IDS.DEPT_HR,
        government_structure_id: IDS.MOM_GOV,
        parent_id: null,
        name: "Human Resource & Capacity Building Directorate",
        level: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    // ── Plan version ───────────────────────────────────────────────────
    await queryInterface.bulkInsert("plan_versions", [
      {
        plan_version_id: IDS.PLAN_VERSION,
        year: 2026,
        version_number: 1,
        status: "active",
        government_structure_id: IDS.MOM_GOV,
        based_on_version_id: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    const pv = IDS.PLAN_VERSION;
    const nodes = [
      // Strategic root
      node(
        IDS.STRATEGIC,
        pv,
        null,
        "strategic",
        "Ministry of Mines Strategic Plan 2026",
        "Annual strategic plan to strengthen mineral governance, expand geological knowledge, ensure safe and sustainable mining, and build institutional capacity across the Ministry of Mines.",
        0,
        1,
        1
      ),

      // Goal 1 — Licensing & governance
      node(
        IDS.GOAL_1,
        pv,
        IDS.STRATEGIC,
        "goal",
        "Strengthen Mineral Governance & Licensing",
        "Modernize licensing processes, improve transparency, and reduce processing times for exploration and mining licenses nationwide.",
        25,
        2,
        1
      ),
      node(
        KPI_IDS.G1_K1,
        pv,
        IDS.GOAL_1,
        "kpi",
        "Reduce average license processing time to 45 days",
        "Measured from complete application submission to issuance for exploration and small-scale mining licenses.",
        50,
        3,
        1
      ),
      node(
        TASK_IDS[0],
        pv,
        KPI_IDS.G1_K1,
        "task",
        "Deploy digital mineral licensing portal",
        "Launch an online portal for application submission, fee payment, and status tracking integrated with regional offices.",
        40,
        4,
        1
      ),
      node(
        TASK_IDS[1],
        pv,
        KPI_IDS.G1_K1,
        "task",
        "Train regional licensing officers on new procedures",
        "Conduct training workshops in Oromia, Amhara, Tigray, and SNNPR regional offices.",
        35,
        4,
        2
      ),
      node(
        TASK_IDS[2],
        pv,
        KPI_IDS.G1_K1,
        "task",
        "Publish quarterly licensing performance dashboard",
        "Public dashboard showing average processing times, backlog, and approval rates by license type.",
        25,
        4,
        3
      ),
      node(
        KPI_IDS.G1_K2,
        pv,
        IDS.GOAL_1,
        "kpi",
        "Increase active exploration licenses by 15%",
        "Year-over-year growth in valid exploration licenses issued across priority mineral belts.",
        50,
        3,
        2
      ),
      node(
        TASK_IDS[3],
        pv,
        KPI_IDS.G1_K2,
        "task",
        "Publish 2026 exploration block tender calendar",
        "Announce tender schedule for gold, potash, and industrial mineral blocks in Benishangul-Gumuz and Afar.",
        50,
        4,
        1
      ),
      node(
        TASK_IDS[4],
        pv,
        KPI_IDS.G1_K2,
        "task",
        "Conduct investor roadshow for exploration opportunities",
        "Organize domestic and international roadshows in Addis Ababa and Dubai mining week.",
        50,
        4,
        2
      ),

      // Goal 2 — Geological data
      node(
        IDS.GOAL_2,
        pv,
        IDS.STRATEGIC,
        "goal",
        "Expand Geological Knowledge & Exploration Data",
        "Accelerate geological surveys, digitize legacy data, and make geoscience information accessible to investors and researchers.",
        25,
        2,
        2
      ),
      node(
        KPI_IDS.G2_K1,
        pv,
        IDS.GOAL_2,
        "kpi",
        "Complete geophysical surveys in 3 priority belts",
        "Surveys in the Arabian-Nubian Shield (north), Adola gold belt, and Danakil potash basin.",
        55,
        3,
        1
      ),
      node(
        TASK_IDS[5],
        pv,
        KPI_IDS.G2_K1,
        "task",
        "Procure and deploy additional magnetotelluric survey equipment",
        "Acquire MT systems and train EGS field teams for deep crustal imaging.",
        45,
        4,
        1
      ),
      node(
        TASK_IDS[6],
        pv,
        KPI_IDS.G2_K1,
        "task",
        "Execute airborne magnetic surveys over 5,000 km²",
        "Contract airborne geophysical survey covering Adola and Konso gold corridors.",
        55,
        4,
        2
      ),
      node(
        KPI_IDS.G2_K2,
        pv,
        IDS.GOAL_2,
        "kpi",
        "Digitize 80% of legacy geological maps and reports",
        "Scan and catalogue historical maps, borehole logs, and survey reports into the national geodata repository.",
        45,
        3,
        2
      ),
      node(
        TASK_IDS[7],
        pv,
        KPI_IDS.G2_K2,
        "task",
        "Establish national geodata portal with open-access layers",
        "Web portal with downloadable geological maps, geochemistry datasets, and metadata catalogue.",
        55,
        4,
        1
      ),
      node(
        TASK_IDS[8],
        pv,
        KPI_IDS.G2_K2,
        "task",
        "Digitize 10,000 legacy borehole records",
        "OCR and georeference historical drill logs from the EGS archives in Addis Ababa.",
        45,
        4,
        2
      ),

      // Goal 3 — Safety & environment
      node(
        IDS.GOAL_3,
        pv,
        IDS.STRATEGIC,
        "goal",
        "Ensure Mine Safety & Environmental Stewardship",
        "Strengthen inspection capacity, enforce environmental standards, and reduce mine-related incidents.",
        25,
        2,
        3
      ),
      node(
        KPI_IDS.G3_K1,
        pv,
        IDS.GOAL_3,
        "kpi",
        "Inspect 100% of active large-scale mining operations",
        "Complete at least one comprehensive safety and environmental inspection per licensed large-scale mine per year.",
        60,
        3,
        1
      ),
      node(
        TASK_IDS[9],
        pv,
        KPI_IDS.G3_K1,
        "task",
        "Deploy quarterly field inspection teams to all large-scale mines",
        "Schedule and execute Q1–Q4 inspection visits with standardized checklists.",
        50,
        4,
        1
      ),
      node(
        TASK_IDS[10],
        pv,
        KPI_IDS.G3_K1,
        "task",
        "Issue corrective action notices for non-compliant operations",
        "Document findings and track remediation timelines for tailings, dust, and water management violations.",
        50,
        4,
        2
      ),
      node(
        KPI_IDS.G3_K2,
        pv,
        IDS.GOAL_3,
        "kpi",
        "Reduce reportable mine incidents by 20%",
        "Year-over-year reduction in lost-time injuries and environmental spill incidents at licensed operations.",
        40,
        3,
        2
      ),
      node(
        TASK_IDS[11],
        pv,
        KPI_IDS.G3_K2,
        "task",
        "Roll out mine safety training program for artisanal miners",
        "Partner with regional bureaus to train 2,000 artisanal miners on safe extraction practices.",
        50,
        4,
        1
      ),
      node(
        TASK_IDS[12],
        pv,
        KPI_IDS.G3_K2,
        "task",
        "Update mine closure and rehabilitation guidelines",
        "Revise guidelines aligned with IFC Performance Standards and national environmental proclamation.",
        50,
        4,
        2
      ),

      // Goal 4 — Capacity building
      node(
        IDS.GOAL_4,
        pv,
        IDS.STRATEGIC,
        "goal",
        "Build Human Capital & Institutional Capacity",
        "Develop skilled workforce, strengthen inter-agency coordination, and improve ministry operational effectiveness.",
        25,
        2,
        4
      ),
      node(
        KPI_IDS.G4_K1,
        pv,
        IDS.GOAL_4,
        "kpi",
        "Train 200 ministry staff on digital systems and mineral policy",
        "Structured training on licensing portal, geodata systems, and updated mining proclamation.",
        50,
        3,
        1
      ),
      node(
        TASK_IDS[13],
        pv,
        KPI_IDS.G4_K1,
        "task",
        "Deliver mineral policy and governance training program",
        "Six-module program covering licensing law, ESG standards, and revenue management.",
        55,
        4,
        1
      ),
      node(
        TASK_IDS[14],
        pv,
        KPI_IDS.G4_K1,
        "task",
        "Onboard all directorate staff on plan management system",
        "Hands-on training for directors and focal points on plan tracking and reporting workflows.",
        45,
        4,
        2
      ),
      node(
        KPI_IDS.G4_K2,
        pv,
        IDS.GOAL_4,
        "kpi",
        "Establish inter-agency coordination forum with 4 key partners",
        "Quarterly forum with Ministry of Finance, EPA, Ethiopian Customs Commission, and regional bureaus.",
        50,
        3,
        2
      ),
      node(
        TASK_IDS[15],
        pv,
        KPI_IDS.G4_K2,
        "task",
        "Convene first inter-agency mining sector coordination meeting",
        "Inaugural meeting to align on revenue collection, environmental enforcement, and export monitoring.",
        100,
        4,
        1
      ),
    ].map((n) => ({ ...n, created_at: now, updated_at: now }));

    await queryInterface.bulkInsert("plan_nodes", nodes);

    // ── Assignment actions (lookup by code) ────────────────────────────
    const actions = await queryInterface.sequelize.query(
      `SELECT assignment_action_id, code FROM plan_assignment_actions WHERE code IN ('EXECUTION', 'MONITORING_REPORTING', 'APPROVAL')`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const actionMap = Object.fromEntries(actions.map((a) => [a.code, a.assignment_action_id]));

    if (!actionMap.EXECUTION) {
      console.warn("Plan assignment actions not found — skipping internal assignments.");
      return;
    }

    const taskAssignments = [
      { taskId: TASK_IDS[0], deptId: IDS.DEPT_LICENSING, action: "EXECUTION" },
      { taskId: TASK_IDS[1], deptId: IDS.DEPT_LICENSING, action: "EXECUTION" },
      { taskId: TASK_IDS[2], deptId: IDS.DEPT_POLICY, action: "MONITORING_REPORTING" },
      { taskId: TASK_IDS[3], deptId: IDS.DEPT_LICENSING, action: "EXECUTION" },
      { taskId: TASK_IDS[5], deptId: IDS.DEPT_GEOLOGY, action: "EXECUTION" },
      { taskId: TASK_IDS[6], deptId: IDS.DEPT_GEOLOGY, action: "EXECUTION" },
      { taskId: TASK_IDS[7], deptId: IDS.DEPT_GEOLOGY, action: "EXECUTION" },
      { taskId: TASK_IDS[9], deptId: IDS.DEPT_SAFETY, action: "EXECUTION" },
      { taskId: TASK_IDS[10], deptId: IDS.DEPT_SAFETY, action: "APPROVAL" },
      { taskId: TASK_IDS[11], deptId: IDS.DEPT_SAFETY, action: "EXECUTION" },
      { taskId: TASK_IDS[13], deptId: IDS.DEPT_HR, action: "EXECUTION" },
      { taskId: TASK_IDS[14], deptId: IDS.DEPT_HR, action: "EXECUTION" },
      { taskId: TASK_IDS[15], deptId: IDS.DEPT_POLICY, action: "EXECUTION" },
    ];

    const internalAssignments = taskAssignments.map(({ taskId, deptId, action }) => ({
      internal_assignment_id: uuidv4(),
      plan_node_id: taskId,
      internal_structure_id: deptId,
      user_id: null,
      action_id: actionMap[action],
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("internal_assignments", internalAssignments);

    // ── External assignment: EGS supports geological KPI ───────────────
    await queryInterface.bulkInsert("external_assignments", [
      {
        external_assignment_id: uuidv4(),
        plan_node_id: KPI_IDS.G2_K1,
        government_structure_id: IDS.EGS_GOV,
        is_visible: true,
        requires_report: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    console.log("Ministry of Mines demo plan seeded successfully.");
  },

  async down(queryInterface) {
    const pv = IDS.PLAN_VERSION;

    await queryInterface.bulkDelete("external_assignments", {
      plan_node_id: KPI_IDS.G2_K1,
    });

    const allNodeIds = [
      IDS.STRATEGIC,
      IDS.GOAL_1,
      IDS.GOAL_2,
      IDS.GOAL_3,
      IDS.GOAL_4,
      ...Object.values(KPI_IDS),
      ...TASK_IDS,
    ];

    await queryInterface.bulkDelete("internal_assignments", {
      plan_node_id: allNodeIds,
    });

    await queryInterface.bulkDelete("plan_nodes", {
      plan_version_id: pv,
    });

    await queryInterface.bulkDelete("plan_versions", {
      plan_version_id: pv,
    });

    await queryInterface.bulkDelete("internal_structures", {
      internal_structure_id: [
        IDS.DEPT_POLICY,
        IDS.DEPT_LICENSING,
        IDS.DEPT_GEOLOGY,
        IDS.DEPT_SAFETY,
        IDS.DEPT_HR,
      ],
    });

    await queryInterface.bulkDelete("government_structures", {
      government_structure_id: [IDS.MOM_GOV, IDS.EGS_GOV],
    });
  },
};
