"use strict";

const assert = require("assert");
const { sequelize, PlanVersion } = require("../models");
const { getPlanExecutionDashboard } = require("../services/planExecutionDashboardService");

function calculatePercentiles(latencies) {
  if (!latencies.length) return { min: 0, max: 0, median: 0, p90: 0, p95: 0, p99: 0, mean: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => {
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[idx];
  };
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    mean: Number((sum / sorted.length).toFixed(2)),
    median: Number(getP(50).toFixed(2)),
    p90: Number(getP(90).toFixed(2)),
    p95: Number(getP(95).toFixed(2)),
    p99: Number(getP(99).toFixed(2)),
  };
}

async function runConcurrencyBatch(batchName, requests, concurrency) {
  console.log(`\n--- Running Stress Test: ${batchName} (${concurrency} concurrent requests) ---`);

  // Build the array of request configs to run concurrently
  const jobs = [];
  for (let i = 0; i < concurrency; i++) {
    const jobConfig = requests[i % requests.length];
    jobs.push(jobConfig);
  }

  const latencies = [];
  const errors = [];
  const batchStart = process.hrtime.bigint();

  await Promise.all(
    jobs.map(async (job, idx) => {
      const start = process.hrtime.bigint();
      try {
        await getPlanExecutionDashboard(job.req, job.query);
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        latencies.push(durationMs);
      } catch (err) {
        errors.push({ index: idx, error: err.message });
      }
    })
  );

  const batchEnd = process.hrtime.bigint();
  const totalDurationMs = Number(batchEnd - batchStart) / 1e6;
  const throughput = ((concurrency / (totalDurationMs / 1000))).toFixed(2);
  const stats = calculatePercentiles(latencies);

  console.log(`  Completed ${concurrency} requests in ${totalDurationMs.toFixed(2)} ms`);
  console.log(`  Throughput:  ${throughput} req/s`);
  console.log(`  Min Latency: ${stats.min} ms | Median (p50): ${stats.median} ms`);
  console.log(`  p90: ${stats.p90} ms | p95: ${stats.p95} ms | p99: ${stats.p99} ms | Max: ${stats.max} ms`);
  console.log(`  Errors:      ${errors.length} (${((errors.length / concurrency) * 100).toFixed(1)}%)`);

  if (errors.length > 0) {
    console.error("  Sample errors:", errors.slice(0, 3));
  }

  assert.strictEqual(errors.length, 0, `Stress batch ${batchName} encountered ${errors.length} errors!`);

  return {
    concurrency,
    totalDurationMs: Number(totalDurationMs.toFixed(2)),
    throughput: Number(throughput),
    stats,
    errors: errors.length,
  };
}

async function main() {
  console.log("===================================================================");
  console.log("=== PHASE 6: MULTI-TENANT CONCURRENCY & STRESS TEST SUITE ===");
  console.log("===================================================================");
  await sequelize.authenticate();

  // Find a master plan and its government structure to test sector access
  const masterWithGov = await PlanVersion.findOne({
    where: {
      version_kind: "master",
      review_snapshot_of_version_id: null,
      execution_snapshot_of_version_id: null,
    },
    order: [["created_at", "DESC"]],
  });

  const govStructureId = masterWithGov ? masterWithGov.government_structure_id : null;

  // Personas
  const superAdminReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000001",
      roles: ["Super Admin"],
      permissions: ["PLANS:READ", "PLANS:MANAGE"],
    },
  };

  const sectorReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000002",
      roles: ["Sector User"],
      government_structure_id: govStructureId,
      permissions: ["PLANS:READ"],
    },
  };

  const restrictedReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000099",
      roles: ["Restricted"],
      government_structure_id: "00000000-0000-0000-0000-000000000099",
      permissions: ["PLANS:READ"],
    },
  };

  // Diverse test requests mix
  const requestMix = [
    { name: "SuperAdmin-Full", req: superAdminReq, query: {} },
    { name: "SuperAdmin-Overview", req: superAdminReq, query: { section: "overview" } },
    { name: "SuperAdmin-ProgressTree", req: superAdminReq, query: { section: "progress_tree" } },
    { name: "SuperAdmin-DeptUser", req: superAdminReq, query: { section: "department_user" } },
    { name: "SectorUser-Full", req: sectorReq, query: {} },
    { name: "SectorUser-Overview", req: sectorReq, query: { section: "overview" } },
    { name: "RestrictedUser-Full", req: restrictedReq, query: {} },
  ];

  console.log(`Database: ${sequelize.config.database} on ${sequelize.config.host}:${sequelize.config.port}`);
  const pool = sequelize.connectionManager.pool;
  console.log(`Sequelize Pool: max = ${pool?.max || 10}, min = ${pool?.min || 0}, acquire = ${pool?.acquire || 30000}`);

  const results = [];

  // Concurrency 5
  results.push(await runConcurrencyBatch("Concurrency-5", requestMix, 5));

  // Concurrency 10 (Saturates pool)
  results.push(await runConcurrencyBatch("Concurrency-10 (Pool Max)", requestMix, 10));

  // Concurrency 20 (2x pool saturation, testing connection queuing)
  results.push(await runConcurrencyBatch("Concurrency-20 (2x Pool)", requestMix, 20));

  // Concurrency 30 (3x pool saturation)
  results.push(await runConcurrencyBatch("Concurrency-30 (3x Pool)", requestMix, 30));

  console.log("\n===================================================================");
  console.log("=== STRESS TEST SUMMARY TABLE ===");
  console.log("===================================================================");
  console.table(
    results.map((r) => ({
      Concurrency: r.concurrency,
      "Throughput (req/s)": r.throughput,
      "Wall Time (ms)": r.totalDurationMs,
      "Median Latency (ms)": r.stats.median,
      "p95 Latency (ms)": r.stats.p95,
      "Max Latency (ms)": r.stats.max,
      "Errors": r.errors,
    }))
  );

  console.log("\n[PASS] All concurrency stress tests completed with 0 errors!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Stress test failed:", err);
    process.exit(1);
  });
