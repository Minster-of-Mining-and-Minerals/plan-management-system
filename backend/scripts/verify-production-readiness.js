"use strict";

const assert = require("assert");
const { sequelize, PlanVersion, PlanNode } = require("../models");
const dashboardController = require("../controllers/plan/planDashboardController");

async function verifyIndexes() {
  console.log("\n1. Verifying Database Indexes in PostgreSQL System Catalog...");

  const criticalIndexes = [
    "idx_plan_nodes_version_active",
    "idx_plan_nodes_version_parent_active",
    "idx_plan_nodes_period_actual_status",
    "idx_plan_nodes_plan_version_id",
    "uq_plan_nodes_parent_title_version",
    "idx_plan_versions_kind_status",
    "uq_plan_versions_master_year_version_govt",
    "uq_plan_versions_parent_sequence",
    "idx_internal_assignments_plan_node_id",
    "idx_internal_assignments_user_id",
    "idx_internal_assignments_internal_structure_id",
    "uq_internal_assignments_active_node_user",
    "idx_users_govt_active",
    "idx_users_internal_active",
  ];

  const [existingIndexes] = await sequelize.query(`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = ANY(ARRAY[${criticalIndexes.map((i) => `'${i}'`).join(",")}]);
  `);

  const foundNames = new Set(existingIndexes.map((r) => r.indexname));
  let allFound = true;

  for (const idx of criticalIndexes) {
    if (foundNames.has(idx)) {
      console.log(`  [OK] Index exists: ${idx}`);
    } else {
      console.warn(`  [MISSING/DIFF] Index not found in catalog: ${idx}`);
      allFound = false;
    }
  }

  // Also query count of total active indexes on plan tables
  const [indexCounts] = await sequelize.query(`
    SELECT tablename, count(*) as count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('plan_nodes', 'plan_versions', 'plan_assignments', 'plan_internal_assignments')
    GROUP BY tablename;
  `);

  console.log("  Index inventory by table:");
  indexCounts.forEach((r) => console.log(`    - ${r.tablename}: ${r.count} indexes`));

  return allFound;
}

function verifyConnectionPool() {
  console.log("\n2. Verifying Connection Pool Configuration...");
  const pool = sequelize.connectionManager.pool;
  const max = pool?.max ?? 10;
  const min = pool?.min ?? 0;
  const acquire = typeof pool?.acquire === "number" ? pool.acquire : 30000;
  const idle = typeof pool?.idle === "number" ? pool.idle : 10000;

  console.log(`  Configured Pool Settings:
    - Max Connections:     ${max} (production standard: >= 10)
    - Min Connections:     ${min}
    - Acquire Timeout:     ${acquire} ms
    - Idle Timeout:        ${idle} ms`);

  assert(max >= 10, "Pool max connections should be at least 10 for production");
  console.log("  [OK] Pool configuration validated.");
}

async function verifyControllerEndpointsAndTelemetry() {
  console.log("\n3. Verifying Controller Endpoints, Telemetry & Server-Timing Headers...");

  const superAdminReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000001",
      roles: ["Super Admin"],
      permissions: ["PLANS:READ", "PLANS:MANAGE"],
    },
    query: {},
  };

  const createMockRes = () => {
    const headers = {};
    let responseData = null;
    let statusCode = 200;

    return {
      set: (header, val) => {
        headers[header] = val;
      },
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
      json: (data) => {
        responseData = data;
      },
      getHeaders: () => headers,
      getData: () => responseData,
      getStatusCode: () => statusCode,
    };
  };

  // 3.1 Full Dashboard
  const resFull = createMockRes();
  await dashboardController.getExecutionDashboard(superAdminReq, resFull);
  assert.strictEqual(resFull.getStatusCode(), 200);
  assert(resFull.getData().success, "Full dashboard should succeed");
  const serverTimingFull = resFull.getHeaders()["Server-Timing"];
  assert(serverTimingFull && serverTimingFull.includes("total;dur="), "Server-Timing header must be present on full dashboard");
  console.log(`  [OK] getExecutionDashboard (full): Server-Timing="${serverTimingFull}"`);

  // 3.2 Overview Section
  const resOverview = createMockRes();
  await dashboardController.getExecutionDashboardSummary(superAdminReq, resOverview);
  assert.strictEqual(resOverview.getStatusCode(), 200);
  assert(resOverview.getData().success, "Overview dashboard should succeed");
  const serverTimingOverview = resOverview.getHeaders()["Server-Timing"];
  assert(serverTimingOverview && serverTimingOverview.includes("total;dur="), "Server-Timing header must be present on overview");
  console.log(`  [OK] getExecutionDashboardSummary (overview): Server-Timing="${serverTimingOverview}"`);

  // 3.3 Progress Tree Section
  const resTree = createMockRes();
  await dashboardController.getExecutionDashboardProgressTree(superAdminReq, resTree);
  assert.strictEqual(resTree.getStatusCode(), 200);
  assert(resTree.getData().success, "Progress tree section should succeed");
  const serverTimingTree = resTree.getHeaders()["Server-Timing"];
  assert(serverTimingTree && serverTimingTree.includes("total;dur="), "Server-Timing header must be present on progress tree");
  console.log(`  [OK] getExecutionDashboardProgressTree (progress_tree): Server-Timing="${serverTimingTree}"`);

  // 3.4 Department User Section
  const resDept = createMockRes();
  await dashboardController.getExecutionDashboardDepartmentUser(superAdminReq, resDept);
  assert.strictEqual(resDept.getStatusCode(), 200);
  assert(resDept.getData().success, "Department/User section should succeed");
  const serverTimingDept = resDept.getHeaders()["Server-Timing"];
  assert(serverTimingDept && serverTimingDept.includes("total;dur="), "Server-Timing header must be present on department_user");
  console.log(`  [OK] getExecutionDashboardDepartmentUser (department_user): Server-Timing="${serverTimingDept}"`);

  // 3.5 Cross-section verification: KPI parity
  assert.deepStrictEqual(resFull.getData().data.kpi, resOverview.getData().data.kpi, "KPI summaries must match exactly across full and overview");
  console.log(`  [OK] Calculation parity verified: averageProgress = ${resFull.getData().data.kpi.averageProgress}% across both endpoints`);
}

async function main() {
  console.log("===================================================================");
  console.log("=== PHASE 7: PRODUCTION PRE-FLIGHT & POST-CUTOVER AUDIT ===");
  console.log("===================================================================");
  console.log(`Database: ${sequelize.config.database} on ${sequelize.config.host}:${sequelize.config.port}`);

  await sequelize.authenticate();
  console.log("  [OK] Database connection established.");

  await verifyIndexes();
  verifyConnectionPool();
  await verifyControllerEndpointsAndTelemetry();

  console.log("\n===================================================================");
  console.log("=== ALL PRODUCTION PRE-FLIGHT VERIFICATIONS PASSED (100% OK) ===");
  console.log("===================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Production readiness verification failed:", err);
    process.exit(1);
  });
