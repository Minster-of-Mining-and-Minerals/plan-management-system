"use strict";

const assert = require("assert");
const { getPlanExecutionDashboard } = require("../services/planExecutionDashboardService");

async function runTests() {
  console.log("Starting Dashboard Progressive Loading Verification...");

  const superAdminReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000001",
      roles: ["Super Admin"],
      permissions: ["PLANS:READ"],
    },
  };

  // 1. Verify Full dashboard (backward compatibility)
  console.log("  Testing section=full / default backward compatibility...");
  const fullData = await getPlanExecutionDashboard(superAdminReq, {});
  assert.ok(fullData.kpi, "fullData must include kpi");
  assert.ok(Array.isArray(fullData.plans), "fullData.plans must be an array");
  assert.ok(Array.isArray(fullData.structures), "fullData.structures must be an array");
  assert.ok(Array.isArray(fullData.departments), "fullData.departments must be an array");
  assert.ok(Array.isArray(fullData.users), "fullData.users must be an array");
  assert.ok(Array.isArray(fullData.annual_timeline), "fullData.annual_timeline must be an array");
  assert.ok(fullData.sharing, "fullData.sharing must exist");
  assert.ok(fullData.progress_tree, "fullData.progress_tree must exist");
  assert.ok(fullData.generated_at, "fullData.generated_at must exist");
  console.log("    ✓ Full dashboard returned all expected top-level fields.");

  // 2. Verify Overview section
  console.log("  Testing section=overview...");
  const overviewData = await getPlanExecutionDashboard(superAdminReq, { section: "overview" });
  assert.deepStrictEqual(overviewData.kpi, fullData.kpi, "Overview kpi must match full kpi");
  assert.strictEqual(overviewData.plans.length, fullData.plans.length, "Overview plans count must match");
  assert.strictEqual(overviewData.structures.length, fullData.structures.length, "Overview structures count must match");
  assert.strictEqual(overviewData.departments.length, 0, "Overview departments must be deferred/empty");
  assert.strictEqual(overviewData.users.length, 0, "Overview users must be deferred/empty");
  assert.strictEqual(overviewData.progress_tree.nodes.length, 0, "Overview progress_tree.nodes must be deferred/empty");
  assert.strictEqual(overviewData.focus_master_plan_version_id, fullData.focus_master_plan_version_id, "focusMasterId must match");
  console.log("    ✓ Overview section returned essential fields and deferred heavy tabs.");

  // 3. Verify Progress Tree section
  console.log("  Testing section=progress_tree...");
  const treeData = await getPlanExecutionDashboard(superAdminReq, {
    section: "progress_tree",
    master_plan_version_id: fullData.focus_master_plan_version_id,
  });
  assert.ok(treeData.progress_tree, "treeData must include progress_tree");
  assert.strictEqual(treeData.focus_master_plan_version_id, fullData.focus_master_plan_version_id);
  assert.strictEqual(treeData.progress_tree.period_label, fullData.progress_tree.period_label);
  assert.strictEqual(treeData.progress_tree.nodes.length, fullData.progress_tree.nodes.length);
  assert.strictEqual(treeData.kpi, undefined, "Standalone tree response should not include kpi");
  assert.strictEqual(treeData.departments, undefined, "Standalone tree response should not include departments");
  console.log("    ✓ Standalone progress_tree returned accurate tree parity.");

  // 4. Verify Department & User section
  console.log("  Testing section=department_user...");
  const deptUserData = await getPlanExecutionDashboard(superAdminReq, { section: "department_user" });
  assert.ok(Array.isArray(deptUserData.departments), "departments must be an array");
  assert.ok(Array.isArray(deptUserData.users), "users must be an array");
  assert.strictEqual(deptUserData.departments.length, fullData.departments.length, "departments count must match fullData");
  assert.strictEqual(deptUserData.users.length, fullData.users.length, "users count must match fullData");
  assert.strictEqual(deptUserData.progress_tree, undefined, "department_user should not build progress tree");
  console.log("    ✓ Department and user metrics match full dashboard values.");

  // 5. Authorization and Scope boundaries
  console.log("  Testing scope boundaries for restricted user...");
  const restrictedReq = {
    user: {
      user_id: "99999999-9999-9999-9999-999999999999",
      roles: ["Employee"],
      government_structure_id: "00000000-0000-0000-0000-000000000099",
      permissions: ["PLANS:READ"],
    },
  };
  const restrictedOverview = await getPlanExecutionDashboard(restrictedReq, { section: "overview" });
  assert.strictEqual(restrictedOverview.plans.length, 0, "Restricted user without assignments gets 0 plans");
  assert.strictEqual(restrictedOverview.kpi.totalPlans, 0);

  const restrictedTree = await getPlanExecutionDashboard(restrictedReq, {
    section: "progress_tree",
    master_plan_version_id: fullData.focus_master_plan_version_id,
  });
  assert.strictEqual(restrictedTree.progress_tree.nodes.length, 0, "Restricted user cannot fetch unassigned master tree");
  assert.strictEqual(restrictedTree.focus_master_plan_version_id, null);
  console.log("    ✓ Scope enforcement safely denies unauthorized master plan access.");

  console.log("All dashboard progressive loading checks passed successfully!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Dashboard progressive loading test failed:", err);
  process.exit(1);
});
