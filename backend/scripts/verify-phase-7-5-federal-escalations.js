"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  sequelize,
  RegionalIssue,
  RegionalIssueEscalation,
  Region,
  User,
} = require("../models");

const regionalIssueService = require("../services/regionalIssueService");
const regionalIssueEscalationService = require("../services/regionalIssueEscalationService");
const federalRegionalEscalationService = require("../services/federalRegionalEscalationService");

async function runVerification() {
  console.log("=== Starting Phase 7.5 Federal Regional Escalation Integration Verification ===");

  const regions = await Region.findAll({ limit: 2, order: [["name", "ASC"]] });
  const regionA = regions[0];
  const regionB = regions[1];

  const [userRaiser] = await User.findAll({ limit: 1 });
  const [userFederal] = await User.findAll({
    where: { user_id: { [sequelize.Sequelize.Op.ne]: userRaiser.user_id } },
    limit: 1,
  });

  const regionalActor = {
    user_id: userRaiser.user_id,
    full_name: userRaiser.full_name,
    email: userRaiser.email,
    permissions: [
      "regional_issues:create",
      "regional_issues:read_all",
      "regional_issues:escalate",
    ],
    isSuperAdmin: false,
  };

  const federalActor = {
    user_id: userFederal.user_id,
    full_name: userFederal.full_name,
    email: userFederal.email,
    permissions: [
      "federal_regional_escalations:read_all",
      "federal_regional_escalations:assign",
      "federal_regional_escalations:review",
      "federal_regional_escalations:provide_assistance",
      "federal_regional_escalations:request_clarification",
      "federal_regional_escalations:close",
      "federal_regional_escalations:respond",
    ],
    isSuperAdmin: true,
  };

  // 1. Create 2 regional issues in Region A: 1 un-escalated, 1 escalated
  console.log("\n--- 1. Creating Regional Issues in Region A ---");
  const unescalatedIssue = await regionalIssueService.createIssue(
    regionA.region_id,
    {
      title: "Local Internal Issue (Must NOT Leak to Federal)",
      description: "Routine office supplies and diesel allocation for field inspection.",
    },
    regionalActor,
    {}
  );
  console.log(`✔ Un-escalated regional issue created: ${unescalatedIssue.issue_number}`);

  const escalatedIssue = await regionalIssueService.createIssue(
    regionA.region_id,
    {
      title: "Regional Mineral Reserve Re-assessment Request",
      description: "Discrepancy in copper ore reserve grade calculations requiring national geological survey consultation.",
    },
    regionalActor,
    {}
  );

  const escalation = await regionalIssueEscalationService.escalateIssue(
    regionA.region_id,
    escalatedIssue.regional_issue_id,
    {
      escalation_reason: "Discrepancy in copper ore grade estimation models requiring Federal verification.",
      requested_assistance: "Provide Federal Senior Geologist consultation and validate geochemical assay models.",
      assistance_type: "technical_support",
      escalation_priority: "critical",
    },
    regionalActor
  );
  console.log(`✔ Escalated issue created: ${escalatedIssue.issue_number} -> ${escalation.escalation_number}`);

  // 2. Query Federal Escalation Listing & Verify Zero-Leak
  console.log("\n--- 2. Verifying Federal Escalation Listing & Zero-Leak Invariant ---");
  const listing = await federalRegionalEscalationService.getEscalations({}, federalActor);
  const foundUnescalated = listing.data.some(
    (e) => e.regional_issue_id === unescalatedIssue.regional_issue_id
  );
  if (foundUnescalated) {
    throw new Error("LEAK DETECTED: Un-escalated regional issue found in Federal escalations listing!");
  }
  const foundEscalated = listing.data.some(
    (e) => e.escalation_id === escalation.escalation_id
  );
  if (!foundEscalated) {
    throw new Error("Failed: Explicitly escalated regional issue was NOT returned in Federal listing!");
  }
  console.log("✔ Zero-leak verified: Federal only receives explicitly escalated issues.");

  // 3. Test Region Filtering
  console.log("\n--- 3. Verifying Region Filtering ---");
  const filterA = await federalRegionalEscalationService.getEscalations(
    { region_id: regionA.region_id },
    federalActor
  );
  const filterB = await federalRegionalEscalationService.getEscalations(
    { region_id: regionB.region_id },
    federalActor
  );
  if (filterB.data.some((e) => e.region_id === regionA.region_id)) {
    throw new Error("Region filter failed: Region A records returned in Region B filter query!");
  }
  console.log(`✔ Region filtering verified: Region A returned ${filterA.data.length} escalations; Region B returned ${filterB.data.length}.`);

  // 4. Test Federal Review Workflow
  console.log("\n--- 4. Testing Federal Review Progression ---");
  // Start Federal Review
  await federalRegionalEscalationService.startFederalReview(escalation.escalation_id, federalActor);
  let detail = await federalRegionalEscalationService.getEscalationById(escalation.escalation_id);
  if (detail.escalation_status !== "under_federal_review") {
    throw new Error(`Expected under_federal_review, got ${detail.escalation_status}`);
  }
  console.log("✔ Federal review started: status is 'under_federal_review'");

  // Request Clarification
  await federalRegionalEscalationService.requestClarification(
    escalation.escalation_id,
    { clarification_text: "Please provide core sample depth logs from drill holes DH-01 through DH-04." },
    federalActor
  );
  detail = await federalRegionalEscalationService.getEscalationById(escalation.escalation_id);
  if (detail.escalation_status !== "clarification_requested") {
    throw new Error(`Expected clarification_requested, got ${detail.escalation_status}`);
  }
  console.log("✔ Clarification requested: status is 'clarification_requested'");

  // Provide Assistance
  await federalRegionalEscalationService.provideAssistance(
    escalation.escalation_id,
    {
      federal_response_summary: "National Geological Survey reviewed logs; revised geochemical cut-off grade adjusted to 0.45% Cu.",
      federal_action_taken: "Issued National Verification Memorandum NVM-2026-088.",
    },
    federalActor
  );
  detail = await federalRegionalEscalationService.getEscalationById(escalation.escalation_id);
  if (detail.escalation_status !== "assistance_provided" || !detail.federal_response_summary) {
    throw new Error("Assistance provision failed to record status or response summary.");
  }
  console.log("✔ Assistance provided: status is 'assistance_provided'");

  // Close Federal Intervention
  await federalRegionalEscalationService.closeFederalIntervention(escalation.escalation_id, federalActor);
  detail = await federalRegionalEscalationService.getEscalationById(escalation.escalation_id);
  if (detail.escalation_status !== "closed" || !detail.closed_at) {
    throw new Error("Closure failed to record status or closed_at timestamp.");
  }
  console.log("✔ Federal intervention closed: status is 'closed' with closed_at timestamp.");

  // 5. Verify Regional Lifecycle Independence
  console.log("\n--- 5. Verifying Regional Issue Lifecycle Invariant ---");
  const underlyingIssue = await RegionalIssue.findByPk(escalatedIssue.regional_issue_id);
  if (underlyingIssue.status === "closed") {
    throw new Error("SOVEREIGNTY VIOLATION: Federal closed the underlying Regional issue! Regional issue must retain its own lifecycle.");
  }
  console.log(`✔ Regional issue lifecycle preserved: Issue status is '${underlyingIssue.status}' (NOT forcibly closed by Federal).`);

  // 6. Test Dashboard Analytics
  console.log("\n--- 6. Verifying Federal Dashboard Analytics ---");
  const stats = await federalRegionalEscalationService.getDashboardStats({});
  if (stats.total < 1 || stats.closed < 1) {
    throw new Error(`Dashboard stats mismatch: ${JSON.stringify(stats)}`);
  }
  console.log("✔ Federal dashboard stats calculated correctly:", stats);

  console.log("\n=== Phase 7.5 Backend Integration Verification Completed Successfully! ===");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });

