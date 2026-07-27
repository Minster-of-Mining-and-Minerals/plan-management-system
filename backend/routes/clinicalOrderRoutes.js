"use strict";

const express = require("express");
const router = express.Router();
const clinicalOrderController = require("../controllers/clinicalOrderController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/",
  checkPermission("orders", "create"),
  clinicalOrderController.createOrder.bind(clinicalOrderController)
);

router.get(
  "/:id",
  checkPermission("orders", "view"),
  clinicalOrderController.getOrder.bind(clinicalOrderController)
);

router.get(
  "/encounter/:appointmentId",
  checkPermission("orders", "view"),
  clinicalOrderController.listEncounterOrders.bind(clinicalOrderController)
);

router.get(
  "/patient/:patientId",
  checkPermission("orders", "view"),
  clinicalOrderController.listPatientOrders.bind(clinicalOrderController)
);

router.get(
  "/department/:departmentId",
  checkPermission("orders", "view"),
  clinicalOrderController.listDepartmentQueue.bind(clinicalOrderController)
);

router.patch(
  "/:id/accept",
  checkPermission("orders", "accept"),
  clinicalOrderController.acceptOrder.bind(clinicalOrderController)
);

router.patch(
  "/:id/auto-assign",
  checkPermission("orders", "accept"),
  clinicalOrderController.autoAssignQueueOrder.bind(clinicalOrderController)
);

router.patch(
  "/:id/status",
  checkPermission("orders", "execute"),
  clinicalOrderController.updateOrderStatus.bind(clinicalOrderController)
);

router.post(
  "/:id/result",
  checkPermission("orders", "result_create"),
  clinicalOrderController.recordResult.bind(clinicalOrderController)
);

router.patch(
  "/:id/cancel",
  checkPermission("orders", "cancel"),
  clinicalOrderController.cancelOrder.bind(clinicalOrderController)
);

router.post(
  "/:id/result/amend",
  checkPermission("orders", "amend"),
  clinicalOrderController.amendResult.bind(clinicalOrderController)
);

module.exports = router;
