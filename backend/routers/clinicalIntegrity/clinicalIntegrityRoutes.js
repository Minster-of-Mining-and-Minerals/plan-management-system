"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const clinicalIntegrityController = require("../../controllers/clinicalIntegrity/clinicalIntegrityController");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/audit-trail",
  checkPermission("clinical", "audit_view"),
  clinicalIntegrityController.getAuditTrail.bind(clinicalIntegrityController)
);

router.get(
  "/versions/:entity_type/:entity_id",
  checkPermission("clinical", "version_history_view"),
  clinicalIntegrityController.getRecordVersions.bind(clinicalIntegrityController)
);

router.post(
  "/amendments/request",
  checkPermission("clinical", "amend_request"),
  clinicalIntegrityController.requestAmendment.bind(clinicalIntegrityController)
);

router.post(
  "/amendments/:amendmentId/review",
  checkPermission("clinical", "amend_approve"),
  clinicalIntegrityController.reviewAmendment.bind(clinicalIntegrityController)
);

router.get(
  "/amendments",
  checkPermission("clinical", "audit_view"),
  clinicalIntegrityController.getAmendments.bind(clinicalIntegrityController)
);

router.get(
  "/compliance/metrics",
  checkPermission("clinical", "audit_view"),
  clinicalIntegrityController.getComplianceMetrics.bind(clinicalIntegrityController)
);

module.exports = router;
