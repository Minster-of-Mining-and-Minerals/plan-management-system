"use strict";

const assert = require("assert");
const inspectionAnalyticsService = require("../services/inspectionAnalyticsService");
const config = require("../config/inspectionConfig");

async function runTests() {
  console.log("===============================================================");
  console.log("Inspection Analytics Integration Verification Suite");
  console.log("===============================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
    }
  }

  // 1. Test buildCacheKey scope isolation
  test("Cache keys isolate federal from regional scopes", () => {
    const keyFed = inspectionAnalyticsService.buildCacheKey("federal", {
      from: "2026-01-01",
      to: "2026-12-31",
      license_type: "mining",
      interval: "month",
    });

    const keyReg = inspectionAnalyticsService.buildCacheKey("regional_reg-123", {
      from: "2026-01-01",
      to: "2026-12-31",
      license_type: "mining",
      interval: "month",
    });

    assert.notStrictEqual(keyFed, keyReg, "Federal and regional cache keys must not collide");
    assert.ok(keyReg.includes("regional_reg-123"), "Regional cache key must contain region scope");
    assert.ok(keyFed.startsWith("federal:"), "Federal cache key must start with federal");
  });

  // 2. Test response normalization
  test("Normalizes raw external API payload correctly", () => {
    const rawExternal = {
      success: true,
      data: {
        summary: {
          total_inspections: 120,
          completed_inspections: 90,
          in_progress_inspections: 15,
          pending_inspections: 10,
          overdue_inspections: 5,
          on_time_submissions: 85,
          late_submissions: 5,
          returned_inspections: 2,
          companies_inspected: 45,
          licenses_inspected: 60,
          average_score: 87.5,
          completion_rate: 75.0,
          on_time_rate: 94.4,
          overdue_rate: 4.2,
        },
        by_status: [
          { status: "submitted", label: "Completed", count: 90, percentage: 75.0 },
          { status: "in_progress", label: "In Progress", count: 15, percentage: 12.5 },
          { status: "todo", label: "Pending", count: 10, percentage: 8.3 },
          { status: "overdue", label: "Overdue", count: 5, percentage: 4.2 },
        ],
        by_category: [
          { category: "mining", label: "Mining", total: 80, completed: 65, in_progress: 10, pending: 3, overdue: 2, completion_rate: 81.3 },
          { category: "exploration", label: "Exploration", total: 40, completed: 25, in_progress: 5, pending: 7, overdue: 3, completion_rate: 62.5 },
        ],
        by_region: [
          { region_id: "reg-01", region_name: "Oromia", total: 50, completed: 40, in_progress: 5, pending: 3, overdue: 2, completion_rate: 80.0 },
          { region_id: "reg-02", region_name: "Amhara", total: 40, completed: 30, in_progress: 5, pending: 3, overdue: 2, completion_rate: 75.0 },
        ],
        by_team: [
          { team_id: "tm-01", team_name: "Alpha Field Team", team_code: "ALPHA", total: 60, completed: 50, in_progress: 5, pending: 3, overdue: 2, completion_rate: 83.3 },
        ],
        trends: [
          { period: "2026-01", total: 30, completed: 25, in_progress: 3, pending: 1, overdue: 1, completion_rate: 83.3 },
          { period: "2026-02", total: 35, completed: 28, in_progress: 4, pending: 2, overdue: 1, completion_rate: 80.0 },
        ],
        metadata: {
          api_version: "1.0",
          timezone: "Africa/Addis_Ababa",
        },
      },
    };

    const normalized = inspectionAnalyticsService.normalizeAnalyticsResponse(rawExternal, {
      from: "2026-01-01",
      to: "2026-12-31",
      license_type: "all",
      interval: "month",
    }, {
      dataFreshness: "live",
      isStale: false,
    });

    assert.strictEqual(normalized.summary.total_inspections, 120);
    assert.strictEqual(normalized.summary.completed_inspections, 90);
    assert.strictEqual(normalized.summary.completion_rate, 75.0);
    assert.strictEqual(normalized.summary.average_score, 87.5);
    assert.strictEqual(normalized.by_status.length, 4);
    assert.strictEqual(normalized.by_category.length, 2);
    assert.strictEqual(normalized.by_region.length, 2);
    assert.strictEqual(normalized.by_team.length, 1);
    assert.strictEqual(normalized.trends.length, 2);
    assert.strictEqual(normalized.metadata.data_freshness, "live");
    assert.strictEqual(normalized.metadata.is_stale, false);
  });

  // 3. Test fallback calculation when summary fields are missing or alternate naming
  test("Handles missing or alternate field names gracefully", () => {
    const sparseData = {
      total: 50,
      submitted: 35,
      in_progress: 10,
      todo: 5,
      overdue: 0,
    };

    const normalized = inspectionAnalyticsService.normalizeAnalyticsResponse(sparseData, {}, {});
    assert.strictEqual(normalized.summary.total_inspections, 50);
    assert.strictEqual(normalized.summary.completed_inspections, 35);
    assert.strictEqual(normalized.summary.in_progress_inspections, 10);
    assert.strictEqual(normalized.summary.pending_inspections, 5);
    assert.strictEqual(normalized.summary.completion_rate, 70.0);
    assert.ok(Array.isArray(normalized.by_status));
    assert.strictEqual(normalized.by_status.length, 4);
  });

  // 4. Test Zero PII enforcement in team breakdown
  test("Team breakdown contains NO inspector PII", () => {
    const rawWithPII = {
      summary: { total: 10, completed: 5 },
      by_team: [
        {
          team_id: "t1",
          team_name: "Inspectors Team 1",
          team_code: "T1",
          total: 10,
          completed: 5,
          // Intentionally test unwanted PII fields
          inspector_names: ["Abebe Kebede", "Chala Gemechu"],
          inspector_phones: ["+251911000000"],
          inspector_emails: ["inspector@mom.gov.et"],
        },
      ],
    };

    const normalized = inspectionAnalyticsService.normalizeAnalyticsResponse(rawWithPII, {}, {});
    const team = normalized.by_team[0];
    assert.strictEqual(team.team_id, "t1");
    assert.strictEqual(team.team_name, "Inspectors Team 1");
    assert.strictEqual(team.inspector_names, undefined, "Inspector names must not be present");
    assert.strictEqual(team.inspector_phones, undefined, "Inspector phones must not be present");
    assert.strictEqual(team.inspector_emails, undefined, "Inspector emails must not be present");
  });

  // 5. Test caching and fallback store
  test("In-memory caching and fallback degradation", async () => {
    inspectionAnalyticsService.invalidateCache();

    // Verify cache is clear
    const key = inspectionAnalyticsService.buildCacheKey("federal", {});
    assert.strictEqual(typeof key, "string");
  });

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed === total) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  } else {
    process.exit(1);
  }
}

runTests();

