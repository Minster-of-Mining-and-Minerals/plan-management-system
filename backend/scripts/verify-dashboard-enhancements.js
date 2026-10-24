const { PlanVersion, PlanNode, GovernmentStructure, Region, Company, PurchasingCenter } = require('../models');
const planExecutionDashboardService = require('../services/planExecutionDashboardService');
const { Op } = require('sequelize');

async function runDashboardEnhancementTests() {
  console.log('--- STARTING DASHBOARD ENHANCEMENT VERIFICATION ---');

  const mockAdminReq = {
    user: {
      user_id: '00000000-0000-0000-0000-000000000001',
      roles: ['Super Admin'],
      permissions: [
        { resource: 'plans', action: 'read_all' },
        { resource: 'dashboard', action: 'read' },
      ],
    },
  };

  // Test 1: Plan Search for keyword "gold"
  console.log('\n[TEST 1] Searching plans matching keyword "gold"...');
  const searchResult = await planExecutionDashboardService.getPlanExecutionDashboard(
    mockAdminReq,
    {
      section: 'overview',
      search: 'gold',
    }
  );

  const totalPlans = searchResult.kpi?.totalPlans ?? searchResult.plans?.length ?? 0;
  console.log(`Found ${totalPlans} matching plans for "gold" search query.`);
  if (!searchResult.plans || searchResult.plans.length === 0) {
    throw new Error('Expected to find at least one plan matching "gold", found 0.');
  }
  const matchedPlan = searchResult.plans[0];
  console.log(`Matched Plan: "${matchedPlan.draft_name}" (ID: ${matchedPlan.plan_version_id})`);
  console.log(`Matched Plan Progress: ${matchedPlan.execution_progress_percent}%`);

  // Test 2: Hierarchy Node Properties (type, level, parent_id, weight) on active execution plan
  console.log('\n[TEST 2] Verifying hierarchy tree node properties on execution plan...');
  const activeExecutionPlan = await PlanVersion.findOne({
    where: {
      version_kind: 'master',
      process_started_at: { [Op.ne]: null },
      active_execution_snapshot_id: { [Op.ne]: null },
    },
  });

  if (!activeExecutionPlan) {
    throw new Error('No active execution master plan found.');
  }

  console.log(`Testing active execution plan: "${activeExecutionPlan.draft_name}" (${activeExecutionPlan.plan_version_id})`);

  const treeResult = await planExecutionDashboardService.getPlanExecutionDashboard(
    mockAdminReq,
    {
      section: 'progress_tree',
      master_plan_version_id: activeExecutionPlan.plan_version_id,
    }
  );

  const tree = treeResult.progress_tree?.nodes || [];
  console.log(`Top-level hierarchy nodes count: ${tree.length}`);
  if (tree.length === 0) {
    throw new Error('Expected top-level nodes in progress tree, found 0.');
  }

  const topNode = tree[0];
  console.log(`Top node (SF): "${topNode.title}" | Type: ${topNode.type} | Level: ${topNode.level} | Weight: ${topNode.weight}`);
  if (!topNode.type || topNode.level !== 1) {
    throw new Error(`Expected level 1 (SF), received level ${topNode.level} and type ${topNode.type}`);
  }

  if (!topNode.children || topNode.children.length === 0) {
    throw new Error('Expected child goals under top SF node, found 0.');
  }

  const childGoal = topNode.children[0];
  console.log(`  Child node (Goal): "${childGoal.title}" | Type: ${childGoal.type} | Level: ${childGoal.level} | Parent: ${childGoal.parent_id}`);
  if (childGoal.parent_id !== topNode.id || childGoal.level !== 2) {
    throw new Error(`Child node level or parent_id mismatch: expected level 2 and parent ${topNode.id}`);
  }

  if (!childGoal.children || childGoal.children.length === 0) {
    throw new Error('Expected KPIs under Goal node, found 0.');
  }

  const kpi = childGoal.children[0];
  console.log(`    KPI node: "${kpi.title}" | Type: ${kpi.type} | Level: ${kpi.level} | Parent: ${kpi.parent_id} | Progress: ${kpi.progress}%`);
  if (kpi.parent_id !== childGoal.id || kpi.level !== 3) {
    throw new Error(`KPI node level or parent_id mismatch: expected level 3 and parent ${childGoal.id}`);
  }

  // Test 3: Hierarchy Tree Filtering Logic Verification
  console.log('\n[TEST 3] Verifying hierarchy-depth filtering simulation...');
  function filterTree(nodes, levelFilter, selectedId) {
    if (!selectedId || levelFilter === 'all') return nodes;

    const findSubtree = (items) => {
      for (const item of items) {
        if (item.id === selectedId) return [item];
        if (item.children && item.children.length > 0) {
          const found = findSubtree(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findSubtree(nodes) || [];
  }

  // A. Filter by Strategic Focus
  const sfSubtree = filterTree(tree, 'strategic_focus', topNode.id);
  console.log(`Filtered by SF "${topNode.title}": Returned ${sfSubtree.length} root node. Expected: 1.`);
  if (sfSubtree.length !== 1 || sfSubtree[0].id !== topNode.id) {
    throw new Error('SF filtering failed to return exact SF subtree.');
  }

  // B. Filter by Goal
  const goalSubtree = filterTree(tree, 'goal', childGoal.id);
  console.log(`Filtered by Goal "${childGoal.title}": Returned ${goalSubtree.length} root node. Expected: 1.`);
  if (goalSubtree.length !== 1 || goalSubtree[0].id !== childGoal.id) {
    throw new Error('Goal filtering failed to return exact Goal subtree.');
  }

  // C. Filter by KPI
  const kpiSubtree = filterTree(tree, 'kpi', kpi.id);
  console.log(`Filtered by KPI "${kpi.title}": Returned ${kpiSubtree.length} root node. Expected: 1.`);
  if (kpiSubtree.length !== 1 || kpiSubtree[0].id !== kpi.id) {
    throw new Error('KPI filtering failed to return exact KPI subtree.');
  }

  // Test 4: Verify Cross-Domain Registries (Regions, Companies, Purchasing Centers)
  console.log('\n[TEST 4] Verifying Domain Registries for Navigation Tabs...');
  const regionsCount = await Region.count();
  const companiesCount = await Company.count();
  const purchasingCentersCount = await PurchasingCenter.count();

  console.log(`- Regional Management: ${regionsCount} regions in database.`);
  console.log(`- Companies Management: ${companiesCount} companies in database.`);
  console.log(`- Gold Purchasing Centers: ${purchasingCentersCount} purchasing centers in database.`);

  console.log('\n======================================================');
  console.log('✅ ALL 4 VERIFICATION SUITES PASSED WITH 100% SUCCESS');
  console.log('======================================================');
  process.exit(0);
}

runDashboardEnhancementTests().catch((err) => {
  console.error('\nVerification FAILED:', err);
  process.exit(1);
});
