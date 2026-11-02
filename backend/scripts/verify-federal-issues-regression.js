"use strict";

const {
  sequelize,
  Issue,
  IssueHistory,
  IssueCategory,
  IssuePriority,
  FormConfigContainer,
  User,
} = require("../models");

const issueService = require("../services/issueService");

async function runFederalIssuesRegression() {
  console.log("=== STARTING FEDERAL ISSUE MANAGEMENT REGRESSION SUITE ===");
  const createdIssueIds = [];

  try {
    // 1. Fetch prerequisite reference data
    const category = (await IssueCategory.findOne({
      where: { code: "general_system" },
      include: [{ model: FormConfigContainer, as: "formConfigContainers" }],
    })) || (await IssueCategory.findOne({
      where: { is_active: true },
      include: [{ model: FormConfigContainer, as: "formConfigContainers" }],
    }));
    if (!category) {
      throw new Error("Default General System Issue category not found.");
    }
    console.log(`[PASS] Found Category: ${category.name} (${category.issue_category_id})`);

    const priority = await IssuePriority.findOne({ order: [["display_order", "ASC"]] });
    if (!priority) {
      throw new Error("No issue priority found in database.");
    }
    console.log(`[PASS] Found Priority: ${priority.label} (${priority.issue_priority_id})`);

    const container = await FormConfigContainer.findOne({
      where: {
        issue_category_id: category.issue_category_id,
        is_published: true,
        is_active: true,
      },
    });
    if (!container) {
      throw new Error("No active published form container found for category.");
    }
    console.log(`[PASS] Found Form Container: ${container.name} (${container.form_config_container_id})`);

    // Fetch an admin/federal test user
    const testUser = await User.findOne({
      where: { email: "admin@gmail.com" },
    }) || await User.findOne({ order: [["created_at", "ASC"]] });
    if (!testUser) {
      throw new Error("No test user found for Federal issue regression.");
    }
    console.log(`[PASS] Using Federal Test User: ${testUser.email} (${testUser.user_id})`);

    // Fetch a second user for segregation of duties test
    const secondUser = await User.findOne({
      where: {
        user_id: { [sequelize.Sequelize.Op.ne]: testUser.user_id },
      },
    }) || testUser;

    const federalPermissions = [
      "ISSUES:CREATE",
      "ISSUES:READ",
      "ISSUES:READ_ALL",
      "ISSUES:EDIT",
      "ISSUES:REVIEW",
      "ISSUES:RESOLVE",
      "ISSUES:CLOSE",
      "ISSUES:MANAGE",
    ];

    const reviewerPermissions = [
      "ISSUES:READ",
      "ISSUES:READ_ALL",
      "ISSUES:REVIEW",
      "ISSUES:RESOLVE",
      "ISSUES:CLOSE",
    ];

    const federalUserContext = {
      userId: testUser.user_id,
      user_id: testUser.user_id,
      userPermissions: federalPermissions,
      permissions: federalPermissions,
      isSuperAdmin: true,
      roles: ["Super Admin"],
    };

    const reviewerUserContext = {
      userId: secondUser.user_id,
      user_id: secondUser.user_id,
      userPermissions: reviewerPermissions,
      permissions: reviewerPermissions,
      isSuperAdmin: true,
      roles: ["Super Admin"],
    };

    // 2. Test Create Issue
    console.log("\n--- Test 1: Federal Issue Creation ---");
    const initialCount = await Issue.count();
    const createdIssue = await issueService.createIssue(
      {
        title: "REGRESSION TEST: Federal Server Latency Verification",
        description: "Automated regression testing of federal issue lifecycle and auditing.",
        issue_category_id: category.issue_category_id,
        issue_priority_id: priority.issue_priority_id,
        form_config_container_id: container.form_config_container_id,
        form_responses: {
          impact_description: "Automated regression verification test impact",
          system_area: "Federal System Core Platform",
        },
      },
      federalUserContext.user_id,
      federalPermissions
    );
    createdIssueIds.push(createdIssue.issue_id);

    if (!createdIssue.issue_id || !createdIssue.issue_number) {
      throw new Error("Federal issue creation failed: Missing ID or issue_number.");
    }
    if (createdIssue.status !== "submitted") {
      throw new Error(`Expected status 'submitted', got '${createdIssue.status}'.`);
    }
    console.log(`[PASS] Created Federal Issue: ${createdIssue.issue_number} (Status: ${createdIssue.status})`);

    // 3. Test Read Issue by ID
    console.log("\n--- Test 2: Read Issue by ID ---");
    const fetched = await issueService.getIssueById(createdIssue.issue_id, federalUserContext);
    if (!fetched || fetched.issue_id !== createdIssue.issue_id) {
      throw new Error("Failed to retrieve federal issue by ID.");
    }
    if (!fetched.category || !fetched.priority || !fetched.raiser) {
      throw new Error("Failed to populate required associations (category, priority, raiser).");
    }
    console.log(`[PASS] Retrieved Issue: ${fetched.issue_number} with associations populated.`);

    // 4. Test Listing and Searching
    console.log("\n--- Test 3: List & Filter Federal Issues ---");
    const listResult = await issueService.listIssues(
      { search: "Server Latency", status: "submitted" },
      federalUserContext
    );
    const foundInList = (listResult.rows || []).some((i) => i.issue_id === createdIssue.issue_id);
    if (!foundInList) {
      throw new Error("Created issue not found in list with search & status filter.");
    }
    console.log(`[PASS] Listed Issues successfully. Found test issue in results.`);

    // 5. Test Dashboard Stats
    console.log("\n--- Test 4: Dashboard Stats ---");
    const stats = await issueService.getIssueDashboardStats({}, federalUserContext);
    if (typeof stats.total !== "number" || stats.total < 1) {
      throw new Error("Dashboard stats total is invalid.");
    }
    console.log(`[PASS] Federal Dashboard Stats returned total: ${stats.total}, submitted: ${stats.submitted || 0}`);

    // 6. Test Update Issue in Submitted status
    console.log("\n--- Test 5: Update Issue in Submitted Status ---");
    const updated = await issueService.updateIssue(
      createdIssue.issue_id,
      {
        title: "REGRESSION TEST: Federal Server Latency Verification (UPDATED)",
        description: "Updated description for regression test.",
        form_data: {
          impact_description: "Automated regression verification test impact (updated)",
          system_area: "Federal System Core Platform (updated)",
        },
      },
      federalUserContext.user_id,
      federalPermissions
    );
    if (!updated.title.includes("(UPDATED)")) {
      throw new Error("Federal issue update failed to change title.");
    }
    console.log(`[PASS] Updated Issue successfully: ${updated.title}`);

    // 7. Workflow: Start Review
    console.log("\n--- Test 6: Workflow Transition -> startReview ---");
    const inReview = await issueService.startReview(
      createdIssue.issue_id,
      reviewerUserContext.user_id,
      reviewerPermissions
    );
    if (inReview.status !== "under_review") {
      throw new Error(`Expected status 'under_review', got '${inReview.status}'.`);
    }
    console.log(`[PASS] Started Review: Status is now '${inReview.status}'.`);

    // 8. Workflow: Accept Issue
    console.log("\n--- Test 7: Workflow Transition -> acceptIssue ---");
    const accepted = await issueService.acceptIssue(
      createdIssue.issue_id,
      { reviewNotes: "Accepted for Federal resolution review." },
      reviewerUserContext.user_id,
      reviewerPermissions
    );
    if (accepted.status !== "accepted") {
      throw new Error(`Expected status 'accepted', got '${accepted.status}'.`);
    }
    console.log(`[PASS] Accepted Issue: Status is now '${accepted.status}'.`);

    // 9. Workflow: Resolve Issue
    console.log("\n--- Test 8: Workflow Transition -> resolveIssue ---");
    const resolved = await issueService.resolveIssue(
      createdIssue.issue_id,
      { resolutionNotes: "Latency investigated and performance cache tuned." },
      reviewerUserContext.user_id,
      reviewerPermissions
    );
    if (resolved.status !== "resolved" || !resolved.resolution_notes || !resolved.resolved_at) {
      throw new Error(`Expected status 'resolved' with resolution_notes and resolved_at timestamp.`);
    }
    console.log(`[PASS] Resolved Issue: Status is now '${resolved.status}'.`);

    // 10. Workflow: Close Issue
    console.log("\n--- Test 9: Workflow Transition -> closeIssue ---");
    const closed = await issueService.closeIssue(
      createdIssue.issue_id,
      reviewerUserContext.user_id,
      reviewerPermissions
    );
    if (closed.status !== "closed" || !closed.closed_at) {
      throw new Error(`Expected status 'closed' with closed_at timestamp.`);
    }
    console.log(`[PASS] Closed Issue: Status is now '${closed.status}'.`);

    // 11. Test Invalid Transition Protection
    console.log("\n--- Test 10: Invalid Transition Protection on Closed Issue ---");
    let caughtInvalidTransition = false;
    try {
      await issueService.startReview(
        createdIssue.issue_id,
        reviewerUserContext.user_id,
        reviewerPermissions
      );
    } catch (err) {
      caughtInvalidTransition = true;
      console.log(`[PASS] Caught expected invalid transition error: ${err.message}`);
    }
    if (!caughtInvalidTransition) {
      throw new Error("Invalid transition from 'closed' was not blocked!");
    }

    // 12. Test Rejection Workflow on second issue
    console.log("\n--- Test 11: Rejection Workflow on Second Issue ---");
    const secondIssue = await issueService.createIssue(
      {
        title: "REGRESSION TEST: Rejection Path Verification",
        description: "Automated regression testing of issue rejection path.",
        issue_category_id: category.issue_category_id,
        issue_priority_id: priority.issue_priority_id,
        form_config_container_id: container.form_config_container_id,
        form_responses: {
          impact_description: "Automated regression rejection test impact",
          system_area: "Federal System Infrastructure",
        },
      },
      federalUserContext.user_id,
      federalPermissions
    );
    createdIssueIds.push(secondIssue.issue_id);

    await issueService.startReview(
      secondIssue.issue_id,
      reviewerUserContext.user_id,
      reviewerPermissions
    );
    const rejected = await issueService.rejectIssue(
      secondIssue.issue_id,
      { rejectionReason: "Duplicate or invalid federal requirement." },
      reviewerUserContext.user_id,
      reviewerPermissions
    );
    if (rejected.status !== "rejected" || !rejected.rejection_reason) {
      throw new Error(`Expected status 'rejected' with rejection_reason, got '${rejected.status}'.`);
    }
    console.log(`[PASS] Rejected Issue: Status is now '${rejected.status}' with reason.`);

    // 13. Verify Audit History Logging
    console.log("\n--- Test 12: Audit History Verification ---");
    const historyEntries = await issueService.getIssueHistory(createdIssue.issue_id, federalUserContext);
    if (!Array.isArray(historyEntries) || historyEntries.length < 4) {
      throw new Error(`Expected at least 4 audit history entries, found ${historyEntries?.length || 0}.`);
    }
    console.log(`[PASS] Audit history contains ${historyEntries.length} logged actions.`);

    return { success: true };
  } finally {
    // 14. Controlled Clean-Up: Remove test fixtures
    console.log("\n--- Clean-Up: Removing Federal Test Fixtures ---");
    if (createdIssueIds.length > 0) {
      await IssueHistory.destroy({
        where: { issue_id: createdIssueIds },
      });
      await Issue.destroy({
        where: { issue_id: createdIssueIds },
      });
      console.log(`[PASS] Cleaned up ${createdIssueIds.length} test issues and histories.`);
    }
    const finalCount = await Issue.count();
    console.log(`[VERIFIED] Federal issues table record count: ${finalCount}`);
  }
}

runFederalIssuesRegression()
  .then(() => {
    console.log("\n=======================================================");
    console.log("FEDERAL ISSUE REGRESSION SUITE: ALL 12 CHECKS PASSED!");
    console.log("=======================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nFATAL ERROR in Federal Issue Regression Suite:", err);
    process.exit(1);
  });
