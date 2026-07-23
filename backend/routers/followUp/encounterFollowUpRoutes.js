"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/followUp/encounterFollowUpController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreateFollowUp,
  validateUpdateFollowUp,
  validateCancelFollowUp,
  validateCreateAttempt,
  validateUpdateAttempt,
  validateCompleteFollowUp,
  validateListFollowUps,
  validateScheduleAppointment,
  validateRescheduleAttempt,
  validateAutoComplete,
} = require("../../validators/followUp/encounterFollowUpValidator");

// All routes require authentication and internal account
router.use(authenticateToken, requireInternalAccount);

// ============ Follow-up CRUD ============

// Create follow-up
router.post(
  "/",
  checkPermission("followup", "create"),
  validateCreateFollowUp,
  controller.createFollowUp
);

// Get single follow-up
router.get(
  "/:id",
  checkPermission("followup", "view"),
  controller.getFollowUp
);

// Get follow-up history (includes all attempts)
router.get(
  "/:id/history",
  checkPermission("followup", "view"),
  controller.getFollowUpHistory
);

// Update follow-up
router.put(
  "/:id",
  checkPermission("followup", "update"),
  validateUpdateFollowUp,
  controller.updateFollowUp
);

// Cancel follow-up
router.post(
  "/:id/cancel",
  checkPermission("followup", "cancel"),
  validateCancelFollowUp,
  controller.cancelFollowUp
);

// Complete follow-up (convenience: finds active attempt and marks attended)
router.post(
  "/:id/complete",
  checkPermission("followup", "complete"),
  validateCompleteFollowUp,
  controller.completeFollowUp
);

// ============ Attempt-based Scheduling (one-to-many) ============

// Create a new scheduling attempt
router.post(
  "/:id/attempts",
  checkPermission("followup", "schedule"),
  validateCreateAttempt,
  controller.createAttempt
);

// List all attempts for a follow-up
router.get(
  "/:id/attempts",
  checkPermission("followup", "view"),
  controller.listAttempts
);

// Mark an attempt as missed
router.post(
  "/attempts/:attemptId/missed",
  checkPermission("followup", "update"),
  validateUpdateAttempt,
  controller.markAttemptMissed
);

// Mark an attempt as attended (completes the follow-up)
router.post(
  "/attempts/:attemptId/attended",
  checkPermission("followup", "complete"),
  validateCompleteFollowUp,
  controller.markAttemptAttended
);

// Cancel an attempt
router.post(
  "/attempts/:attemptId/cancel",
  checkPermission("followup", "schedule"),
  validateUpdateAttempt,
  controller.markAttemptCancelled
);

// ============ Phase 2.4.2 - Scheduling Workflow ============

/**
 * Schedule a follow-up appointment.
 * Creates PatientSchedule + EncounterFollowUpAttempt in one operation.
 * POST /api/follow-ups/:id/schedule-appointment
 */
router.post(
  "/:id/schedule-appointment",
  checkPermission("followup", "schedule"),
  validateScheduleAppointment,
  controller.scheduleAppointment
);

/**
 * Reschedule a missed/cancelled attempt.
 * POST /api/follow-ups/:id/reschedule/:previousAttemptId
 */
router.post(
  "/:id/reschedule/:previousAttemptId",
  checkPermission("followup", "reschedule"),
  validateRescheduleAttempt,
  controller.rescheduleAttempt
);

/**
 * List follow-ups by status (reception queue).
 * GET /api/follow-ups/queue?status=PENDING_SCHEDULING
 */
router.get(
  "/queue/list",
  checkPermission("followup", "view"),
  validateListFollowUps,
  controller.listFollowUpsByStatus
);

/**
 * Find a follow-up by schedule_id.
 * GET /api/follow-ups/by-schedule/:scheduleId
 */
router.get(
  "/by-schedule/:scheduleId",
  checkPermission("followup", "view"),
  controller.findFollowUpBySchedule
);

/**
 * Auto-complete a follow-up on patient admission.
 * POST /api/follow-ups/auto-complete
 */
router.post(
  "/auto-complete",
  checkPermission("followup", "complete"),
  validateAutoComplete,
  controller.autoCompleteFollowUp
);

/**
 * Get follow-up counts by status.
 * GET /api/follow-ups/counts
 */
router.get(
  "/counts/all",
  checkPermission("followup", "view"),
  controller.getFollowUpCounts
);

// ============ Legacy convenience endpoint ============

// Schedule follow-up (creates a new attempt; replaces old linked_schedule_id approach)
// Kept for backward compatibility but delegates to createAttempt
router.post(
  "/:id/schedule",
  checkPermission("followup", "schedule"),
  validateCreateAttempt,
  controller.scheduleFollowUp
);

// ============ Patient-scoped listing ============

// List follow-ups for a patient
router.get(
  "/patients/:patientId/follow-ups",
  checkPermission("followup", "view"),
  validateListFollowUps,
  controller.listPatientFollowUps
);

// ============ Phase 2.4.4 - Follow-up Outcome & Chain ============

const outcomeController = require("../../controllers/followUp/followUpOutcomeController");
const {
  validateCreateOutcome,
  validateUpdateOutcome,
  validateCreateNextFollowUp,
} = require("../../validators/followUp/followUpOutcomeValidator");

// Get outcome for a follow-up
router.get(
  "/:id/outcome",
  checkPermission("followup", "view"),
  outcomeController.getOutcome
);

// Create outcome for a follow-up
router.post(
  "/:id/outcome",
  checkPermission("followup", "outcome:create"),
  validateCreateOutcome,
  outcomeController.createOutcome
);

// Update outcome for a follow-up
router.put(
  "/:id/outcome/:outcomeId",
  checkPermission("followup", "outcome:update"),
  validateUpdateOutcome,
  outcomeController.updateOutcome
);

// Create next follow-up in chain
router.post(
  "/:id/create-next",
  checkPermission("followup", "continue"),
  validateCreateNextFollowUp,
  outcomeController.createNextFollowUp
);

// Get follow-up chain
router.get(
  "/:id/chain",
  checkPermission("followup", "view"),
  outcomeController.getFollowUpChain
);

// Analytics endpoint
router.get(
  "/analytics/outcomes",
  checkPermission("followup", "view"),
  outcomeController.getAnalytics
);

module.exports = router;
