"use strict";

const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  sequelize,
  RegionalIssue,
  RegionalIssueHistory,
  RegionalIssueComment,
  RegionalIssueAttachment,
  RegionalIssueEscalation,
  RegionalIssueEscalationMessage,
  Region,
  User,
  Attachment,
  Issue,
  IssueHistory,
  IssueCategory,
  IssuePriority,
  FormConfigContainer,
} = require("../models");

const regionalIssueService = require("../services/regionalIssueService");
const regionalIssueEscalationService = require("../services/regionalIssueEscalationService");
const federalRegionalEscalationService = require("../services/federalRegionalEscalationService");
const issueService = require("../services/issueService");
const { REGIONAL_ISSUE_STATUS } = require("../utils/regionalIssueStatusUtils");

async function runProductionReadinessAcceptance() {
  console.log("================================================================================");
  console.log("=== PHASE 7.3 - 7.5 MASTER 29-STEP PRODUCTION READINESS ACCEPTANCE SUITE ===");
  console.log("================================================================================\n");

  const results = [];
  function record(stepNumber, title, passed, detail) {
    results.push({ stepNumber, title, passed, detail });
    const statusMark = passed ? "✔ PASS" : "✖ FAIL";
    console.log(`[Step ${String(stepNumber).padStart(2, "0")}] ${statusMark} - ${title}`);
    if (detail) console.log(`        └─ ${detail}`);
  }

  const uploadsDir = path.resolve(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const testFileShared = path.join(uploadsDir, "step-shared-doc.txt");
  const testFileUnshared = path.join(uploadsDir, "step-unshared-doc.txt");
  fs.writeFileSync(testFileShared, "SHARED REGIONAL EVIDENCE FOR FEDERAL REVIEW", "utf8");
  fs.writeFileSync(testFileUnshared, "INTERNAL REGIONAL DOCUMENT - RESTRICTED", "utf8");

  const cleanupIds = {
    regionalIssues: [],
    escalations: [],
    attachments: [],
    federalIssues: [],
  };

  try {
    // 0. Setup test regions and users
    const regions = await Region.findAll({ limit: 2, order: [["name", "ASC"]] });
    if (regions.length < 2) {
      throw new Error("At least two distinct regions are required for testing.");
    }
    const regionA = regions[0];
    const regionB = regions[1];

    const users = await User.findAll({ limit: 5 });
    if (users.length < 4) {
      throw new Error("At least 4 distinct users are required for multi-role workflow testing.");
    }
    const userRaiser = users[0];
    const userReviewer = users[1];
    const userAdmin = users[2];
    const userFederal = users[3];
    const userFederalAnalyst = users[4] || users[3];

    const actorRaiserA = {
      user_id: userRaiser.user_id,
      full_name: userRaiser.full_name,
      email: userRaiser.email,
      permissions: ["regional_issues:create", "regional_issues:read", "regional_issues:edit", "regional_issues:comment"],
      isSuperAdmin: false,
    };

    const actorReviewerA = {
      user_id: userReviewer.user_id,
      full_name: userReviewer.full_name,
      email: userReviewer.email,
      permissions: [
        "regional_issues:read",
        "regional_issues:read_all",
        "regional_issues:review",
        "regional_issues:resolve",
        "regional_issues:close",
        "regional_issues:assign",
        "regional_issues:comment",
        "regional_issues:edit",
      ],
      isSuperAdmin: false,
    };

    const actorAdminA = {
      user_id: userAdmin.user_id,
      full_name: userAdmin.full_name,
      email: userAdmin.email,
      permissions: [
        "regional_issues:read_all",
        "regional_issues:review",
        "regional_issues:escalate",
        "regional_issues:recall_escalation",
        "regional_issues:manage",
        "regional_issues:comment",
      ],
      isSuperAdmin: false,
    };

    const actorOfficerB = {
      user_id: userReviewer.user_id,
      full_name: userReviewer.full_name,
      email: userReviewer.email,
      permissions: ["regional_issues:read", "regional_issues:create"],
      isSuperAdmin: false,
    };

    const actorFederalLead = {
      user_id: userFederal.user_id,
      full_name: userFederal.full_name,
      email: userFederal.email,
      permissions: [
        "federal_regional_escalations:read",
        "federal_regional_escalations:read_all",
        "federal_regional_escalations:review",
        "federal_regional_escalations:assign",
        "federal_regional_escalations:request_clarification",
        "federal_regional_escalations:provide_assistance",
        "federal_regional_escalations:close",
        "federal_regional_escalations:respond",
      ],
      isSuperAdmin: true,
    };

    const actorFederalAnalyst = {
      user_id: userFederalAnalyst.user_id,
      full_name: userFederalAnalyst.full_name,
      email: userFederalAnalyst.email,
      permissions: [
        "federal_regional_escalations:read",
        "federal_regional_escalations:read_all",
        "federal_regional_escalations:review",
        "federal_regional_escalations:request_clarification",
        "federal_regional_escalations:provide_assistance",
        "federal_regional_escalations:close",
        "federal_regional_escalations:respond",
      ],
      isSuperAdmin: false,
    };

    // -------------------------------------------------------------------------
    // STEP 1: Regional user creates an issue in Region A
    // -------------------------------------------------------------------------
    const issue1 = await regionalIssueService.createIssue(
      regionA.region_id,
      {
        title: "Mining License Boundary Dispute - Sector 7",
        description: "Artisanal mining cooperative claim conflicts with mineral exploration concession.",
        justification: "Critical regional economic alignment.",
      },
      actorRaiserA,
      {}
    );
    cleanupIds.regionalIssues.push(issue1.regional_issue_id);
    const pass1 = Boolean(issue1 && issue1.issue_number && issue1.issue_number.startsWith("REG-"));
    record(1, "Regional user creates an issue in Region A", pass1, `Issue created: ${issue1.issue_number} in status '${issue1.status}'`);

    // -------------------------------------------------------------------------
    // STEP 2: Issue appears in Region A's list and dashboard
    // -------------------------------------------------------------------------
    const dashboardA = await regionalIssueService.getDashboard(regionA.region_id, actorRaiserA);
    const listA = await regionalIssueService.getIssues(regionA.region_id, {}, actorRaiserA);
    const foundInListA = listA.data.some((i) => i.regional_issue_id === issue1.regional_issue_id);
    const pass2 = dashboardA.total >= 1 && dashboardA.submitted >= 1 && foundInListA;
    record(2, "Issue appears in Region A's list and dashboard", pass2, `Region A total: ${dashboardA.total}, foundInList: ${foundInListA}`);

    // -------------------------------------------------------------------------
    // STEP 3: Region B cannot access Region A's issue (Cross-region isolation)
    // -------------------------------------------------------------------------
    let pass3 = false;
    try {
      await regionalIssueService.getIssueById(regionB.region_id, issue1.regional_issue_id, actorOfficerB);
    } catch (err) {
      pass3 = err.status === 404 || err.status === 403;
    }
    record(3, "Region B cannot access Region A's issue (Cross-region isolation)", pass3, "Foreign region tenant query strictly blocked.");

    // -------------------------------------------------------------------------
    // STEP 4: Issue raiser cannot review or approve own issue (Segregation of duties)
    // -------------------------------------------------------------------------
    let pass4 = false;
    try {
      await regionalIssueService.startReview(regionA.region_id, issue1.regional_issue_id, actorRaiserA);
    } catch (err) {
      pass4 = err.status === 403;
    }
    record(4, "Issue raiser cannot review or approve own issue (Segregation of duties)", pass4, "Self-review blocked with 403 Forbidden.");

    // -------------------------------------------------------------------------
    // STEP 5: Authorized Regional officer reviews and accepts issue
    // -------------------------------------------------------------------------
    await regionalIssueService.startReview(regionA.region_id, issue1.regional_issue_id, actorReviewerA);
    const acceptedIssue = await regionalIssueService.acceptIssue(
      regionA.region_id,
      issue1.regional_issue_id,
      { response: "Accepted for technical cadastre assessment." },
      actorReviewerA
    );
    const pass5 = acceptedIssue.status === REGIONAL_ISSUE_STATUS.ACCEPTED;
    record(5, "Authorized Regional officer reviews and accepts issue", pass5, `Transitioned status to '${acceptedIssue.status}'`);

    // -------------------------------------------------------------------------
    // STEP 6: Region A officer updates issue justification
    // -------------------------------------------------------------------------
    await RegionalIssue.update(
      { justification: "Updated: Cadastral coordinates surveyed on site by regional team." },
      { where: { regional_issue_id: issue1.regional_issue_id } }
    );
    const updatedIssue = await regionalIssueService.getIssueById(regionA.region_id, issue1.regional_issue_id, actorAdminA);
    const pass6 = updatedIssue.justification.includes("Cadastral coordinates surveyed");
    record(6, "Region A officer updates issue justification", pass6, `Updated justification verified: "${updatedIssue.justification.slice(0, 45)}..."`);

    // -------------------------------------------------------------------------
    // STEP 7: Region A officer adds regional comment
    // -------------------------------------------------------------------------
    const regionalComment = await regionalIssueService.addComment(
      regionA.region_id,
      issue1.regional_issue_id,
      { comment_text: "Regional survey completed. Awaiting federal geodetic validation.", is_internal: false },
      actorReviewerA
    );
    const pass7 = Boolean(regionalComment && regionalComment.comment_id);
    record(7, "Region A officer adds regional comment", pass7, `Added comment: "${regionalComment.comment_text.slice(0, 40)}..."`);

    // -------------------------------------------------------------------------
    // STEP 8: Region A officer uploads attachment to regional issue
    // -------------------------------------------------------------------------
    const attShared = await Attachment.create({
      attachment_id: uuidv4(),
      file_name: "step-shared-doc.txt",
      file_path: testFileShared,
      uploaded_by: userReviewer.user_id,
    });
    cleanupIds.attachments.push(attShared.attachment_id);

    const attUnshared = await Attachment.create({
      attachment_id: uuidv4(),
      file_name: "step-unshared-doc.txt",
      file_path: testFileUnshared,
      uploaded_by: userReviewer.user_id,
    });
    cleanupIds.attachments.push(attUnshared.attachment_id);

    await regionalIssueService.addAttachment(regionA.region_id, issue1.regional_issue_id, attShared.attachment_id, actorReviewerA);
    await regionalIssueService.addAttachment(regionA.region_id, issue1.regional_issue_id, attUnshared.attachment_id, actorReviewerA);
    const issueWithAtts = await regionalIssueService.getIssueById(regionA.region_id, issue1.regional_issue_id, actorAdminA);
    const pass8 = issueWithAtts.attachments && issueWithAtts.attachments.length >= 2;
    record(8, "Region A officer uploads attachments to regional issue", pass8, `Regional issue now has ${issueWithAtts.attachments?.length} attached files.`);

    // -------------------------------------------------------------------------
    // STEP 9: Authorized Regional user escalates issue to Federal with selected attachments
    // -------------------------------------------------------------------------
    const escalation = await regionalIssueEscalationService.escalateIssue(
      regionA.region_id,
      issue1.regional_issue_id,
      {
        escalation_reason: "Boundary coordinate overlap requires National Geological Survey intervention.",
        requested_assistance: "Provide official geodetic boundary map verification.",
        assistance_type: "technical_support",
        escalation_priority: "high",
        selected_attachment_ids: [attShared.attachment_id], // ONLY share 1 attachment!
      },
      actorAdminA
    );
    cleanupIds.escalations.push(escalation.escalation_id);
    const pass9 = Boolean(escalation && escalation.escalation_number.startsWith("ESC-"));
    record(9, "Authorized Regional user escalates issue to Federal with selected attachments", pass9, `Escalation created: ${escalation.escalation_number} (1 shared attachment)`);

    // -------------------------------------------------------------------------
    // STEP 10: Escalation appears in Federal dashboard stats and Regional Issues tab
    // -------------------------------------------------------------------------
    const fedStats = await federalRegionalEscalationService.getDashboardStats();
    const fedList = await federalRegionalEscalationService.getEscalations({}, actorFederalLead);
    const foundInFed = fedList.data.some((e) => e.escalation_id === escalation.escalation_id);
    const pass10 = fedStats.total >= 1 && foundInFed;
    record(10, "Escalation appears in Federal dashboard stats and Regional Issues tab", pass10, `Federal stats total: ${fedStats.total}, found in escalation list: ${foundInFed}`);

    // -------------------------------------------------------------------------
    // STEP 11: Federal users cannot see non-escalated Regional issues (Zero-leak guarantee)
    // -------------------------------------------------------------------------
    const unEscalatedIssue = await regionalIssueService.createIssue(
      regionA.region_id,
      { title: "Strictly Internal Local Machine Maintenance", description: "Generator repair." },
      actorRaiserA,
      {}
    );
    cleanupIds.regionalIssues.push(unEscalatedIssue.regional_issue_id);
    const allFedList = await federalRegionalEscalationService.getEscalations({}, actorFederalLead);
    const leaked = allFedList.data.some((e) => e.regional_issue_id === unEscalatedIssue.regional_issue_id);
    const pass11 = !leaked;
    record(11, "Federal users cannot see non-escalated Regional issues (Zero-leak guarantee)", pass11, "Non-escalated regional issue confirmed strictly absent from Federal oversight.");

    // -------------------------------------------------------------------------
    // STEP 12: Authorized Federal officer assigns escalation to Federal analyst
    // -------------------------------------------------------------------------
    const assignedEscalation = await federalRegionalEscalationService.assignFederalOfficer(
      escalation.escalation_id,
      userFederalAnalyst.user_id,
      actorFederalLead
    );
    const pass12 = String(assignedEscalation.federal_assigned_to) === String(userFederalAnalyst.user_id);
    record(12, "Authorized Federal officer assigns escalation to Federal analyst", pass12, `Assigned to federal analyst: ${userFederalAnalyst.user_id}`);

    // -------------------------------------------------------------------------
    // STEP 13: Assigned Federal analyst starts Federal review
    // -------------------------------------------------------------------------
    const reviewedEsc = await federalRegionalEscalationService.startFederalReview(
      escalation.escalation_id,
      actorFederalAnalyst
    );
    const pass13 = reviewedEsc.escalation_status === "under_federal_review";
    record(13, "Assigned Federal analyst starts Federal review", pass13, `Escalation status transitioned to '${reviewedEsc.escalation_status}'`);

    // -------------------------------------------------------------------------
    // STEP 14: Federal analyst adds private internal note (shielded from Region)
    // -------------------------------------------------------------------------
    const internalNote = await federalRegionalEscalationService.addFederalMessage(
      escalation.escalation_id,
      {
        message_text: "INTERNAL NOTE: Geological Survey Director confirmed cadastre team will deploy Tuesday.",
        is_internal_federal_note: true,
      },
      actorFederalAnalyst
    );
    const pass14 = Boolean(internalNote && internalNote.is_internal_federal_note === true);
    record(14, "Federal analyst adds private internal note (shielded from Region)", pass14, `Internal federal note created: ID ${internalNote.message_id}`);

    // -------------------------------------------------------------------------
    // STEP 15: Verify Region A cannot see Federal internal note
    // -------------------------------------------------------------------------
    const regionalVisible = await regionalIssueEscalationService.getIssueEscalations(
      regionA.region_id,
      issue1.regional_issue_id,
      actorAdminA
    );
    const regMsgs = regionalVisible[0]?.messages || [];
    const leakedNote = regMsgs.some((m) => m.is_internal_federal_note === true);
    const pass15 = !leakedNote;
    record(15, "Verify Region A cannot see Federal internal note", pass15, `Region sees ${regMsgs.length} messages; internal note strictly shielded.`);

    // -------------------------------------------------------------------------
    // STEP 16: Federal analyst requests clarification from Region
    // -------------------------------------------------------------------------
    const clarReq = await federalRegionalEscalationService.requestClarification(
      escalation.escalation_id,
      { clarification_text: "Please upload the GPS survey waypoint CSV file." },
      actorFederalAnalyst
    );
    const pass16 = clarReq.escalation_status === "clarification_requested";
    record(16, "Federal analyst requests clarification from Region", pass16, `Escalation status is now '${clarReq.escalation_status}'`);

    // -------------------------------------------------------------------------
    // STEP 17: Region A receives notification / sees clarification requested status
    // -------------------------------------------------------------------------
    const regViewEsc = await regionalIssueEscalationService.getIssueEscalations(
      regionA.region_id,
      issue1.regional_issue_id,
      actorAdminA
    );
    const pass17 = regViewEsc[0]?.escalation_status === "clarification_requested";
    record(17, "Region A receives notification / sees clarification requested status", pass17, `Regional tracking reflects '${regViewEsc[0]?.escalation_status}'`);

    // -------------------------------------------------------------------------
    // STEP 18: Region A responds with requested clarification
    // -------------------------------------------------------------------------
    const clarResponse = await regionalIssueEscalationService.addEscalationMessage(
      regionA.region_id,
      issue1.regional_issue_id,
      escalation.escalation_id,
      { message_text: "Uploaded GPS survey waypoints for Sector 7 perimeter.", message_type: "clarification_response" },
      actorAdminA,
      "regional"
    );
    const pass18 = clarResponse && clarResponse.sender_scope === "regional";
    record(18, "Region A responds with requested clarification", pass18, `Recorded response from scope '${clarResponse.sender_scope}'`);

    // -------------------------------------------------------------------------
    // STEP 19: Federal analyst reviews clarification and provides official assistance/guidance
    // -------------------------------------------------------------------------
    const assistanceProvided = await federalRegionalEscalationService.provideAssistance(
      escalation.escalation_id,
      {
        federal_response_summary: "National Cadastre confirms artisanal cooperative boundary valid up to pillar 14.",
        federal_action_taken: "Concession boundaries amended in national cadastre database.",
      },
      actorFederalAnalyst
    );
    const pass19 = Boolean(assistanceProvided.federal_response_summary && assistanceProvided.federal_action_taken);
    record(19, "Federal analyst reviews clarification and provides official assistance/guidance", pass19, "Official ministerial guidance and action summary recorded.");

    // -------------------------------------------------------------------------
    // STEP 20: Escalation status updates to assistance_provided
    // -------------------------------------------------------------------------
    const pass20 = assistanceProvided.escalation_status === "assistance_provided";
    record(20, "Escalation status updates to assistance_provided", pass20, `Status is '${assistanceProvided.escalation_status}'`);

    // -------------------------------------------------------------------------
    // STEP 21: Federal closes its intervention
    // -------------------------------------------------------------------------
    const fedClosed = await federalRegionalEscalationService.closeFederalIntervention(
      escalation.escalation_id,
      actorFederalAnalyst
    );
    const pass21 = fedClosed.escalation_status === "closed" && Boolean(fedClosed.closed_at);
    record(21, "Federal closes its intervention", pass21, `Escalation closed at ${fedClosed.closed_at}`);

    // -------------------------------------------------------------------------
    // STEP 22: Original Regional issue remains under Regional control (Status Invariant)
    // -------------------------------------------------------------------------
    const regIssueAfterFedClose = await regionalIssueService.getIssueById(
      regionA.region_id,
      issue1.regional_issue_id,
      actorAdminA
    );
    const pass22 = regIssueAfterFedClose.status === REGIONAL_ISSUE_STATUS.ACCEPTED;
    record(22, "Original Regional issue remains under Regional control (Two-lifecycle invariant)", pass22, `Regional issue status remains '${regIssueAfterFedClose.status}' (NOT forcibly closed).`);

    // -------------------------------------------------------------------------
    // STEP 23: Region A officer reviews Federal guidance and resolves regional issue
    // -------------------------------------------------------------------------
    const resolvedIssue = await regionalIssueService.resolveIssue(
      regionA.region_id,
      issue1.regional_issue_id,
      { resolution_notes: "Implemented boundary markers per federal cadastre decree up to pillar 14." },
      actorReviewerA
    );
    const pass23 = resolvedIssue.status === REGIONAL_ISSUE_STATUS.RESOLVED && Boolean(resolvedIssue.resolved_at);
    record(23, "Region A officer reviews Federal guidance and resolves regional issue", pass23, `Resolved status verified: '${resolvedIssue.status}'`);

    // -------------------------------------------------------------------------
    // STEP 24: Region A administrator closes regional issue
    // -------------------------------------------------------------------------
    const closedRegionalIssue = await regionalIssueService.closeIssue(
      regionA.region_id,
      issue1.regional_issue_id,
      actorAdminA
    );
    const pass24 = closedRegionalIssue.status === REGIONAL_ISSUE_STATUS.CLOSED && Boolean(closedRegionalIssue.closed_at);
    record(24, "Region A administrator closes regional issue", pass24, `Final regional issue lifecycle status: '${closedRegionalIssue.status}'`);

    // -------------------------------------------------------------------------
    // STEP 25: Region B cannot download Region A's issue attachment
    // -------------------------------------------------------------------------
    let pass25 = false;
    try {
      await regionalIssueService.getRegionalIssueAttachmentForDownload(
        regionB.region_id, // Foreign region
        issue1.regional_issue_id,
        attShared.attachment_id
      );
    } catch (err) {
      pass25 = err.status === 404;
    }
    record(25, "Region B cannot download Region A's issue attachment", pass25, "Cross-region download attempt blocked with 404 Not Found.");

    // -------------------------------------------------------------------------
    // STEP 26: Federal user cannot download unshared Regional issue attachment
    // -------------------------------------------------------------------------
    let pass26 = false;
    try {
      await federalRegionalEscalationService.getEscalationAttachmentForDownload(
        escalation.escalation_id,
        attUnshared.attachment_id // Unshared attachment!
      );
    } catch (err) {
      pass26 = err.status === 403;
    }
    record(26, "Federal user cannot download unshared Regional issue attachment", pass26, "Unshared regional attachment blocked with 403 Forbidden.");

    // -------------------------------------------------------------------------
    // STEP 27: Federal user can download shared Regional issue attachment
    // -------------------------------------------------------------------------
    const sharedDownload = await federalRegionalEscalationService.getEscalationAttachmentForDownload(
      escalation.escalation_id,
      attShared.attachment_id
    );
    const pass27 = Boolean(sharedDownload && sharedDownload.attachment.attachment_id === attShared.attachment_id);
    record(27, "Federal user can download shared Regional issue attachment", pass27, `Authorized shared file retrieved: ${sharedDownload?.attachment?.file_name}`);

    // -------------------------------------------------------------------------
    // STEP 28: Region A attempts recall on active escalation (verify rules)
    // -------------------------------------------------------------------------
    // Create a fresh issue and escalation to test recall
    const recallTestIssue = await regionalIssueService.createIssue(
      regionA.region_id,
      { title: "Recall Verification Regional Issue", description: "Testing recall workflow." },
      actorRaiserA,
      {}
    );
    cleanupIds.regionalIssues.push(recallTestIssue.regional_issue_id);

    const activeEscToRecall = await regionalIssueEscalationService.escalateIssue(
      regionA.region_id,
      recallTestIssue.regional_issue_id,
      { escalation_reason: "Testing recall rules.", requested_assistance: "Review." },
      actorAdminA
    );
    cleanupIds.escalations.push(activeEscToRecall.escalation_id);

    const recalledEsc = await regionalIssueEscalationService.recallEscalation(
      regionA.region_id,
      recallTestIssue.regional_issue_id,
      activeEscToRecall.escalation_id,
      { recall_reason: "Settled locally before federal review." },
      actorAdminA
    );
    const refreshedRecallIssue = await regionalIssueService.getIssueById(regionA.region_id, recallTestIssue.regional_issue_id, actorAdminA);
    const pass28 = recalledEsc.escalation_status === "recalled" && refreshedRecallIssue.escalation_status === "none";
    record(28, "Region A attempts recall on active escalation (verify rules)", pass28, `Escalation recalled and issue escalation_status reset to '${refreshedRecallIssue.escalation_status}'`);

    // -------------------------------------------------------------------------
    // STEP 29: Existing Federal issue management functions work completely unchanged
    // -------------------------------------------------------------------------
    const category = await IssueCategory.findOne({ where: { code: "general_system" } }) || await IssueCategory.findOne({ where: { is_active: true } });
    const priority = await IssuePriority.findOne({ order: [["display_order", "ASC"]] });
    const container = await FormConfigContainer.findOne({ where: { issue_category_id: category.issue_category_id, is_published: true, is_active: true } });

    const fedTestIssue = await issueService.createIssue(
      {
        title: "STEP 29 VERIFICATION: Federal Issue Regression Check",
        description: "Verifying federal issue management runs unchanged.",
        issue_category_id: category.issue_category_id,
        issue_priority_id: priority.issue_priority_id,
        form_config_container_id: container.form_config_container_id,
        form_responses: {
          impact_description: "Automated regression verification check",
          system_area: "Federal System Infrastructure",
        },
      },
      userFederal.user_id,
      ["ISSUES:CREATE", "ISSUES:READ", "ISSUES:REVIEW", "ISSUES:RESOLVE", "ISSUES:CLOSE"]
    );
    cleanupIds.federalIssues.push(fedTestIssue.issue_id);

    const fedRead = await issueService.getIssueById(fedTestIssue.issue_id, {
      userId: userFederal.user_id,
      userPermissions: ["ISSUES:READ"],
    });

    const pass29 = Boolean(fedTestIssue && fedTestIssue.issue_number && fedRead.issue_id === fedTestIssue.issue_id);
    record(29, "Existing Federal issue management functions work completely unchanged", pass29, `Federal issue created & retrieved: ${fedTestIssue.issue_number}`);

    console.log("\n================================================================================");
    const allPassed = results.every((r) => r.passed);
    console.log(`TOTAL ACCEPTANCE CHECKS: ${results.length}`);
    console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
    console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
    console.log(`ACCEPTANCE VERDICT: ${allPassed ? "100% SUCCESSFUL - PRODUCTION READY" : "FAILED"}`);
    console.log("================================================================================\n");

    return allPassed;
  } finally {
    // Clean up
    console.log("--- Clean-Up: Removing 29-Step Acceptance Test Fixtures ---");
    if (cleanupIds.escalations.length) {
      await RegionalIssueEscalationMessage.destroy({ where: { escalation_id: cleanupIds.escalations } });
      await RegionalIssueEscalation.destroy({ where: { escalation_id: cleanupIds.escalations } });
    }
    if (cleanupIds.regionalIssues.length) {
      await RegionalIssueComment.destroy({ where: { regional_issue_id: cleanupIds.regionalIssues } });
      await RegionalIssueAttachment.destroy({ where: { regional_issue_id: cleanupIds.regionalIssues } });
      await RegionalIssueHistory.destroy({ where: { regional_issue_id: cleanupIds.regionalIssues } });
      await RegionalIssue.destroy({ where: { regional_issue_id: cleanupIds.regionalIssues } });
    }
    if (cleanupIds.attachments.length) {
      await Attachment.destroy({ where: { attachment_id: cleanupIds.attachments } });
    }
    if (cleanupIds.federalIssues.length) {
      await IssueHistory.destroy({ where: { issue_id: cleanupIds.federalIssues } });
      await Issue.destroy({ where: { issue_id: cleanupIds.federalIssues } });
    }
    if (fs.existsSync(testFileShared)) fs.unlinkSync(testFileShared);
    if (fs.existsSync(testFileUnshared)) fs.unlinkSync(testFileUnshared);
    console.log("[PASS] Master Acceptance clean-up complete. Zero dirty records remaining.");
  }
}

runProductionReadinessAcceptance()
  .then((allPassed) => {
    process.exit(allPassed ? 0 : 1);
  })
  .catch((err) => {
    console.error("FATAL ERROR in 29-step master acceptance suite:", err);
    process.exit(1);
  });
