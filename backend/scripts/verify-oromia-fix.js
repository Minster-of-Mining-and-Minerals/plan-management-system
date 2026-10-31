const regionalPlanService = require('../services/regionalPlanService');
const { sequelize, RegionalPlanVersion, RegionalPlanRule } = require('../models');

async function verify() {
  const regionId = '0e9c5607-1f2d-4f40-bc48-287fb10de97b';
  const planVersionId = 'f4ee2ec6-4415-455c-a547-b01ccf0248ba';
  const ruleId = '1834a562-0a34-418b-832e-f17df1d83ab0';

  console.log('--- 1. Testing listRegionalPlanRules ---');
  const rules = await regionalPlanService.listRegionalPlanRules(regionId);
  console.log(`Found ${rules.length} template rules:`);
  for (const r of rules) {
    console.log(`- Rule: "${r.name}" (${r.regional_plan_rule_id}), active: ${r.is_active}, step count: ${r.steps?.length}`);
    if (r.steps) {
      console.log('  Steps:', r.steps.map(s => `${s.step_order || s.level}: ${s.label || s.name} (${s.node_type})`).join(' -> '));
    }
  }

  const standard3Rule = rules.find(r => r.regional_plan_rule_id === ruleId);
  if (!standard3Rule) throw new Error('Standard 3-Level Plan rule not found in list!');
  if (standard3Rule.steps.length !== 3) {
    throw new Error(`Expected 3 steps on Standard 3-Level Plan, got ${standard3Rule.steps.length}`);
  }
  if (standard3Rule.steps[0].label !== 'SF') {
    throw new Error(`Expected step 1 label to be 'SF', got '${standard3Rule.steps[0].label}'`);
  }
  if (standard3Rule.steps[1].label !== 'Goal') {
    throw new Error(`Expected step 2 label to be 'Goal', got '${standard3Rule.steps[1].label}'`);
  }
  if (standard3Rule.steps[2].label !== 'KPI') {
    throw new Error(`Expected step 3 label to be 'KPI', got '${standard3Rule.steps[2].label}'`);
  }
  console.log('✓ listRegionalPlanRules correctly returns Standard 3-Level Plan with SF -> Goal -> KPI');

  console.log('\n--- 2. Testing getRegionalPlanRuleById ---');
  const singleRule = await regionalPlanService.getRegionalPlanRuleById(ruleId, regionId);
  console.log(`Single rule "${singleRule.name}":`, singleRule.steps.map(s => `${s.step_order}: ${s.label}`).join(' -> '));
  if (singleRule.steps.length !== 3) {
    throw new Error(`Expected 3 steps, got ${singleRule.steps.length}`);
  }
  console.log('✓ getRegionalPlanRuleById correctly returns 3 steps');

  console.log('\n--- 3. Testing getRegionalPlanRuleForVersion ---');
  const versionRule = await regionalPlanService.getRegionalPlanRuleForVersion(planVersionId, regionId);
  console.log(`Version rule "${versionRule.name}" (${versionRule.regional_plan_rule_id}):`);
  console.log('Steps:', versionRule.steps.map(s => `${s.step_order}: ${s.label}`).join(' -> '));
  if (versionRule.name !== 'Standard 3-Level Plan') {
    throw new Error(`Expected version rule name 'Standard 3-Level Plan', got '${versionRule.name}'`);
  }
  if (versionRule.steps.length !== 3) {
    throw new Error(`Expected 3 steps on version rule, got ${versionRule.steps.length}`);
  }
  console.log('✓ getRegionalPlanRuleForVersion correctly returns Standard 3-Level Plan with 3 steps');

  console.log('\n--- 4. Testing getRegionalPlanVersionById ---');
  const plan = await regionalPlanService.getRegionalPlanVersionById(planVersionId, regionId);
  console.log(`Plan "${plan.draft_name}", rule name: "${plan.planRule?.name}", steps count: ${plan.planRule?.steps?.length}`);
  if (plan.planRule?.steps?.length !== 3) {
    throw new Error(`Expected 3 steps on plan.planRule, got ${plan.planRule?.steps?.length}`);
  }
  console.log('✓ getRegionalPlanVersionById correctly associates planRule with 3 steps');

  console.log('\n--- 5. Testing updateRegionalPlanRuleForVersion (Edit Draft Rule) ---');
  const updatedSnapshot = await regionalPlanService.updateRegionalPlanRuleForVersion(planVersionId, regionId, {
    name: 'Standard 3-Level Plan (Customized)',
    performance_scoring_policy: 'CAP_100',
    steps: [
      { step_order: 1, label: 'SF', requires_weight: false, requires_contribution_weight: false, color_hex: '#8B5CF6' },
      { step_order: 2, label: 'Goal', requires_weight: false, requires_contribution_weight: false, color_hex: '#3B82F6' },
      { step_order: 3, label: 'KPI', requires_weight: true, requires_contribution_weight: true, color_hex: '#10B981' },
    ],
  });
  console.log(`Updated snapshot name: "${updatedSnapshot.name}", steps count: ${updatedSnapshot.steps?.length}`);
  if (updatedSnapshot.steps.length !== 3) {
    throw new Error(`Expected 3 steps after update, got ${updatedSnapshot.steps.length}`);
  }
  console.log('✓ updateRegionalPlanRuleForVersion successfully updated rule snapshot and preserved 3 steps');

  // Revert rule name to 'Standard 3-Level Plan'
  await regionalPlanService.updateRegionalPlanRuleForVersion(planVersionId, regionId, {
    name: 'Standard 3-Level Plan',
    performance_scoring_policy: 'CAP_100',
    steps: [
      { step_order: 1, label: 'SF', requires_weight: false, requires_contribution_weight: false, color_hex: '#8B5CF6' },
      { step_order: 2, label: 'Goal', requires_weight: false, requires_contribution_weight: false, color_hex: '#3B82F6' },
      { step_order: 3, label: 'KPI', requires_weight: true, requires_contribution_weight: true, color_hex: '#10B981' },
    ],
  });
  console.log('✓ Reset rule name cleanly to Standard 3-Level Plan');

  console.log('\n=== ALL ORONIA FIX VERIFICATIONS PASSED ===');
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

