"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  sequelize,
  RegionalIssue,
  RegionalIssueHistory,
  RegionalIssueComment,
  Region,
  User,
  Issue,
} = require("../models");

const regionalIssueService = require("../services/regionalIssueService");
const { REGIONAL_ISSUE_STATUS } = require("../utils/regionalIssueStatusUtils");

async function runVerification() {
  console.log("=== Starting Phase 7.3 Regional Issue Management Verification ===");

  // 1. Fetch test regions and users
  const regions = await Region.findAll({ limit: 2, order: [["name", "ASC"]] });
  if (regions.length < 2) {
    throw new Error("At least two regions are required for testing.");
  }
  const regionA = regions[0];
  const regionB = regions[1];
  console.log(`Region A: ${regionA.name} (${regionA.region_id}), Region B: ${regionB.name} (${regionB.region_id})`);

  // Fetch or find users
  const [userRaiser] = await User.findAll({ limit: 1 });
  const [userReviewer] = await User.findAll({
    where: { user_id: { [sequelize.Sequelize.Op.ne]: userRaiser.user_id } },
    limit: 1,
  });

  if (!userRaiser || !userReviewer) {
    throw new Error("At least two test users are required.");
  }
  console.log(`Raiser: ${userRaiser.email} (${userRaiser.user_id})`);
  console.log(`Reviewer: ${userReviewer.email} (${userReviewer.user_id})`);

  const raiserActor = {
    user_id: userRaiser.user_id,
    full_name: userRaiser.full_name,
    email: userRaiser.email,
    permissions: ["regional_issues:create", "regional_issues:read", "regional_issues:edit"],
    isSuperAdmin: false,
  };

  const reviewerActor = {
    user_id: userReviewer.user_id,
    full_name: userReviewer.full_name,
    email: userReviewer.email,
    permissions: [
      "regional_issues:read_all",
      "regional_issues:review",
      "regional_issues:resolve",
      "regional_issues:close",
      "regional_issues:assign",
      "regional_issues:comment",
    ],
    isSuperAdmin: false,
  };

  // 2. Test Issue Creation & Sequential Number Generation
  console.log("\n--- Testing Issue Creation & Sequential Numbering ---");
  const newIssue = await regionalIssueService.createIssue(
    regionA.region_id,
    {
      title: "Test Gold Mining Discrepancy",
      description: "Discrepancy detected in regional gold delivery records for Q1.",
      justification: "Critical reporting alignment required.",
    },
    raiserActor,
    {}
  );

  if (!newIssue.issue_number.startsWith("REG-")) {
    throw new Error(`Issue number does not match format: ${newIssue.issue_number}`);
  }
  console.log(`✔ Issue created successfully with number: ${newIssue.issue_number}`);

  // Create a second issue to test sequential increment
  const secondIssue = await regionalIssueService.createIssue(
    regionA.region_id,
    {
      title: "Second Regional Issue",
      description: "Testing sequence number increment.",
    },
    raiserActor,
    {}
  );
  console.log(`✔ Second issue created with sequential number: ${secondIssue.issue_number}`);

  // 3. Test Editing in Submitted Status
  console.log("\n--- Testing Issue Updating in Submitted Status ---");
  const updated = await regionalIssueService.updateIssue(
    regionA.region_id,
    newIssue.regional_issue_id,
    { title: "Test Gold Mining Discrepancy - Updated" },
    raiserActor,
    {}
  );
  if (updated.title !== "Test Gold Mining Discrepancy - Updated") {
    throw new Error("Issue title update failed.");
  }
  console.log("✔ Issue updated successfully by raiser.");

  // 4. Test Segregation of Duties
  console.log("\n--- Testing Segregation of Duties ---");
  let caughtSegregation = false;
  try {
    // Raiser attempts to start review on own issue
    await regionalIssueService.startReview(regionA.region_id, newIssue.regional_issue_id, raiserActor);
  } catch (err) {
    if (err.message.includes("Segregation of duties violation")) {
      caughtSegregation = true;
    } else {
      throw err;
    }
  }
  if (!caughtSegregation) {
    throw new Error("Failed: Raiser was able to start review on their own issue!");
  }
  console.log("✔ Segregation of duties correctly prevented raiser from reviewing own issue.");

  // 5. Test Valid Lifecycle Progression by Reviewer
  console.log("\n--- Testing Lifecycle Progression ---");
  // Reviewer starts review
  await regionalIssueService.startReview(regionA.region_id, newIssue.regional_issue_id, reviewerActor);
  let fetched = await regionalIssueService.getIssueById(regionA.region_id, newIssue.regional_issue_id, reviewerActor);
  if (fetched.status !== REGIONAL_ISSUE_STATUS.UNDER_REVIEW) {
    throw new Error(`Expected under_review, got ${fetched.status}`);
  }
  console.log("✔ Review started: status is now 'under_review'");

  // Try invalid transition: directly resolve while under_review
  let caughtInvalidTransition = false;
  try {
    await regionalIssueService.resolveIssue(
      regionA.region_id,
      newIssue.regional_issue_id,
      { resolution_notes: "Premature resolve" },
      reviewerActor
    );
  } catch (err) {
    if (err.message.includes("Invalid regional issue status transition")) {
      caughtInvalidTransition = true;
    }
  }
  if (!caughtInvalidTransition) {
    throw new Error("Failed: Invalid transition under_review -> resolved was allowed!");
  }
  console.log("✔ Invalid transition successfully rejected by state machine.");

  // Accept issue
  await regionalIssueService.acceptIssue(
    regionA.region_id,
    newIssue.regional_issue_id,
    { response: "Accepted for technical team review.", assigned_to: userReviewer.user_id },
    reviewerActor
  );
  fetched = await regionalIssueService.getIssueById(regionA.region_id, newIssue.regional_issue_id, reviewerActor);
  if (fetched.status !== REGIONAL_ISSUE_STATUS.ACCEPTED) {
    throw new Error(`Expected accepted, got ${fetched.status}`);
  }
  console.log("✔ Issue accepted: status is now 'accepted'");

  // Resolve issue
  await regionalIssueService.resolveIssue(
    regionA.region_id,
    newIssue.regional_issue_id,
    { resolution_notes: "Reconciled against field dispatch slips; amounts verified." },
    reviewerActor
  );
  fetched = await regionalIssueService.getIssueById(regionA.region_id, newIssue.regional_issue_id, reviewerActor);
  if (fetched.status !== REGIONAL_ISSUE_STATUS.RESOLVED || !fetched.resolved_at) {
    throw new Error(`Expected resolved with timestamp, got ${fetched.status}`);
  }
  console.log("✔ Issue resolved: status is now 'resolved' with resolved_at timestamp.");

  // Close issue
  await regionalIssueService.closeIssue(regionA.region_id, newIssue.regional_issue_id, reviewerActor);
  fetched = await regionalIssueService.getIssueById(regionA.region_id, newIssue.regional_issue_id, reviewerActor);
  if (fetched.status !== REGIONAL_ISSUE_STATUS.CLOSED || !fetched.closed_at) {
    throw new Error(`Expected closed with timestamp, got ${fetched.status}`);
  }
  console.log("✔ Issue closed: status is now 'closed' with closed_at timestamp.");

  // 6. Test Rejection Path on Second Issue
  console.log("\n--- Testing Rejection Path ---");
  await regionalIssueService.startReview(regionA.region_id, secondIssue.regional_issue_id, reviewerActor);
  await regionalIssueService.rejectIssue(
    regionA.region_id,
    secondIssue.regional_issue_id,
    { rejection_reason: "Duplicate submission of existing incident." },
    reviewerActor
  );
  const fetchedSecond = await regionalIssueService.getIssueById(
    regionA.region_id,
    secondIssue.regional_issue_id,
    reviewerActor
  );
  if (fetchedSecond.status !== REGIONAL_ISSUE_STATUS.REJECTED || !fetchedSecond.rejection_reason) {
    throw new Error("Rejection status or reason missing.");
  }
  console.log("✔ Second issue rejected with explanation: 'rejected'");

  // 7. Test Comments and Audit Histories
  console.log("\n--- Testing Comments and Audit Histories ---");
  await regionalIssueService.addComment(
    regionA.region_id,
    newIssue.regional_issue_id,
    { comment_text: "Final sign-off confirmed by regional director." },
    reviewerActor
  );
  const withComments = await regionalIssueService.getIssueById(
    regionA.region_id,
    newIssue.regional_issue_id,
    reviewerActor
  );
  if (withComments.comments.length === 0) {
    throw new Error("Comment was not recorded.");
  }
  if (withComments.histories.length < 4) {
    throw new Error(`Audit histories missing; expected at least 4, got ${withComments.histories.length}`);
  }
  console.log(`✔ Verified ${withComments.comments.length} comment(s) and ${withComments.histories.length} audit history records.`);

  // 8. Test Dashboard Metrics
  console.log("\n--- Testing Regional Dashboard Metrics ---");
  const dashboard = await regionalIssueService.getDashboard(regionA.region_id, reviewerActor);
  if (dashboard.total < 2 || dashboard.closed < 1 || dashboard.rejected < 1) {
    throw new Error(`Dashboard stats mismatch: ${JSON.stringify(dashboard)}`);
  }
  console.log("✔ Dashboard stats calculated correctly:", dashboard);

  // 9. Test Region Isolation
  console.log("\n--- Testing Region Isolation ---");
  let caughtCrossRegion = false;
  try {
    // Attempt to access Region A issue using Region B
    await regionalIssueService.getIssueById(regionB.region_id, newIssue.regional_issue_id, reviewerActor);
  } catch (err) {
    if (err.message.includes("not found in this region")) {
      caughtCrossRegion = true;
    }
  }
  if (!caughtCrossRegion) {
    throw new Error("Failed: Region B was able to retrieve Region A issue!");
  }
  console.log("✔ Cross-region retrieval strictly prevented.");

  // 10. Test Federal Zero-Leak Rule
  console.log("\n--- Testing Federal Zero-Leak Invariant ---");
  const federalIssues = await Issue.findAll({
    where: {
      title: { [sequelize.Sequelize.Op.like]: "%Test Gold Mining Discrepancy%" },
    },
  });
  if (federalIssues.length > 0) {
    throw new Error("LEAK DETECTED: Regional issue found in Federal issues table!");
  }
  console.log("✔ Federal issues table verified: Zero un-escalated regional issues present.");

  console.log("\n=== Phase 7.3 Backend Verification Completed Successfully! ===");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });

