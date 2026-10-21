"use strict";

const { sequelize, User, GovernmentStructure, PlanVersion } = require("../models");
const { getPlanExecutionDashboard } = require("../services/planExecutionDashboardService");

async function runBenchmarkScenario(name, req, query, runs = 10) {
  let queryCount = 0;
  let totalQueryDurationMs = 0;

  const hookBefore = (options) => {
    queryCount++;
    if (options) {
      options._benchmarkStart = process.hrtime.bigint();
    }
  };

  const hookAfter = (options) => {
    if (options && options._benchmarkStart) {
      const dur = Number(process.hrtime.bigint() - options._benchmarkStart) / 1e6;
      totalQueryDurationMs += dur;
    }
  };

  sequelize.addHook("beforeQuery", hookBefore);
  sequelize.addHook("afterQuery", hookAfter);

  try {
    // 1. Cold run (first execution)
    queryCount = 0;
    totalQueryDurationMs = 0;
    const coldStart = process.hrtime.bigint();
    const coldData = await getPlanExecutionDashboard(req, query);
    const coldEnd = process.hrtime.bigint();
    const coldDurationMs = Number(coldEnd - coldStart) / 1e6;
    const coldQueries = queryCount;
    const coldSqlTime = totalQueryDurationMs;
    const payloadSize = Buffer.byteLength(JSON.stringify(coldData), "utf8");

    // 2. Warm runs
    const warmDurations = [];
    const warmQueries = [];
    const warmSqlTimes = [];

    for (let i = 0; i < runs; i++) {
      queryCount = 0;
      totalQueryDurationMs = 0;
      const start = process.hrtime.bigint();
      const warmData = await getPlanExecutionDashboard(req, query);
      const end = process.hrtime.bigint();
      const dur = Number(end - start) / 1e6;
      warmDurations.push(dur);
      warmQueries.push(queryCount);
      warmSqlTimes.push(totalQueryDurationMs);
    }

    warmDurations.sort((a, b) => a - b);
    const minLatency = warmDurations[0];
    const maxLatency = warmDurations[warmDurations.length - 1];
    const medianLatency =
      runs % 2 === 1
        ? warmDurations[Math.floor(runs / 2)]
        : (warmDurations[runs / 2 - 1] + warmDurations[runs / 2]) / 2;
    const medianQueries = warmQueries[Math.floor(runs / 2)];
    const medianSqlDuration = warmSqlTimes[Math.floor(runs / 2)];

    return {
      scenario: name,
      payloadBytes: payloadSize,
      cold: {
        latencyMs: Number(coldDurationMs.toFixed(2)),
        queries: coldQueries,
        sqlDurationMs: Number(coldSqlTime.toFixed(2)),
      },
      warm: {
        minMs: Number(minLatency.toFixed(2)),
        medianMs: Number(medianLatency.toFixed(2)),
        maxMs: Number(maxLatency.toFixed(2)),
        queries: medianQueries,
        sqlDurationMs: Number(medianSqlDuration.toFixed(2)),
      },
      runs,
    };
  } finally {
    sequelize.removeHook("beforeQuery", hookBefore);
    sequelize.removeHook("afterQuery", hookAfter);
  }
}

async function main() {
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

  // 1. Super Admin Request
  const superAdminReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000001",
      roles: ["Super Admin"],
      permissions: ["PLANS:READ", "PLANS:MANAGE"],
    },
  };

  // 2. Sector User Request (scoped to specific government structure)
  const sectorReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000002",
      roles: ["Sector User"],
      government_structure_id: govStructureId,
      permissions: ["PLANS:READ"],
    },
  };

  // 3. User with zero accessible plans
  const noPlansReq = {
    user: {
      user_id: "00000000-0000-0000-0000-000000000099",
      roles: ["Restricted"],
      government_structure_id: "00000000-0000-0000-0000-000000000099",
      permissions: ["PLANS:READ"],
    },
  };

  // 4. Find period version ID
  const aPeriod = await PlanVersion.findOne({
    where: { version_kind: "execution_period" },
  });
  const periodVersionId = aPeriod ? aPeriod.plan_version_id : null;

  console.log("=== STARTING PHASE 3 INDEPENDENT BENCHMARK SUITE ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Database: ${sequelize.config.database} on ${sequelize.config.host}:${sequelize.config.port}`);
  console.log(`Target Master Plan: ${masterWithGov?.draft_name || "N/A"} (${masterWithGov?.plan_version_id})`);
  console.log(`Government Structure ID: ${govStructureId}`);

  const results = [];

  // Scenario 1: Super Admin Full Dashboard
  results.push(await runBenchmarkScenario("1. Super Admin Full Dashboard", superAdminReq, {}, 10));

  // Scenario 2: Super Admin Overview Section
  results.push(await runBenchmarkScenario("2. Super Admin Section: Overview", superAdminReq, { section: "overview" }, 10));

  // Scenario 3: Super Admin Progress Tree Section
  results.push(await runBenchmarkScenario("3. Super Admin Section: Progress Tree", superAdminReq, { section: "progress_tree" }, 10));

  // Scenario 4: Super Admin Department/User Section
  results.push(await runBenchmarkScenario("4. Super Admin Section: Dept/User", superAdminReq, { section: "department_user" }, 10));

  // Scenario 5: Sector User Full Dashboard
  results.push(await runBenchmarkScenario("5. Sector User Full Dashboard", sectorReq, {}, 10));

  // Scenario 6: Status Filter - Active
  results.push(await runBenchmarkScenario("6. Filter Status: Active", superAdminReq, { status: "active" }, 10));

  // Scenario 7: Status Filter - Completed
  results.push(await runBenchmarkScenario("7. Filter Status: Completed", superAdminReq, { status: "completed" }, 10));

  // Scenario 8: Status Filter - Delayed
  results.push(await runBenchmarkScenario("8. Filter Status: Delayed", superAdminReq, { status: "delayed" }, 10));

  // Scenario 9: Selected Focus Period
  if (periodVersionId) {
    results.push(await runBenchmarkScenario("9. Selected Period Focus", superAdminReq, { period_version_id: periodVersionId }, 10));
  }

  // Scenario 10: Zero Accessible Plans
  results.push(await runBenchmarkScenario("10. Zero Accessible Plans", noPlansReq, {}, 10));

  console.log("\n=== BENCHMARK RESULTS SUMMARY ===");
  console.table(
    results.map((r) => ({
      Scenario: r.scenario,
      "Payload (KB)": (r.payloadBytes / 1024).toFixed(2),
      "Cold Latency (ms)": r.cold.latencyMs,
      "Cold Queries": r.cold.queries,
      "Warm Median (ms)": r.warm.medianMs,
      "Warm Range (ms)": `${r.warm.minMs} - ${r.warm.maxMs}`,
      "Warm Queries": r.warm.queries,
      "Warm SQL Time (ms)": r.warm.sqlDurationMs,
    }))
  );

  console.log("\n=== RAW JSON FOR FINAL REPORT ===");
  console.log(JSON.stringify(results, null, 2));

  await sequelize.close();
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
