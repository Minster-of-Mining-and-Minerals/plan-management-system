"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  Region,
  RegionalStructure,
  RegionalPlanVersion,
  RegionalPlanNode,
  RegionalPlanRule,
  RegionalPlanRuleStep,
  RegionalPlanningConfiguration,
  User,
  sequelize,
} = require("../models");

const regionalPlanService = require("../services/regionalPlanService");

async function runVerification() {
  console.log("================================================================================");
  console.log("       REGIONAL FULL WORKFLOW PARITY & DEDUPLICATION VERIFICATION              ");
  console.log("================================================================================");

  const testId = Date.now();

  // 1. Create a clean test Region
  const region = await Region.create({
    region_id: uuidv4(),
    code: `REG_FULL_${testId}`,
    name: `Test Parity Region ${testId}`,
    is_active: true,
  });
  console.log(`\n[Phase 1] Test Region created: ${region.name} (${region.region_id})`);

  // 2. Planning Config & Rule
  const config = await RegionalPlanningConfiguration.create({
    regional_planning_config_id: uuidv4(),
    region_id: region.region_id,
    breakdown_mode: "quarterly",
    target_units: ["count", "percent", "tons"],
  });

  const rule = await RegionalPlanRule.create({
    regional_plan_rule_id: uuidv4(),
    region_id: region.region_id,
    name: `Rule ${testId}`,
    level_count: 3,
  });

  await RegionalPlanRuleStep.create({
    regional_plan_rule_step_id: uuidv4(),
    regional_plan_rule_id: rule.regional_plan_rule_id,
    level: 1,
    name: "Strategic Focus",
    requires_weight: false,
    requires_target: false,
  });

  await RegionalPlanRuleStep.create({
    regional_plan_rule_step_id: uuidv4(),
    regional_plan_rule_id: rule.regional_plan_rule_id,
    level: 2,
    name: "Strategic Goal",
    requires_weight: false,
    requires_target: false,
  });

  await RegionalPlanRuleStep.create({
    regional_plan_rule_step_id: uuidv4(),
    regional_plan_rule_id: rule.regional_plan_rule_id,
    level: 3,
    name: "Key Performance Indicator",
    requires_weight: true,
    requires_target: true,
  });
  console.log("[Phase 2] Configuration and Rule created (Focus -> Goal -> KPI [requires weight & target])");

  // 3. User & Structure
  const dept = await RegionalStructure.create({
    regional_structure_id: uuidv4(),
    region_id: region.region_id,
    name: `Mining Dept ${testId}`,
    level: 1,
    is_active: true,
  });

  const user = await User.create({
    user_id: uuidv4(),
    region_id: region.region_id,
    regional_structure_id: dept.regional_structure_id,
    full_name: `Planner ${testId}`,
    email: `planner_${testId}@test.gov.et`,
    username: `planner_${testId}`,
    password: "hashed_dummy",
    status: "active",
  });
  console.log("[Phase 3] Organizational department and planner user created");

  // 4. Create Master Plan Draft (3 years: 2026-2028)
  const master = await RegionalPlanVersion.create({
    regional_plan_version_id: uuidv4(),
    region_id: region.region_id,
    regional_plan_rule_id: rule.regional_plan_rule_id,
    regional_planning_config_id: config.regional_planning_config_id,
    draft_name: `Regional 3-Year Plan ${testId}`,
    version_kind: "master",
    status: "draft",
    planning_year: 2026,
    start_year: 2026,
    end_year: 2028,
    planning_duration_years: 3,
    is_locked: false,
  });

  const focusNode = await RegionalPlanNode.create({
    regional_plan_node_id: uuidv4(),
    regional_plan_version_id: master.regional_plan_version_id,
    title: "Mineral Exploration Growth",
    level: 1,
    order: 1,
    is_active: true,
  });

  const goalNode = await RegionalPlanNode.create({
    regional_plan_node_id: uuidv4(),
    regional_plan_version_id: master.regional_plan_version_id,
    parent_id: focusNode.regional_plan_node_id,
    title: "Expand Geological Surveying",
    level: 2,
    order: 1,
    is_active: true,
  });

  // KPI 1: target 60 tons
  const kpi1 = await RegionalPlanNode.create({
    regional_plan_node_id: uuidv4(),
    regional_plan_version_id: master.regional_plan_version_id,
    parent_id: goalNode.regional_plan_node_id,
    title: "Artisanal Gold Production",
    level: 3,
    order: 1,
    weight: 60,
    target_unit: "tons",
    weight_mode: "sum",
    is_active: true,
  });

  // KPI 2: target 40 sites
  const kpi2 = await RegionalPlanNode.create({
    regional_plan_node_id: uuidv4(),
    regional_plan_version_id: master.regional_plan_version_id,
    parent_id: goalNode.regional_plan_node_id,
    title: "Verified Mining Sites",
    level: 3,
    order: 2,
    weight: 40,
    target_unit: "count",
    weight_mode: "sum",
    is_active: true,
  });
  console.log("[Phase 4] Master Plan Draft created with Focus -> Goal -> 2 KPIs (targets: 60, 40)");

  // 5. Finalize Master Draft -> Generates Annual Versions
  console.log("\n[Phase 5] Finalizing Master Plan Draft...");
  await regionalPlanService.finalizeRegionalPlanDraft(master.regional_plan_version_id, region.region_id, user.user_id);

  let annuals = await regionalPlanService.listRegionalAnnualVersions(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Annual versions created: count = ${annuals.length}`);
  if (annuals.length !== 3) {
    throw new Error(`Expected exactly 3 annual versions for a 3-year plan, got ${annuals.length}`);
  }
  for (const a of annuals) {
    console.log(`    Year ${a.sequence_index} (${a.planning_year}): ${a.draft_name} [${a.status}]`);
  }

  // 6. Test Idempotency: Re-finalize Draft MUST NOT duplicate annual versions
  console.log("\n[Phase 6] Checking Finalize Draft Idempotency (repeating finalize call)...");
  await regionalPlanService.finalizeRegionalPlanDraft(master.regional_plan_version_id, region.region_id, user.user_id);
  annuals = await regionalPlanService.listRegionalAnnualVersions(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Post-repeat annual versions count = ${annuals.length} (zero duplicates created)`);
  if (annuals.length !== 3) {
    throw new Error(`Duplicate annual versions created! Expected 3, got ${annuals.length}`);
  }

  // 7. Test Database Unique Index Constraint
  console.log("\n[Phase 7] Testing Database Unique Index Constraint on regional_plan_versions...");
  let constraintPassed = false;
  try {
    await RegionalPlanVersion.create({
      regional_plan_version_id: uuidv4(),
      region_id: region.region_id,
      parent_plan_version_id: master.regional_plan_version_id,
      version_kind: "annual",
      status: "draft",
      sequence_index: 1,
      planning_year: 2026,
    });
  } catch (err) {
    constraintPassed = true;
    console.log(`✓ Database unique index rejected duplicate annual sequence: "${err.message}"`);
  }
  if (!constraintPassed) {
    throw new Error("Database unique index failed: duplicate annual version was allowed!");
  }

  // 8. Test Duration Change Reconciliation (Duration 3 -> 2 -> 3)
  console.log("\n[Phase 8] Testing Reopening Draft and Changing Planning Duration (3 -> 2 -> 3)...");
  await regionalPlanService.reopenRegionalPlanDraftForEdit(master.regional_plan_version_id, region.region_id, user.user_id);
  await master.update({ planning_duration_years: 2, end_year: 2027 });

  await regionalPlanService.finalizeRegionalPlanDraft(master.regional_plan_version_id, region.region_id, user.user_id);
  annuals = await regionalPlanService.listRegionalAnnualVersions(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Pruned duration to 2 years: count = ${annuals.length}`);
  if (annuals.length !== 2) {
    throw new Error(`Expected 2 annual versions after reducing duration, got ${annuals.length}`);
  }

  // Restore duration to 3 years
  await regionalPlanService.reopenRegionalPlanDraftForEdit(master.regional_plan_version_id, region.region_id, user.user_id);
  await master.update({ planning_duration_years: 3, end_year: 2028 });
  await regionalPlanService.finalizeRegionalPlanDraft(master.regional_plan_version_id, region.region_id, user.user_id);
  annuals = await regionalPlanService.listRegionalAnnualVersions(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Restored duration to 3 years: count = ${annuals.length}`);
  if (annuals.length !== 3) {
    throw new Error(`Expected 3 annual versions after restoring duration, got ${annuals.length}`);
  }

  // 9. Annual Target Allocation & Validation
  console.log("\n[Phase 9] Testing Annual Target Allocation & Mathematical Validation...");
  const [ann1, ann2, ann3] = annuals;

  const ann1Kpi1 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: ann1.regional_plan_version_id, source_regional_plan_node_id: kpi1.regional_plan_node_id },
  });
  const ann2Kpi1 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: ann2.regional_plan_version_id, source_regional_plan_node_id: kpi1.regional_plan_node_id },
  });
  const ann3Kpi1 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: ann3.regional_plan_version_id, source_regional_plan_node_id: kpi1.regional_plan_node_id },
  });

  const ann1Kpi2 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: ann1.regional_plan_version_id, source_regional_plan_node_id: kpi2.regional_plan_node_id },
  });
  const ann2Kpi2 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: ann2.regional_plan_version_id, source_regional_plan_node_id: kpi2.regional_plan_node_id },
  });
  const ann3Kpi2 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: ann3.regional_plan_version_id, source_regional_plan_node_id: kpi2.regional_plan_node_id },
  });

  // Test exceeding target rejection (target = 60, allocate 70)
  let rejectedExceeding = false;
  try {
    await regionalPlanService.updateRegionalAnnualTarget(ann1Kpi1.regional_plan_node_id, region.region_id, 70, user.user_id);
  } catch (err) {
    rejectedExceeding = true;
    console.log(`✓ Exceeding annual target (70 > 60) rejected: "${err.message}"`);
  }
  if (!rejectedExceeding) throw new Error("Exceeding annual target should have been rejected!");

  // Test negative target rejection
  let rejectedNegative = false;
  try {
    await regionalPlanService.updateRegionalAnnualTarget(ann1Kpi1.regional_plan_node_id, region.region_id, -10, user.user_id);
  } catch (err) {
    rejectedNegative = true;
    console.log(`✓ Negative annual target (-10) rejected: "${err.message}"`);
  }
  if (!rejectedNegative) throw new Error("Negative annual target should have been rejected!");

  // Set KPI 1 targets: Year 1 = 20, Year 2 = 20, Year 3 = 20 (sum = 60)
  await regionalPlanService.updateRegionalAnnualTarget(ann1Kpi1.regional_plan_node_id, region.region_id, 20, user.user_id);
  await regionalPlanService.updateRegionalAnnualTarget(ann2Kpi1.regional_plan_node_id, region.region_id, 20, user.user_id);
  await regionalPlanService.updateRegionalAnnualTarget(ann3Kpi1.regional_plan_node_id, region.region_id, 20, user.user_id);
  console.log("✓ KPI 1 targets allocated: 20 + 20 + 20 = 60");

  // Incomplete allocation check for KPI 2
  await regionalPlanService.updateRegionalAnnualTarget(ann1Kpi2.regional_plan_node_id, region.region_id, 10, user.user_id);
  await regionalPlanService.updateRegionalAnnualTarget(ann2Kpi2.regional_plan_node_id, region.region_id, 15, user.user_id);
  // (ann3Kpi2 left unallocated)

  let readiness = await regionalPlanService.getRegionalAnnualExecutionReadiness(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Incomplete allocation readiness check: ready = ${readiness.ready}, errors = [${readiness.errors.join("; ")}]`);
  if (readiness.ready) throw new Error("Readiness should be false when targets are incomplete!");

  // Complete KPI 2 allocation: 10 + 15 + 15 = 40
  await regionalPlanService.updateRegionalAnnualTarget(ann3Kpi2.regional_plan_node_id, region.region_id, 15, user.user_id);
  readiness = await regionalPlanService.getRegionalAnnualExecutionReadiness(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Complete allocation readiness check: ready = ${readiness.ready}`);
  if (!readiness.ready) throw new Error(`Readiness should be true after complete allocation! Errors: ${readiness.errors.join("; ")}`);

  // Test Reopen Draft & Re-initialize Annual Execution Lifecycle Parity
  console.log("\n[Phase 9.5] Testing Reopening Draft, Reconciliation, and Auto-Distribution...");
  await regionalPlanService.reopenRegionalPlanDraftForEdit(master.regional_plan_version_id, region.region_id, user.user_id);
  const reopenedMaster = await regionalPlanService.getRegionalPlanVersionById(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Draft reopened: status = ${reopenedMaster.status}, annual_targets_finalized_at = ${reopenedMaster.annual_targets_finalized_at}`);
  if (reopenedMaster.status !== "draft" || reopenedMaster.annual_targets_finalized_at !== null) {
    throw new Error("Master should be in draft status with null annual_targets_finalized_at!");
  }

  // Refinalize draft
  await regionalPlanService.finalizeRegionalPlanDraft(master.regional_plan_version_id, region.region_id, user.user_id);
  const refinalizedAnnuals = await regionalPlanService.listRegionalAnnualVersions(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Draft refinalized: annual versions count = ${refinalizedAnnuals.length} (must be exactly 3, no duplicates)`);
  if (refinalizedAnnuals.length !== 3) {
    throw new Error(`Expected exactly 3 annual versions after refinalize, found ${refinalizedAnnuals.length}!`);
  }

  // Test Auto-Divide Annual Targets Equally
  const autoDivideResult = await regionalPlanService.distributeRegionalAnnualTargetsEqually(master.regional_plan_version_id, region.region_id, user.user_id);
  console.log(`✓ Auto-divide annual targets: processed ${autoDivideResult.count} master nodes`);
  readiness = await regionalPlanService.getRegionalAnnualExecutionReadiness(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Readiness after auto-distribution: ready = ${readiness.ready}`);
  if (!readiness.ready) {
    throw new Error(`Auto-divide targets should yield ready = true! Errors: ${readiness.errors.join("; ")}`);
  }

  // Finalize Annual Execution
  await regionalPlanService.finalizeRegionalAnnualExecution(master.regional_plan_version_id, region.region_id, user.user_id);
  const reloadedMaster = await regionalPlanService.getRegionalPlanVersionById(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Annual execution finalized: annual_targets_finalized_at = ${reloadedMaster.annual_targets_finalized_at}`);
  if (!reloadedMaster.annual_targets_finalized_at) throw new Error("annual_targets_finalized_at should be set!");

  // 10. Execution Period Initialization
  console.log("\n[Phase 10] Initializing Execution Periods (quarterly -> 4 quarters * 3 years = 12 periods)...");
  let periods = await regionalPlanService.initializeRegionalExecutionPeriods(
    master.regional_plan_version_id,
    region.region_id,
    "quarterly",
    [],
    user.user_id
  );
  console.log(`✓ Execution periods initialized: count = ${periods.length}`);
  if (periods.length !== 12) throw new Error(`Expected 12 periods, got ${periods.length}`);

  // Idempotency check on execution periods
  periods = await regionalPlanService.initializeRegionalExecutionPeriods(
    master.regional_plan_version_id,
    region.region_id,
    "quarterly",
    [],
    user.user_id
  );
  console.log(`✓ Re-run execution periods initialization: count = ${periods.length} (zero duplicate periods)`);
  if (periods.length !== 12) throw new Error(`Duplicate periods created! Expected 12, got ${periods.length}`);

  // 11. Period Target Allocation & Mathematical Validation
  console.log("\n[Phase 11] Period Target Allocation & Mathematical Validation...");
  // For each year, divide each KPI annual target evenly across 4 quarters
  for (const annual of annuals) {
    const annPeriods = periods.filter((p) => p.parent_plan_version_id === annual.regional_plan_version_id);
    const annNodes = await RegionalPlanNode.findAll({
      where: {
        regional_plan_version_id: annual.regional_plan_version_id,
        source_regional_plan_node_id: [kpi1.regional_plan_node_id, kpi2.regional_plan_node_id],
      },
    });

    for (const aNode of annNodes) {
      const perQuarter = Number(aNode.annual_target) / 4;
      for (const p of annPeriods) {
        const pNode = await RegionalPlanNode.findOne({
          where: { regional_plan_version_id: p.regional_plan_version_id, source_regional_plan_node_id: aNode.regional_plan_node_id },
        });
        await regionalPlanService.updateRegionalPeriodTarget(pNode.regional_plan_node_id, region.region_id, perQuarter, user.user_id);
      }
    }
  }
  console.log("✓ Distributed quarterly targets across all 12 periods");

  const periodReadiness = await regionalPlanService.getRegionalPeriodFinalizationReadiness(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Period targets readiness: ready = ${periodReadiness.ready}`);
  if (!periodReadiness.ready) throw new Error(`Period readiness failed: ${periodReadiness.errors.join("; ")}`);

  // Finalize Period Targets
  await regionalPlanService.finalizeRegionalPeriodTargets(master.regional_plan_version_id, region.region_id, user.user_id);
  const masterWithPeriodFin = await regionalPlanService.getRegionalPlanVersionById(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Period targets finalized: period_targets_finalized_at = ${masterWithPeriodFin.period_targets_finalized_at}`);
  if (!masterWithPeriodFin.period_targets_finalized_at) throw new Error("period_targets_finalized_at should be set!");

  // 12. Start Process Phase
  console.log("\n[Phase 12] Starting Operational Execution Process...");
  const processReadiness = await regionalPlanService.getRegionalStartProcessReadiness(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Start process readiness: ready = ${processReadiness.ready}`);
  if (!processReadiness.ready) throw new Error(`Start process not ready: ${processReadiness.errors.join("; ")}`);

  const startedMaster = await regionalPlanService.startRegionalPlanProcess(master.regional_plan_version_id, region.region_id, user.user_id);
  console.log(`✓ Master process started: status = ${startedMaster.status}, exec_status = ${startedMaster.execution_status}, process_started_at = ${startedMaster.process_started_at}`);

  // Verify Year 1 and Period 1 are open, Year 2-3 and Periods 2-4 are locked
  const activeAnnuals = await regionalPlanService.listRegionalAnnualVersions(master.regional_plan_version_id, region.region_id);
  console.log(`✓ Year 1 status = ${activeAnnuals[0].status}, exec_status = ${activeAnnuals[0].execution_status}, locked = ${activeAnnuals[0].is_locked}`);
  console.log(`✓ Year 2 status = ${activeAnnuals[1].status}, exec_status = ${activeAnnuals[1].execution_status}, locked = ${activeAnnuals[1].is_locked}`);
  if (activeAnnuals[0].execution_status !== "open" || activeAnnuals[1].execution_status !== "locked") {
    throw new Error("Lifecycle execution state incorrect: Year 1 must be open and Year 2 locked!");
  }

  // 13. Achievement Reporting on Year 1 Period 1
  console.log("\n[Phase 13] Verifying Achievement Reporting on Year 1 Period 1...");
  const y1Periods = periods.filter((p) => p.parent_plan_version_id === ann1.regional_plan_version_id);
  const q1Node = await RegionalPlanNode.findOne({
    where: {
      regional_plan_version_id: y1Periods[0].regional_plan_version_id,
      source_regional_plan_node_id: ann1Kpi1.regional_plan_node_id,
    },
  });

  await regionalPlanService.updateRegionalPeriodActual(
    q1Node.regional_plan_node_id,
    region.region_id,
    { period_actual: 4.8, narration: "Quarter 1 gold extraction achieved 4.8 tons" },
    user.user_id
  );

  const updatedQ1Node = await RegionalPlanNode.findByPk(q1Node.regional_plan_node_id);
  console.log(`✓ Achievement recorded: actual = ${updatedQ1Node.period_actual}, status = ${updatedQ1Node.period_actual_status}, narration = "${updatedQ1Node.narration}"`);
  if (Number(updatedQ1Node.period_actual) !== 4.8) {
    throw new Error(`Expected period_actual = 4.8, got ${updatedQ1Node.period_actual}`);
  }

  console.log("\n================================================================================");
  console.log("       ALL REGIONAL FULL PARITY & DEDUPLICATION TESTS PASSED (13/13)            ");
  console.log("================================================================================");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ VERIFICATION FAILED:", err);
    process.exit(1);
  });

