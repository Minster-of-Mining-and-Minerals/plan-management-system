"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  sequelize,
  RegionalIssue,
  RegionalIssueEscalation,
  RegionalIssueEscalationMessage,
  Region,
  User,
} = require("../models");

const regionalIssueService = require("../services/regionalIssueService");
const regionalIssueEscalationService = require("../services/regionalIssueEscalationService");

async function runVerification() {
  console.log("=== Starting Phase 7.4 Escalation Gateway Verification ===");

  const [region] = await Region.findAll({ limit: 1 });
  const [userAdmin] = await User.findAll({ limit: 1 });
  const [userBasic] = await User.findAll({
    where: { user_id: { [sequelize.Sequelize.Op.ne]: userAdmin.user_id } },
    limit: 1,
  });

  const regionalAdminActor = {
    user_id: userAdmin.user_id,
    full_name: userAdmin.full_name,
    email: userAdmin.email,
    permissions: [
      "regional_issues:create",
      "regional_issues:read_all",
      "regional_issues:escalate",
      "regional_issues:recall_escalation",
      "regional_issues:comment",
    ],
    isSuperAdmin: false,
  };

  const basicOfficerActor = {
    user_id: userBasic.user_id,
    full_name: userBasic.full_name,
    email: userBasic.email,
    permissions: ["regional_issues:create", "regional_issues:read"],
    isSuperAdmin: false,
  };

  // 1. Create a fresh regional issue
  console.log("\n--- 1. Creating Regional Issue for Escalation ---");
  const issue = await regionalIssueService.createIssue(
    region.region_id,
    {
      title: "Artisanal Gold Mining Boundary Dispute",
      description: "Border demarcation dispute between regional districts affecting gold delivery quotas.",
      justification: "Federal Geological & Survey Institute intervention required.",
    },
    regionalAdminActor,
    {}
  );
  console.log(`✔ Regional issue created: ${issue.issue_number} (status: ${issue.status}, escalation: ${issue.escalation_status})`);

  // 2. Test Unauthorized Escalation (Segregation / RBAC)
  console.log("\n--- 2. Testing RBAC: Unauthorized User Cannot Escalate ---");
  let caughtUnauthorized = false;
  try {
    await regionalIssueEscalationService.escalateIssue(
      region.region_id,
      issue.regional_issue_id,
      {
        escalation_reason: "Illegal mining activity across boundary",
        requested_assistance: "Federal survey dispatch",
      },
      basicOfficerActor
    );
  } catch (err) {
    if (err.message.includes("You do not have permission to escalate")) {
      caughtUnauthorized = true;
    }
  }
  if (!caughtUnauthorized) {
    throw new Error("Failed: User without escalation permission was able to escalate!");
  }
  console.log("✔ Unauthorized user escalation blocked with 403.");

  // 3. Test Authorized Escalation
  console.log("\n--- 3. Testing Authorized Escalation Submission ---");
  const escalation = await regionalIssueEscalationService.escalateIssue(
    region.region_id,
    issue.regional_issue_id,
    {
      escalation_reason: "Border demarcation dispute between regional districts affecting gold delivery quotas.",
      requested_assistance: "Requesting federal survey team and national cadastral mapping guidance.",
      assistance_type: "technical_support",
      escalation_priority: "high",
    },
    regionalAdminActor
  );

  if (!escalation.escalation_number.startsWith("ESC-")) {
    throw new Error(`Escalation number format invalid: ${escalation.escalation_number}`);
  }
  console.log(`✔ Escalation created successfully with reference: ${escalation.escalation_number}`);

  // Verify independent lifecycle
  const refreshedIssue = await RegionalIssue.findByPk(issue.regional_issue_id);
  if (refreshedIssue.status !== "submitted") {
    throw new Error(`Underlying issue status was altered! Expected 'submitted', got '${refreshedIssue.status}'`);
  }
  if (refreshedIssue.escalation_status !== "escalated") {
    throw new Error(`Underlying issue escalation_status expected 'escalated', got '${refreshedIssue.escalation_status}'`);
  }
  console.log("✔ Two-lifecycle invariant verified: Regional status remains 'submitted', escalation_status is 'escalated'.");

  // 4. Test Duplicate Active Escalation Prevention
  console.log("\n--- 4. Testing Duplicate Active Escalation Prevention ---");
  let caughtDuplicate = false;
  try {
    await regionalIssueEscalationService.escalateIssue(
      region.region_id,
      issue.regional_issue_id,
      {
        escalation_reason: "Second attempt",
        requested_assistance: "Another request",
      },
      regionalAdminActor
    );
  } catch (err) {
    if (err.message.includes("already has an active Federal escalation")) {
      caughtDuplicate = true;
    }
  }
  if (!caughtDuplicate) {
    throw new Error("Failed: Duplicate active escalation was allowed!");
  }
  console.log("✔ Duplicate active escalation prevented.");

  // 5. Test Communication Messages & Federal Shielding
  console.log("\n--- 5. Testing Escalation Communication & Shielding ---");
  // Regional message
  await regionalIssueEscalationService.addEscalationMessage(
    region.region_id,
    issue.regional_issue_id,
    escalation.escalation_id,
    {
      message_text: "Regional survey coordinates sent via encrypted dispatch.",
      message_type: "message",
    },
    regionalAdminActor,
    "regional"
  );

  // Federal internal note (simulating federal officer taking private note)
  await regionalIssueEscalationService.addEscalationMessage(
    null,
    issue.regional_issue_id,
    escalation.escalation_id,
    {
      message_text: "INTERNAL FEDERAL NOTE: Pending review by State Minister of Mines.",
      message_type: "assistance_notes",
      is_internal_federal_note: true,
    },
    regionalAdminActor,
    "federal"
  );

  // Regional query MUST NOT return the internal federal note!
  const regionalVisibleEscalations = await regionalIssueEscalationService.getIssueEscalations(
    region.region_id,
    issue.regional_issue_id,
    regionalAdminActor
  );
  const activeEsc = regionalVisibleEscalations[0];
  const internalNotesFound = activeEsc.messages.filter((m) => m.is_internal_federal_note);
  if (internalNotesFound.length > 0) {
    throw new Error("PRIVACY VIOLATION: Internal Federal note leaked to Regional user!");
  }
  console.log(`✔ Regional user view verified: Internal Federal notes strictly shielded (visible messages: ${activeEsc.messages.length}).`);

  // 6. Test Escalation Recall
  console.log("\n--- 6. Testing Escalation Recall ---");
  const recalled = await regionalIssueEscalationService.recallEscalation(
    region.region_id,
    issue.regional_issue_id,
    escalation.escalation_id,
    { recall_reason: "Dispute settled locally by traditional mediation council." },
    regionalAdminActor
  );
  if (recalled.escalation_status !== "recalled" || !recalled.recalled_at) {
    throw new Error("Escalation recall failed to update status or timestamp.");
  }
  const recalledIssue = await RegionalIssue.findByPk(issue.regional_issue_id);
  if (recalledIssue.escalation_status !== "none") {
    throw new Error(`Expected regional issue escalation_status 'none', got '${recalledIssue.escalation_status}'`);
  }
  console.log("✔ Escalation recall verified: Escalation status is 'recalled', regional issue reset to 'none'.");

  console.log("\n=== Phase 7.4 Escalation Gateway Verification Completed Successfully! ===");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });

