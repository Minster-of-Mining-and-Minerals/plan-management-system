"use strict";

const express = require("express");
const router = express.Router();
const laboratoryController = require("../controllers/laboratoryController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/tests",
  checkPermission("laboratory", "process"),
  laboratoryController.createTestCatalog.bind(laboratoryController)
);

router.get(
  "/tests",
  checkPermission("laboratory", "view"),
  laboratoryController.listTestCatalog.bind(laboratoryController)
);

router.post(
  "/orders/:orderId/items",
  checkPermission("laboratory", "process"),
  laboratoryController.addTestItems.bind(laboratoryController)
);

router.post(
  "/orders/:orderId/specimen",
  checkPermission("laboratory", "collect"),
  laboratoryController.createSpecimen.bind(laboratoryController)
);

router.patch(
  "/specimens/:id/collect",
  checkPermission("laboratory", "collect"),
  laboratoryController.collectSpecimen.bind(laboratoryController)
);

router.post(
  "/specimens/:id/receive",
  checkPermission("laboratory", "receive_specimen"),
  laboratoryController.receiveSpecimen.bind(laboratoryController)
);

router.post(
  "/specimens/:id/accept",
  checkPermission("laboratory", "process"),
  laboratoryController.acceptSpecimen.bind(laboratoryController)
);

router.patch(
  "/specimens/:id/reject",
  checkPermission("laboratory", "reject_specimen"),
  laboratoryController.rejectSpecimen.bind(laboratoryController)
);

router.post(
  "/specimens/:id/recollect",
  checkPermission("laboratory", "create_recollection"),
  laboratoryController.createRecollectionRequest.bind(laboratoryController)
);

router.get(
  "/specimens/:id/history",
  checkPermission("laboratory", "view"),
  laboratoryController.getSpecimenHistory.bind(laboratoryController)
);

router.patch(
  "/orders/:orderId/status",
  checkPermission("laboratory", "process"),
  laboratoryController.updateLaboratoryStatus.bind(laboratoryController)
);

router.post(
  "/orders/:orderId/result",
  checkPermission("laboratory", "result_create"),
  laboratoryController.submitLaboratoryResult.bind(laboratoryController)
);

module.exports = router;
