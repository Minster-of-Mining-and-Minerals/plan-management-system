"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const pharmacyEnterpriseController = require("../../controllers/pharmacy/pharmacyEnterpriseController");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/orders/:clinicalOrderId/transition",
  checkPermission("pharmacy", "workflow_manage"),
  pharmacyEnterpriseController.transitionOrderState.bind(pharmacyEnterpriseController)
);

router.post(
  "/mar/record",
  checkPermission("pharmacy", "mar_record"),
  pharmacyEnterpriseController.recordAdministration.bind(pharmacyEnterpriseController)
);

router.get(
  "/mar/:patientId",
  checkPermission("pharmacy", "mar_record"),
  pharmacyEnterpriseController.getPatientMAR.bind(pharmacyEnterpriseController)
);

router.get(
  "/history/:patientId",
  checkPermission("pharmacy", "inventory_view"),
  pharmacyEnterpriseController.getMedicationHistory.bind(pharmacyEnterpriseController)
);

router.post(
  "/formulary/rules",
  checkPermission("pharmacy", "formulary_manage"),
  pharmacyEnterpriseController.setFormularyRule.bind(pharmacyEnterpriseController)
);

router.get(
  "/formulary/validate",
  checkPermission("pharmacy", "inventory_view"),
  pharmacyEnterpriseController.validateFormulary.bind(pharmacyEnterpriseController)
);

router.get(
  "/formulary/rules",
  checkPermission("pharmacy", "formulary_manage"),
  pharmacyEnterpriseController.listFormularyRules.bind(pharmacyEnterpriseController)
);

router.post(
  "/reconciliation/perform",
  checkPermission("pharmacy", "reconciliation_manage"),
  pharmacyEnterpriseController.performReconciliation.bind(pharmacyEnterpriseController)
);

router.get(
  "/reconciliation/:patientId",
  checkPermission("pharmacy", "reconciliation_manage"),
  pharmacyEnterpriseController.getPatientReconciliations.bind(pharmacyEnterpriseController)
);

router.get(
  "/fhir/request/:prescriptionId",
  checkPermission("pharmacy", "interoperability_view"),
  pharmacyEnterpriseController.exportFHIRMedicationRequest.bind(pharmacyEnterpriseController)
);

module.exports = router;
