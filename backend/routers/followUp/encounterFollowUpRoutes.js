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

module.exports = router;