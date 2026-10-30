"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("../models");
const regionalPlanService = require("../services/regionalPlanService");
const { Region, User } = require("../models");

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

async function run() {
  console.log("\n========================================================");
  console.log("  REGIONAL PLAN MANAGEMENT PARITY VERIFICATION");
  console.log("========================================================\n");

  const ts = Date.now();
  const region1Id = uuidv4();
  const region2Id = uuidv4();
  const testUserId = uuidv4();

  try {
    // 0. Preliminary cleanup of old test regions if any
    await sequelize.query(`DELETE FROM public.regions WHERE name LIKE 'Parity Test Region%'`);

    // 1. Setup Test Regions & User
    console.log("[1] Setting up Test Regions and Test User...");
    await Region.bulkCreate([
      {
        region_id: region1Id,
        name: `Parity Test Region 1 ${ts}`,
        code: `PTR1_${ts}`,
        status: "active",
      },
      {
        region_id: region2Id,
        name: `Parity Test Region 2 ${ts}`,
        code: `PTR2_${ts}`,
        status: "active",
      },
    ]);

    await User.create({
      user_id: testUserId,
      email: `tester_${ts}@example.com`,
      full_name: "Tester Parity",
      password: "HashedPasswordPlaceholder123!",
      region_id: region1Id,
      is_active: true,
    });

    await regionalPlanService.initializeRegionalPlanningDefaults(region1Id);
    await regionalPlanService.initializeRegionalPlanningDefaults(region2Id);

    assert(true, "Test regions and user created successfully");

    // 2. Planning Configuration & Restore Defaults
    console.log("\n[2] Testing Planning Configuration Restore Defaults...");
    const config1 = await regionalPlanService.getEffectiveRegionalPlanningConfig(region1Id);
    assert(config1 && config1.draft_entity_label_singular === "Plan Draft", "Default config has standard terminology 'Plan Draft'");
    assert(Array.isArray(config1.target_units) && config1.target_units.length > 0, "Default target units is structured array");

    await regionalPlanService.updateRegionalPlanningConfig(region1Id, {
      draft_entity_label_singular: "Custom Plan Name",
      max_duration_years: 15,
    });
    const modifiedConfig = await regionalPlanService.getEffectiveRegionalPlanningConfig(region1Id);
    assert(modifiedConfig.draft_entity_label_singular === "Custom Plan Name", "Config updated to custom values");

    const restoredConfig = await regionalPlanService.restoreDefaultRegionalPlanningConfig(region1Id);
    assert(restoredConfig.draft_entity_label_singular === "Plan Draft", "Config restored to default standard terminology");
    assert(restoredConfig.max_duration_years === 10, "Planning horizon restored to 10 years max");

    // 3. Performance Color Thresholds CRUD & Color Resolution
    console.log("\n[3] Testing Performance Color Thresholds & Resolution...");
    const thresholds = await regionalPlanService.listRegionalPerformanceColorThresholds(region1Id);
    assert(thresholds.length === 7, `Region 1 initialized with 7 default color threshold bands (got ${thresholds.length})`);

    const noPerfResolution = await regionalPlanService.resolveRegionalPerformanceColor(region1Id, 0);
    assert(noPerfResolution.color_hex === "#DC2626", `0% resolves to critical red (#DC2626) (got ${noPerfResolution.color_hex})`);

    const veryPoorResolution = await regionalPlanService.resolveRegionalPerformanceColor(region1Id, 15);
    assert(veryPoorResolution.color_hex === "#EF4444", `15% resolves to red (#EF4444) (got ${veryPoorResolution.color_hex})`);

    const greenResolution = await regionalPlanService.resolveRegionalPerformanceColor(region1Id, 95);
    assert(greenResolution.color_hex === "#16A34A" || greenResolution.color_hex === "#15803D", `95% resolves to green (got ${greenResolution.color_hex})`);

    // Create custom threshold in Region 1
    const customThreshold = await regionalPlanService.createRegionalPerformanceColorThreshold(region1Id, {
      label: "Super Outstanding",
      min_percentage: 60,
      max_percentage: 65,
      color_hex: "#8B5CF6",
      is_active: true,
      description: "Custom band",
      sort_order: 8,
    });
    assert(customThreshold && customThreshold.label === "Super Outstanding", "Custom color threshold created in Region 1");

    // Verify Region 2 isolation: Region 2 should not have Region 1's custom threshold
    const r2Thresholds = await regionalPlanService.listRegionalPerformanceColorThresholds(region2Id);
    assert(!r2Thresholds.some((t) => t.label === "Super Outstanding"), "Region 2 color thresholds isolated from Region 1");

    // Update and delete threshold
    const updatedThreshold = await regionalPlanService.updateRegionalPerformanceColorThreshold(
      customThreshold.regional_performance_color_threshold_id,
      region1Id,
      { label: "Mega Outstanding" }
    );
    assert(updatedThreshold.label === "Mega Outstanding", "Threshold updated successfully");

    await regionalPlanService.deleteRegionalPerformanceColorThreshold(
      customThreshold.regional_performance_color_threshold_id,
      region1Id
    );
    const postDeleteThresholds = await regionalPlanService.listRegionalPerformanceColorThresholds(region1Id);
    assert(!postDeleteThresholds.some((t) => t.label === "Mega Outstanding"), "Threshold deleted successfully");

    // 4. Plan Rule Customization with Step Colors
    console.log("\n[4] Testing Plan Rule Customization with Step Colors...");
    const rules = await regionalPlanService.listRegionalPlanRules(region1Id);
    assert(rules.length >= 1, "Default plan rule exists for Region 1");
    const defaultRule = rules[0];
    assert(defaultRule.steps.length === 4, "Default rule has 4 hierarchy steps");
    assert(defaultRule.steps[0].color_hex === "#8B5CF6", "Step 1 has default color #8B5CF6");

    const customRule = await regionalPlanService.createRegionalPlanRule(
      region1Id,
      {
        name: "3-Tier Fast Track Rule",
        description: "Focus on 3 levels",
        steps: [
          { level: 1, name: "Strategic Pillar", order: 1, color_hex: "#6366F1", requires_weight: false, requires_contribution_weight: false },
          { level: 2, name: "Operational Objective", order: 2, color_hex: "#10B981", requires_weight: false, requires_contribution_weight: true },
          { level: 3, name: "Metric", order: 3, color_hex: "#F59E0B", requires_weight: true, requires_contribution_weight: true },
        ],
      },
      testUserId
    );
    assert(customRule && customRule.steps.length === 3, "Custom plan rule created with 3 custom steps and colors");
    assert(customRule.steps[1].color_hex === "#10B981", "Step 2 has color #10B981");

    // 5. Plan Review Workflow
    console.log("\n[5] Testing Plan Review Workflow...");
    const planDraft = await regionalPlanService.createRegionalPlanDraft(
      region1Id,
      {
        draft_name: "Parity Test Plan for Review",
        start_year: 2027,
        planning_duration_years: 3,
        planning_start_date: "2027-01-01",
        regional_plan_rule_id: customRule.regional_plan_rule_id,
      },
      testUserId
    );
    assert(planDraft && planDraft.status === "draft", "Plan draft created in draft status");

    // Readiness check before adding nodes (should fail because empty hierarchy)
    const emptyReadiness = await regionalPlanService.getRegionalPublishForReviewReadiness(
      planDraft.regional_plan_version_id,
      region1Id
    );
    assert(!emptyReadiness.ready, "Readiness check fails when plan hierarchy is empty");

    // Add a node
    await regionalPlanService.createRegionalPlanNode(
      planDraft.regional_plan_version_id,
      region1Id,
      {
        title: "Pillar 1: Economic Growth",
        type: "strategic",
      },
      testUserId
    );

    const validReadiness = await regionalPlanService.getRegionalPublishForReviewReadiness(
      planDraft.regional_plan_version_id,
      region1Id
    );
    assert(validReadiness.ready, "Readiness check passes after adding hierarchy node");

    // Publish for review
    const publishedPlan = await regionalPlanService.publishRegionalPlanForReview(
      planDraft.regional_plan_version_id,
      region1Id,
      {}
    );
    assert(publishedPlan.review_status === "in_review" && publishedPlan.status === "submitted", "Plan published for review (review_status='in_review', status='submitted')");

    // Review list check
    const forReview = await regionalPlanService.getRegionalPlanVersionsForReview(region1Id);
    assert(forReview.some((v) => v.regional_plan_version_id === planDraft.regional_plan_version_id), "Plan appears in review queue");

    // Review dashboard check
    const reviewDash = await regionalPlanService.getRegionalPlanReviewDashboard(
      planDraft.regional_plan_version_id,
      region1Id
    );
    assert(reviewDash && reviewDash.version, "Review dashboard returns plan version summary");

    // Unlock corrections
    const unlockedPlan = await regionalPlanService.unlockRegionalPlanReviewCorrections(
      planDraft.regional_plan_version_id,
      region1Id,
      {},
      "Need to refine target values"
    );
    assert(unlockedPlan.review_status === "revision_requested" && unlockedPlan.status === "draft", "Corrections unlocked (review_status='revision_requested', status='draft')");

    // Republish for review
    const republishedPlan = await regionalPlanService.republishRegionalPlanForReview(
      planDraft.regional_plan_version_id,
      region1Id,
      {}
    );
    assert(republishedPlan.review_status === "in_review", "Republished for review (review_status='in_review')");

    // Complete review readiness & approval
    const completeReadiness = await regionalPlanService.getRegionalCompleteReviewReadiness(
      planDraft.regional_plan_version_id,
      region1Id
    );
    assert(completeReadiness.ready, "Complete review readiness passes");

    const approvedPlan = await regionalPlanService.completeRegionalPlanReview(
      planDraft.regional_plan_version_id,
      region1Id,
      {},
      "approve"
    );
    assert(approvedPlan.review_status === "approved" && approvedPlan.status === "approved", "Plan review completed with approval (status='approved')");

    // 6. Cross-Region Review Queue Isolation
    console.log("\n[6] Testing Cross-Region Review Isolation...");
    const r2ReviewList = await regionalPlanService.getRegionalPlanVersionsForReview(region2Id);
    assert(!r2ReviewList.some((v) => v.regional_plan_version_id === planDraft.regional_plan_version_id), "Region 2 review queue does not contain Region 1 plans");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    // Cleanup
    console.log("\n[7] Cleaning up test records...");
    await sequelize.query(`DELETE FROM public.regional_performance_color_thresholds WHERE region_id IN ('${region1Id}', '${region2Id}')`);
    await sequelize.query(`DELETE FROM public.regional_plan_nodes WHERE regional_plan_version_id IN (SELECT regional_plan_version_id FROM public.regional_plan_versions WHERE region_id IN ('${region1Id}', '${region2Id}'))`);
    await sequelize.query(`DELETE FROM public.regional_plan_versions WHERE region_id IN ('${region1Id}', '${region2Id}')`);
    await sequelize.query(`DELETE FROM public.regional_plan_rule_steps WHERE regional_plan_rule_id IN (SELECT regional_plan_rule_id FROM public.regional_plan_rules WHERE region_id IN ('${region1Id}', '${region2Id}'))`);
    await sequelize.query(`DELETE FROM public.regional_plan_rules WHERE region_id IN ('${region1Id}', '${region2Id}')`);
    await sequelize.query(`DELETE FROM public.regional_planning_configurations WHERE region_id IN ('${region1Id}', '${region2Id}')`);
    await User.destroy({ where: { user_id: testUserId } });
    await Region.destroy({ where: { region_id: [region1Id, region2Id] } });
  }

  console.log("\n========================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

run();
