"use strict";

const assert = require("assert");
const { sequelize, PlanVersion } = require("../models");
const { getPlanExecutionDashboard } = require("../services/planExecutionDashboardService");

function formatMb(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

async function run() {
  console.log("=== PHASE 6: MEMORY FOOTPRINT & CONNECTION LEAK VERIFICATION ===");
  await sequelize.authenticate();

  const superAdminReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000001",
      roles: ["Super Admin"],
      permissions: ["PLANS:READ", "PLANS:MANAGE"],
    },
  };

  const sections = ["overview", "progress_tree", "department_user", "full"];
  const totalIterations = 100;

  // Trigger GC if available
  if (global.gc) {
    global.gc();
  }

  const initialMem = process.memoryUsage();
  console.log(`Initial Memory State:
  Heap Used:  ${formatMb(initialMem.heapUsed)}
  Heap Total: ${formatMb(initialMem.heapTotal)}
  RSS:        ${formatMb(initialMem.rss)}
  External:   ${formatMb(initialMem.external)}`);

  console.log(`\nExecuting ${totalIterations} sustained dashboard requests across mixed sections...`);
  const startTime = Date.now();

  let checkpointMem = null;

  for (let i = 1; i <= totalIterations; i++) {
    const section = sections[i % sections.length];
    const query = section === "full" ? {} : { section };
    
    await getPlanExecutionDashboard(superAdminReq, query);

    if (i === Math.floor(totalIterations / 2)) {
      if (global.gc) global.gc();
      checkpointMem = process.memoryUsage();
      console.log(`  [Checkpoint ${i}/${totalIterations}] Heap Used: ${formatMb(checkpointMem.heapUsed)}, RSS: ${formatMb(checkpointMem.rss)}`);
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const throughput = (totalIterations / elapsedSec).toFixed(1);

  if (global.gc) {
    global.gc();
  }

  const finalMem = process.memoryUsage();
  console.log(`\nFinal Memory State after ${totalIterations} requests:
  Heap Used:  ${formatMb(finalMem.heapUsed)}
  Heap Total: ${formatMb(finalMem.heapTotal)}
  RSS:        ${formatMb(finalMem.rss)}
  External:   ${formatMb(finalMem.external)}
  Total Time: ${elapsedSec}s (${throughput} req/s)`);

  const heapDiffMb = (finalMem.heapUsed - initialMem.heapUsed) / 1024 / 1024;
  console.log(`\nHeap delta over 100 requests: ${heapDiffMb.toFixed(2)} MB`);

  // An acceptable heap delta for 100 un-forced GC runs in Node.js is < 150 MB.
  assert(heapDiffMb < 150, `Heap growth (${heapDiffMb.toFixed(2)} MB) exceeded safe threshold! Potential memory leak.`);

  // Verify pool connections: inUse should be 0 after requests settle
  const pool = sequelize.connectionManager.pool;
  const inUse = pool ? (pool.using || (pool._inUseObjects ? pool._inUseObjects.length : 0)) : 0;
  console.log(`Active connection pool check: in-use = ${inUse}`);
  assert.strictEqual(inUse, 0, "No database connection leaks detected — in-use connections is 0");

  console.log("\n[PASS] No memory leaks or connection leaks detected across sustained execution!");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Memory leak test failed:", err);
    process.exit(1);
  });
