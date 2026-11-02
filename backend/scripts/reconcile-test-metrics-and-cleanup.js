"use strict";

const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  sequelize,
  RegionalIssue,
  RegionalIssueHistory,
  RegionalIssueComment,
  RegionalIssueAttachment,
  RegionalIssueEscalation,
  RegionalIssueEscalationMessage,
  Issue,
  IssueHistory,
  Attachment,
} = require("../models");

async function countTableRecords() {
  const counts = {};
  counts.regional_issues = await RegionalIssue.count();
  counts.regional_issue_escalations = await RegionalIssueEscalation.count();
  counts.regional_issue_comments = await RegionalIssueComment.count();
  counts.regional_issue_histories = await RegionalIssueHistory.count();
  counts.regional_issue_attachments = await RegionalIssueAttachment.count();
  counts.issues = await Issue.count();
  counts.issue_histories = await IssueHistory.count();
  counts.attachments = await Attachment.count();
  return counts;
}

async function runReconciliation() {
  console.log("================================================================================");
  console.log("=== TEST RESULT RECONCILIATION & DATABASE INTEGRITY AUDIT ===");
  console.log("================================================================================\n");

  const dbName = process.env.DB_NAME || "pms";
  const environment = process.env.NODE_ENV || "development";
  console.log(`Database:    ${dbName}`);
  console.log(`Environment: ${environment}`);
  console.log(`Host/Port:   ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5433"}\n`);

  // 1. Initial State
  const initialCounts = await countTableRecords();
  console.log("Initial State in Database:");
  console.table(initialCounts);

  // 2. Clean up historical test records from prior runs
  console.log("Cleaning accumulated historical test records created during earlier development turns...");
  await RegionalIssueEscalationMessage.destroy({ where: {} });
  await RegionalIssueEscalation.destroy({ where: {} });
  await RegionalIssueComment.destroy({ where: {} });
  await RegionalIssueAttachment.destroy({ where: {} });
  await RegionalIssueHistory.destroy({ where: {} });
  await RegionalIssue.destroy({ where: {} });
  await IssueHistory.destroy({ where: {} });
  await Issue.destroy({ where: {} });

  const cleanBaselineCounts = await countTableRecords();
  console.log("\nBaseline State after Reset:");
  console.table(cleanBaselineCounts);

  const suiteRuns = [];

  function executeTrackedSuite(suiteName, scriptRelativePath) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`Running Suite: ${suiteName}`);
    console.log(`Script:        ${scriptRelativePath}`);
    console.log(`--------------------------------------------------------------------------------`);

    const scriptPath = path.resolve(__dirname, scriptRelativePath);
    const startTime = Date.now();

    const proc = spawnSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env },
      stdio: "inherit",
    });

    const executionTimeMs = Date.now() - startTime;
    const exitCode = proc.status === null ? 1 : proc.status;

    return {
      suiteName,
      script: scriptRelativePath,
      executionTimeMs,
      exitCode,
      passed: exitCode === 0,
    };
  }

  // 3. Execute Suite 1: Master 29-Step Production Readiness Acceptance Suite
  const baselineBefore29 = await countTableRecords();
  const run1 = executeTrackedSuite(
    "Master 29-Step Acceptance Suite",
    "verify-phase-7-post-audit-production-readiness.js"
  );
  const countsAfter29 = await countTableRecords();
  run1.baselineCounts = baselineBefore29;
  run1.finalCounts = countsAfter29;
  suiteRuns.push(run1);

  // 4. Execute Suite 2: Federal Issue Regression Suite
  const baselineBeforeFed = await countTableRecords();
  const run2 = executeTrackedSuite(
    "Federal Issues Regression Suite",
    "verify-federal-issues-regression.js"
  );
  const countsAfterFed = await countTableRecords();
  run2.baselineCounts = baselineBeforeFed;
  run2.finalCounts = countsAfterFed;
  suiteRuns.push(run2);

  // 5. Execute Suite 3: Comprehensive Attachment Security Matrix
  const baselineBeforeAtt = await countTableRecords();
  const run3 = executeTrackedSuite(
    "Attachment Path Security Matrix",
    "verify-attachment-path-security-matrix.js"
  );
  const countsAfterAtt = await countTableRecords();
  run3.baselineCounts = baselineBeforeAtt;
  run3.finalCounts = countsAfterAtt;
  suiteRuns.push(run3);

  // 6. Execute Suite 4: Isolated Migration Rollback & Disaster Recovery
  const baselineBeforeRollback = await countTableRecords();
  const run4 = executeTrackedSuite(
    "Isolated Migration Rollback & Disaster Recovery",
    "verify-isolated-migration-rollback-and-restore.js"
  );
  const countsAfterRollback = await countTableRecords();
  run4.baselineCounts = baselineBeforeRollback;
  run4.finalCounts = countsAfterRollback;
  suiteRuns.push(run4);

  // 7. Compilation & Summary
  console.log("\n================================================================================");
  console.log("=== FINAL RECONCILIATION SUMMARY ===");
  console.log("================================================================================\n");

  console.table(
    suiteRuns.map((r) => ({
      Suite: r.suiteName,
      "Exit Code": r.exitCode,
      "Time (s)": (r.executionTimeMs / 1000).toFixed(2),
      Status: r.passed ? "✔ PASS" : "✖ FAIL",
      "Regional Issues": r.finalCounts.regional_issues,
      "Federal Issues": r.finalCounts.issues,
      Escalations: r.finalCounts.regional_issue_escalations,
    }))
  );

  const allPassed = suiteRuns.every((r) => r.passed);
  console.log(`\nReconciliation Verdict: ${allPassed ? "100% RECONCILED & CLEAN" : "RECONCILIATION FAILED"}`);

  if (!allPassed) process.exit(1);
  process.exit(0);
}

runReconciliation().catch((err) => {
  console.error("FATAL ERROR in reconciliation:", err);
  process.exit(1);
});
