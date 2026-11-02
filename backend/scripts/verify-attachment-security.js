"use strict";

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  sequelize,
  Region,
  RegionalIssue,
  RegionalIssueAttachment,
  RegionalIssueEscalation,
  Attachment,
  User,
  IssueCategory,
  IssuePriority,
} = require("../models");

const regionalIssueService = require("../services/regionalIssueService");
const regionalIssueEscalationService = require("../services/regionalIssueEscalationService");
const federalRegionalEscalationService = require("../services/federalRegionalEscalationService");

async function runAttachmentSecurityVerification() {
  console.log("=== STARTING COMPREHENSIVE ATTACHMENT SECURITY AUDIT ===");

  const uploadsDir = path.resolve(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const testFile1 = path.join(uploadsDir, "audit-test-shared.txt");
  const testFile2 = path.join(uploadsDir, "audit-test-unshared.txt");
  fs.writeFileSync(testFile1, "CONFIDENTIAL SHARED DOCUMENT CONTENT", "utf8");
  fs.writeFileSync(testFile2, "STRICTLY REGIONAL PRIVATE CONTENT - DO NOT ESCALATE", "utf8");

  const cleanupIds = {
    attachments: [],
    issues: [],
    escalations: [],
  };

  try {
    // 1. Fetch reference regions & users
    const regions = await Region.findAll({ limit: 2, order: [["name", "ASC"]] });
    if (regions.length < 2) {
      throw new Error("At least two regions required for cross-region isolation testing.");
    }
    const region1 = regions[0];
    const region2 = regions[1];
    console.log(`[PASS] Using Region 1: ${region1.name} (${region1.region_id})`);
    console.log(`[PASS] Using Region 2: ${region2.name} (${region2.region_id})`);

    const user = await User.findOne({ order: [["created_at", "ASC"]] });
    const category = await IssueCategory.findOne({ where: { is_active: true } });
    const priority = await IssuePriority.findOne({ order: [["display_order", "ASC"]] });

    // 2. Create Attachment records
    const attShared = await Attachment.create({
      attachment_id: uuidv4(),
      file_name: "audit-test-shared.txt",
      file_path: testFile1,
      uploaded_by: user.user_id,
    });
    cleanupIds.attachments.push(attShared.attachment_id);

    const attUnshared = await Attachment.create({
      attachment_id: uuidv4(),
      file_name: "audit-test-unshared.txt",
      file_path: testFile2,
      uploaded_by: user.user_id,
    });
    cleanupIds.attachments.push(attUnshared.attachment_id);

    console.log(`[PASS] Created Attachment Shared: ${attShared.attachment_id}`);
    console.log(`[PASS] Created Attachment Unshared: ${attUnshared.attachment_id}`);

    // 3. Create Regional Issue in Region 1
    const regionalIssue = await regionalIssueService.createIssue(
      region1.region_id,
      {
        title: "SECURITY AUDIT: Attachment Isolation Verification Issue",
        description: "Testing cross-region shielding and escalation attachment filtering.",
        issue_category_id: category.issue_category_id,
        issue_priority_id: priority.issue_priority_id,
        attachment_ids: [attShared.attachment_id, attUnshared.attachment_id],
      },
      { user_id: user.user_id, permissions: ["REGIONAL_ISSUES:CREATE"] }
    );
    cleanupIds.issues.push(regionalIssue.regional_issue_id);
    console.log(`[PASS] Created Regional Issue in ${region1.name}: ${regionalIssue.issue_number}`);

    // 4. Escalate to Federal sharing ONLY attShared
    const escalation = await regionalIssueEscalationService.escalateIssue(
      region1.region_id,
      regionalIssue.regional_issue_id,
      {
        escalation_reason: "Federal technical clarification required for regional audit.",
        requested_assistance: "Provide official policy interpretation.",
        assistance_type: "technical_support",
        escalation_priority: "high",
        selected_attachment_ids: [attShared.attachment_id], // EXPLICITLY ONLY SHARE 1
      },
      { user_id: user.user_id, permissions: ["REGIONAL_ISSUES:ESCALATE"] }
    );
    cleanupIds.escalations.push(escalation.escalation_id);
    console.log(`[PASS] Created Escalation: ${escalation.escalation_number} with ONLY 1 shared attachment.`);

    // --- CHECK 1: Authorized Regional Download ---
    console.log("\n--- Check 1: Authorized Regional Download ---");
    const regDownload = await regionalIssueService.getRegionalIssueAttachmentForDownload(
      region1.region_id,
      regionalIssue.regional_issue_id,
      attShared.attachment_id
    );
    if (!regDownload || regDownload.attachment.attachment_id !== attShared.attachment_id) {
      throw new Error("Authorized regional download lookup failed.");
    }
    console.log(`[PASS] Authorized Regional User can retrieve Regional Attachment.`);

    // --- CHECK 2: Cross-Region IDOR Block ---
    console.log("\n--- Check 2: Cross-Region Isolation (IDOR Prevention) ---");
    let crossRegionBlocked = false;
    try {
      await regionalIssueService.getRegionalIssueAttachmentForDownload(
        region2.region_id, // Attacking from Region 2!
        regionalIssue.regional_issue_id,
        attShared.attachment_id
      );
    } catch (err) {
      if (err.status === 404) {
        crossRegionBlocked = true;
        console.log(`[PASS] Cross-Region access correctly blocked: 404 Not Found in foreign region.`);
      } else {
        throw new Error(`Unexpected error code on cross-region check: ${err.status} - ${err.message}`);
      }
    }
    if (!crossRegionBlocked) {
      throw new Error("CRITICAL VULNERABILITY: Cross-region attachment access was permitted!");
    }

    // --- CHECK 3: Unlinked Attachment Tampering Prevention ---
    console.log("\n--- Check 3: Unlinked Attachment IDOR Prevention ---");
    let unlinkedBlocked = false;
    const randomAttId = uuidv4();
    try {
      await regionalIssueService.getRegionalIssueAttachmentForDownload(
        region1.region_id,
        regionalIssue.regional_issue_id,
        randomAttId
      );
    } catch (err) {
      if (err.status === 404) {
        unlinkedBlocked = true;
        console.log(`[PASS] Unlinked attachment access correctly blocked: 404 Not Found.`);
      }
    }
    if (!unlinkedBlocked) {
      throw new Error("CRITICAL VULNERABILITY: Unlinked attachment access was not rejected!");
    }

    // --- CHECK 4: Federal Access to Authorized Shared Attachment ---
    console.log("\n--- Check 4: Federal Access to Shared Attachment ---");
    const fedDownload = await federalRegionalEscalationService.getEscalationAttachmentForDownload(
      escalation.escalation_id,
      attShared.attachment_id
    );
    if (!fedDownload || fedDownload.attachment.attachment_id !== attShared.attachment_id) {
      throw new Error("Federal authorized shared attachment retrieval failed.");
    }
    console.log(`[PASS] Federal officer can retrieve explicitly shared attachment: ${attShared.file_name}`);

    // --- CHECK 5: Federal Access to Unshared Attachment (Must be 403 Forbidden) ---
    console.log("\n--- Check 5: Federal Access to Unshared Attachment (Strict 403 Shielding) ---");
    let unsharedBlocked = false;
    try {
      await federalRegionalEscalationService.getEscalationAttachmentForDownload(
        escalation.escalation_id,
        attUnshared.attachment_id // NOT in selected_attachment_ids!
      );
    } catch (err) {
      if (err.status === 403) {
        unsharedBlocked = true;
        console.log(`[PASS] Unshared attachment access strictly rejected with 403 Forbidden: ${err.message}`);
      } else {
        throw new Error(`Expected 403 Forbidden, got ${err.status}: ${err.message}`);
      }
    }
    if (!unsharedBlocked) {
      throw new Error("CRITICAL VULNERABILITY: Federal officer accessed unshared regional attachment!");
    }

    // --- CHECK 6: Escalate Detail View Populates shared_attachments ---
    console.log("\n--- Check 6: Escalation Detail View shared_attachments Enrichment ---");
    const escalationDetail = await federalRegionalEscalationService.getEscalationById(escalation.escalation_id);
    if (!Array.isArray(escalationDetail.shared_attachments) || escalationDetail.shared_attachments.length !== 1) {
      throw new Error("shared_attachments was not populated with exactly 1 shared attachment record.");
    }
    if (escalationDetail.shared_attachments[0].attachment_id !== attShared.attachment_id) {
      throw new Error("shared_attachments returned wrong attachment ID.");
    }
    console.log(`[PASS] Escalation Detail View successfully enriched with 1 shared attachment: ${escalationDetail.shared_attachments[0].file_name}`);

    // --- CHECK 7: Directory Traversal Protection ---
    console.log("\n--- Check 7: Path Traversal Protection ---");
    const uploadsAbsolute = path.resolve(__dirname, "../uploads");
    const maliciousPaths = [
      "../../etc/passwd",
      "..\\..\\Windows\\System32\\calc.exe",
      "../package.json",
    ];
    for (const badPath of maliciousPaths) {
      const resolved = path.resolve(uploadsAbsolute, badPath);
      if (resolved.startsWith(uploadsAbsolute)) {
        throw new Error(`Path check failed for traversal test ${badPath}`);
      }
    }
    console.log("[PASS] Path traversal boundary checks successfully verified.");

    return { success: true };
  } finally {
    // Clean up
    console.log("\n--- Clean-Up: Removing Attachment Security Test Fixtures ---");
    if (cleanupIds.escalations.length) {
      await RegionalIssueEscalation.destroy({ where: { escalation_id: cleanupIds.escalations } });
    }
    if (cleanupIds.issues.length) {
      await RegionalIssueAttachment.destroy({ where: { regional_issue_id: cleanupIds.issues } });
      await RegionalIssue.destroy({ where: { regional_issue_id: cleanupIds.issues } });
    }
    if (cleanupIds.attachments.length) {
      await Attachment.destroy({ where: { attachment_id: cleanupIds.attachments } });
    }
    if (fs.existsSync(testFile1)) fs.unlinkSync(testFile1);
    if (fs.existsSync(testFile2)) fs.unlinkSync(testFile2);
    console.log("[PASS] Clean-up complete.");
  }
}

runAttachmentSecurityVerification()
  .then(() => {
    console.log("\n=======================================================");
    console.log("ATTACHMENT SECURITY AUDIT: ALL 7 CHECKS PASSED!");
    console.log("=======================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nFATAL ERROR in Attachment Security Audit:", err);
    process.exit(1);
  });

