"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("../models");
const regionalPlanService = require("../services/regionalPlanService");
const { Region, User, RegionalPlanRule, RegionalPlanningConfiguration } = require("../models");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function cleanupTestRegions() {
  await sequelize.query(`
    DELETE FROM public.regional_plan_nodes WHERE regional_plan_version_id IN (
      SELECT regional_plan_version_id FROM public.regional_plan_versions WHERE region_id IN (
        SELECT region_id FROM public.regions WHERE name LIKE 'Replication Test Region%'
      )
    )
  `);
  await sequelize.query(`
    DELETE FROM public.regional_plan_versions WHERE region_id IN (
      SELECT region_id FROM public.regions WHERE name LIKE 'Replication Test Region%'
    )
  `);
  await sequelize.query(`
    DELETE FROM public.regional_plan_rule_steps WHERE regional_plan_rule_id IN (
      SELECT regional_plan_rule_id FROM public.regional_plan_rules WHERE region_id IN (
        SELECT region_id FROM public.regions WHERE name LIKE 'Replication Test Region%'
      )
    )
  `);
  await sequelize.query(`
    DELETE FROM public.regional_plan_rules WHERE region_id IN (
      SELECT region_id FROM public.regions WHERE name LIKE 'Replication Test Region%'
    )
  `);
  await sequelize.query(`
    DELETE FROM public.regional_planning_configurations WHERE region_id IN (
      SELECT region_id FROM public.regions WHERE name LIKE 'Replication Test Region%'
    )
  `);
  await sequelize.query(`
    DELETE FROM public.users WHERE region_id IN (
      SELECT region_id FROM public.regions WHERE name LIKE 'Replication Test Region%'
    )
  `);
  await sequelize.query(`DELETE FROM public.regions WHERE name LIKE 'Replication Test Region%'`);
}

async function run() {
  console.log("\n========================================================");
  console.log("  REGIONAL PLAN RULES & CONFIG REPLICATION VERIFICATION");
  console.log("========================================================\n");

  const ts = Date.now();
  const region1Id = uuidv4();
  const region2Id = uuidv4();
  const user1Id = uuidv4();
  const user2Id = uuidv4();

  try {
    // 0. Cleanup any previous test data
    await cleanupTestRegions();

    // 1. Setup 2 Independent Regions and Users
    console.log("[1] Setting up 2 Independent Test Regions and Users...");
    await Region.bulkCreate([
      {
        region_id: region1Id,
        name: `Replication Test Region 1 ${ts}`,
        code: `RTR1_${ts}`,
        status: "active",
      },
      {
        region_id: region2Id,
        name: `Replication Test Region 2 ${ts}`,
        code: `RTR2_${ts}`,
        status: "active",
      },
    ]);

    await User.bulkCreate([
      {
        user_id: user1Id,
        email: `officer1_${ts}@rtr1.gov.et`,
        full_name: "Officer Region 1",
        password: "HashedPasswordPlaceholder123!",
        region_id: region1Id,
        is_active: true,
      },
      {
        user_id: user2Id,
        email: `officer2_${ts}@rtr2.gov.et`,
        full_name: "Officer Region 2",
        password: "HashedPasswordPlaceholder123!",
        region_id: region2Id,
        is_active: true,
      },
    ]);

    assert(true, "Independent test regions and officers initialized");

    // 2. Test 1: Region 1 configured with 5-Level Hierarchy
    console.log("\n[2] Testing Region 1 with 5-Level Hierarchy...");
    const rule1 = await regionalPlanService.createRegionalPlanRule(region1Id, {
      name: "Region 1 Five-Level Rule",
      is_active: true,
      performance_scoring_policy: "CAP_100",
      steps: [
        { step_order: 1, label: "Pillar", color_hex: "#7C3AED", requires_weight: false, requires_contribution_weight: false },
        { step_order: 2, label: "Strategic Goal", color_hex: "#2563EB", requires_weight: false, requires_contribution_weight: false },
        { step_order: 3, label: "Objective", color_hex: "#059669", requires_weight: false, requires_contribution_weight: false },
        { step_order: 4, label: "Key Performance Indicator", color_hex: "#D97706", requires_weight: true, requires_contribution_weight: false },
        { step_order: 5, label: "Operational Initiative", color_hex: "#DB2777", requires_weight: true, requires_contribution_weight: true },
      ],
    });

    assert(rule1 && rule1.steps.length === 5, "Region 1 rule created with exactly 5 dynamic hierarchy steps");

    // Create Draft in Region 1 using rule1
    const draft1 = await regionalPlanService.createRegionalPlanDraft(region1Id, {
      draft_name: "Region 1 5-Year Strategy",
      start_year: 2026,
      end_year: 2030,
      planning_duration_years: 5,
      regional_plan_rule_id: rule1.regional_plan_rule_id,
      created_by_user_id: user1Id,
    });

    assert(draft1 && draft1.status === "draft", "Region 1 plan draft created");

    // Build hierarchy in Region 1 down to Level 5
    const node1 = await regionalPlanService.createRegionalPlanNode(draft1.regional_plan_version_id, region1Id, {
      title: "Level 1 Pillar",
      weight: 0,
      contribution_weight: 0,
    });
    assert(node1 && node1.level === 1, "Level 1 node created successfully");

    const node2 = await regionalPlanService.createRegionalPlanNode(draft1.regional_plan_version_id, region1Id, {
      parent_id: node1.regional_plan_node_id,
      title: "Level 2 Goal",
      weight: 0,
      contribution_weight: 0,
    });
    assert(node2 && node2.level === 2, "Level 2 node created successfully");

    const node3 = await regionalPlanService.createRegionalPlanNode(draft1.regional_plan_version_id, region1Id, {
      parent_id: node2.regional_plan_node_id,
      title: "Level 3 Objective",
      weight: 0,
      contribution_weight: 0,
    });
    assert(node3 && node3.level === 3, "Level 3 node created successfully");

    const node4 = await regionalPlanService.createRegionalPlanNode(draft1.regional_plan_version_id, region1Id, {
      parent_id: node3.regional_plan_node_id,
      title: "Level 4 KPI",
      weight: 100,
      weight_mode: "number",
      contribution_weight: 0,
      target_unit: "Ton",
    });
    assert(node4 && node4.level === 4, "Level 4 node created successfully");

    const node5 = await regionalPlanService.createRegionalPlanNode(draft1.regional_plan_version_id, region1Id, {
      parent_id: node4.regional_plan_node_id,
      title: "Level 5 Initiative",
      weight: 100,
      contribution_weight: 100,
      target_unit: "Ton",
    });
    assert(node5 && node5.level === 5, "Level 5 node created successfully");

    // Attempt to create Level 6 node -> MUST BE REJECTED
    let level6Rejected = false;
    try {
      await regionalPlanService.createRegionalPlanNode(draft1.regional_plan_version_id, region1Id, {
        parent_id: node5.regional_plan_node_id,
        title: "Level 6 Sub-Initiative",
        weight: 100,
        contribution_weight: 100,
      });
    } catch (err) {
      level6Rejected = true;
      assert(err.message.includes("Maximum plan depth is 5 levels"), `Level 6 correctly rejected: "${err.message}"`);
    }
    assert(level6Rejected, "Region 1 strictly enforces dynamic maxDepth of 5");

    // 3. Test 2: Region 2 configured with 3-Level Hierarchy
    console.log("\n[3] Testing Region 2 with 3-Level Hierarchy...");
    const rule2 = await regionalPlanService.createRegionalPlanRule(region2Id, {
      name: "Region 2 Lean Three-Level Rule",
      is_active: true,
      performance_scoring_policy: "ALLOW_OVER_ACHIEVEMENT",
      steps: [
        { step_order: 1, label: "Strategic Priority", color_hex: "#7C3AED", requires_weight: false, requires_contribution_weight: false },
        { step_order: 2, label: "Program", color_hex: "#2563EB", requires_weight: false, requires_contribution_weight: false },
        { step_order: 3, label: "Target KPI", color_hex: "#059669", requires_weight: true, requires_contribution_weight: true },
      ],
    });

    assert(rule2 && rule2.steps.length === 3, "Region 2 rule created with exactly 3 dynamic hierarchy steps");

    const draft2 = await regionalPlanService.createRegionalPlanDraft(region2Id, {
      draft_name: "Region 2 3-Year Strategy",
      start_year: 2026,
      end_year: 2028,
      planning_duration_years: 3,
      regional_plan_rule_id: rule2.regional_plan_rule_id,
      created_by_user_id: user2Id,
    });

    const r2_node1 = await regionalPlanService.createRegionalPlanNode(draft2.regional_plan_version_id, region2Id, {
      title: "R2 Level 1 Priority",
      weight: 0,
      contribution_weight: 0,
    });
    assert(r2_node1 && r2_node1.level === 1, "Region 2 Level 1 node created");

    const r2_node2 = await regionalPlanService.createRegionalPlanNode(draft2.regional_plan_version_id, region2Id, {
      parent_id: r2_node1.regional_plan_node_id,
      title: "R2 Level 2 Program",
      weight: 0,
      contribution_weight: 0,
    });
    assert(r2_node2 && r2_node2.level === 2, "Region 2 Level 2 node created");

    const r2_node3 = await regionalPlanService.createRegionalPlanNode(draft2.regional_plan_version_id, region2Id, {
      parent_id: r2_node2.regional_plan_node_id,
      title: "R2 Level 3 KPI",
      weight: 100,
      weight_mode: "number",
      contribution_weight: 100,
      target_unit: "Unit",
    });
    assert(r2_node3 && r2_node3.level === 3, "Region 2 Level 3 node created");

    // Attempt to create Level 4 in Region 2 -> MUST BE REJECTED (proves depth is NOT hardcoded to 4!)
    let r2_level4Rejected = false;
    try {
      await regionalPlanService.createRegionalPlanNode(draft2.regional_plan_version_id, region2Id, {
        parent_id: r2_node3.regional_plan_node_id,
        title: "R2 Level 4 Task",
        weight: 100,
        contribution_weight: 100,
      });
    } catch (err) {
      r2_level4Rejected = true;
      assert(err.message.includes("Maximum plan depth is 3 levels"), `Region 2 level 4 correctly rejected: "${err.message}"`);
    }
    assert(r2_level4Rejected, "Region 2 strictly enforces dynamic maxDepth of 3 (not artificially capped at 4)");

    // 4. Test 3: Region 1 selects Custom Annual Division (Trimesters)
    console.log("\n[4] Testing Custom Annual Division in Region 1 (3 Trimesters)...");
    // Finalize draft1
    const finalizedPlan1 = await regionalPlanService.finalizeRegionalPlanDraft(draft1.regional_plan_version_id, region1Id);
    assert(finalizedPlan1 && finalizedPlan1.status === "finalized", "Region 1 master draft finalized");

    // Finalize annual targets so execution periods can be initialized
    await regionalPlanService.finalizeRegionalAnnualExecution(draft1.regional_plan_version_id, region1Id, user1Id);

    // Initialize execution periods with Custom mode and custom period labels
    const customPeriods = [
      { label: "Trimester 1", start_month: 1, end_month: 4 },
      { label: "Trimester 2", start_month: 5, end_month: 8 },
      { label: "Trimester 3", start_month: 9, end_month: 12 },
    ];

    const trimesterPeriods = await regionalPlanService.initializeRegionalExecutionPeriods(
      draft1.regional_plan_version_id,
      region1Id,
      "custom",
      customPeriods
    );

    // 5 years x 3 trimesters = 15 period versions
    assert(
      trimesterPeriods.length === 15,
      `Region 1 initialized with 15 trimester execution period versions (got ${trimesterPeriods.length})`
    );

    const year1Trimesters = trimesterPeriods.filter((p) => p.planning_year === 2026);
    assert(year1Trimesters.length === 3, `Year 2026 has exactly 3 trimesters`);
    assert(year1Trimesters[0].period_label === "Trimester 1", `Trimester 1 labeled correctly (got "${year1Trimesters[0].period_label}")`);
    assert(year1Trimesters[1].period_label === "Trimester 2", `Trimester 2 labeled correctly (got "${year1Trimesters[1].period_label}")`);
    assert(year1Trimesters[2].period_label === "Trimester 3", `Trimester 3 labeled correctly (got "${year1Trimesters[2].period_label}")`);

    // 5. Test 4: Region 2 selects Monthly Division (12 Months)
    console.log("\n[5] Testing Monthly Division in Region 2 (12 Months per Year)...");
    const finalizedPlan2 = await regionalPlanService.finalizeRegionalPlanDraft(draft2.regional_plan_version_id, region2Id);
    assert(finalizedPlan2 && finalizedPlan2.status === "finalized", "Region 2 master draft finalized");

    // Finalize annual targets so execution periods can be initialized
    await regionalPlanService.finalizeRegionalAnnualExecution(draft2.regional_plan_version_id, region2Id, user2Id);

    const monthlyPeriods = await regionalPlanService.initializeRegionalExecutionPeriods(
      draft2.regional_plan_version_id,
      region2Id,
      "monthly"
    );

    // 3 years x 12 months = 36 period versions
    assert(
      monthlyPeriods.length === 36,
      `Region 2 initialized with 36 monthly execution periods (got ${monthlyPeriods.length})`
    );

    const r2_year1Months = monthlyPeriods.filter((p) => p.planning_year === 2026);
    assert(r2_year1Months.length === 12, `Year 2026 in Region 2 has exactly 12 monthly periods`);
    assert(r2_year1Months[0].period_label === "Jan", `Month 1 labeled correctly (got "${r2_year1Months[0].period_label}")`);
    assert(r2_year1Months[11].period_label === "Dec", `Month 12 labeled correctly (got "${r2_year1Months[11].period_label}")`);

    // 6. Test 5: Draft Snapshot Isolation & Mutation Independence
    console.log("\n[6] Testing Draft-Level Snapshot Mutation and Isolation...");
    // Create new draft in Region 1 to test draft-level rule & config mutation
    const draft3 = await regionalPlanService.createRegionalPlanDraft(region1Id, {
      draft_name: "Region 1 Isolated Snapshot Draft",
      start_year: 2027,
      end_year: 2031,
      regional_plan_rule_id: rule1.regional_plan_rule_id,
      created_by_user_id: user1Id,
    });

    // Check draft's rule snapshot
    const draft3RuleSnapshot = await regionalPlanService.getRegionalPlanRuleForVersion(
      draft3.regional_plan_version_id,
      region1Id
    );
    assert(
      draft3RuleSnapshot && draft3RuleSnapshot.owned_by_plan_version_id === draft3.regional_plan_version_id,
      "Draft 3 has version-owned snapshot of regional plan rule"
    );

    // Mutate draft 3's rule snapshot
    const updatedDraftRule = await regionalPlanService.updateRegionalPlanRuleForVersion(
      draft3.regional_plan_version_id,
      region1Id,
      {
        name: "Modified Snapshot Rule Exclusive To Draft 3",
        performance_scoring_policy: "ALLOW_OVER_ACHIEVEMENT",
      }
    );
    assert(
      updatedDraftRule.name === "Modified Snapshot Rule Exclusive To Draft 3",
      "Draft 3 rule snapshot updated successfully"
    );

    // Verify Region 1 master rule remains unchanged
    const masterRule1 = await RegionalPlanRule.findByPk(rule1.regional_plan_rule_id);
    assert(
      masterRule1.name === "Region 1 Five-Level Rule",
      `Region 1 template rule unaffected by draft snapshot mutation: "${masterRule1.name}"`
    );
    assert(
      masterRule1.performance_scoring_policy === "CAP_100",
      "Region 1 template rule scoring policy remains CAP_100"
    );

    // Check draft's config snapshot
    const draft3ConfigSnapshot = await regionalPlanService.getRegionalPlanningConfigForVersion(
      draft3.regional_plan_version_id,
      region1Id
    );
    assert(
      draft3ConfigSnapshot && draft3ConfigSnapshot.owned_by_plan_version_id === draft3.regional_plan_version_id,
      "Draft 3 has version-owned snapshot of regional planning configuration"
    );

    // Mutate draft 3's config snapshot
    const updatedDraftConfig = await regionalPlanService.updateRegionalPlanningConfigForVersion(
      draft3.regional_plan_version_id,
      region1Id,
      {
        draft_entity_label_singular: "Localized Strategic Blueprint",
        breakdown_mode: "semi_annual",
      }
    );
    assert(
      updatedDraftConfig.draft_entity_label_singular === "Localized Strategic Blueprint",
      "Draft 3 config snapshot updated successfully"
    );

    // Verify master config for Region 1 remains unchanged
    const masterConfig1 = await RegionalPlanningConfiguration.findOne({
      where: { region_id: region1Id, owned_by_plan_version_id: null },
    });
    assert(
      masterConfig1.draft_entity_label_singular === "Plan Draft",
      `Region 1 master config unaffected: "${masterConfig1.draft_entity_label_singular}"`
    );

    // 7. Test 6: Cross-Region Authorization & Strict Isolation
    console.log("\n[7] Testing Cross-Region Isolation and Access Control...");
    // Region 1 user tries to read Region 2 draft's rule snapshot -> MUST BE REJECTED
    let crossRegionRuleReadRejected = false;
    try {
      await regionalPlanService.getRegionalPlanRuleForVersion(
        draft2.regional_plan_version_id,
        region1Id // Passed region 1 instead of region 2!
      );
    } catch (err) {
      crossRegionRuleReadRejected = true;
      assert(err.message.includes("not found") || err.message.includes("region"), `Cross-region rule read rejected: "${err.message}"`);
    }
    assert(crossRegionRuleReadRejected, "Cross-region plan rule access strictly prohibited");

    // Region 1 user tries to mutate Region 2 draft's config snapshot -> MUST BE REJECTED
    let crossRegionConfigMutateRejected = false;
    try {
      await regionalPlanService.updateRegionalPlanningConfigForVersion(
        draft2.regional_plan_version_id,
        region1Id, // Passed region 1 instead of region 2!
        { draft_entity_label_singular: "Hacked Blueprint" }
      );
    } catch (err) {
      crossRegionConfigMutateRejected = true;
      assert(err.message.includes("not found") || err.message.includes("region"), `Cross-region config mutation rejected: "${err.message}"`);
    }
    assert(crossRegionConfigMutateRejected, "Cross-region planning config mutation strictly prohibited");

    // Region 1 user tries to add a node to Region 2's plan -> MUST BE REJECTED
    let crossRegionNodeCreateRejected = false;
    try {
      await regionalPlanService.createRegionalPlanNode(
        draft2.regional_plan_version_id,
        region1Id, // Wrong region
        { title: "Intruder Node", weight: 0, contribution_weight: 100 }
      );
    } catch (err) {
      crossRegionNodeCreateRejected = true;
      assert(err.message.includes("not found") || err.message.includes("region"), `Cross-region node creation rejected: "${err.message}"`);
    }
    assert(crossRegionNodeCreateRejected, "Cross-region node creation strictly prohibited");

    // 8. Cleanup
    console.log("\n[8] Cleaning up test data...");
    await cleanupTestRegions();
    assert(true, "Test data cleaned up successfully");

  } catch (error) {
    console.error("Test execution aborted with unhandled error:", error);
    failed++;
  } finally {
    console.log("\n========================================================");
    console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("========================================================\n");
    await sequelize.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
