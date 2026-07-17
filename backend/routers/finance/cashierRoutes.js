"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const controller = require("../../controllers/finance/cashierController");
const {
  validateOpenSession,
  validateCloseSession,
  validateRecordPayment,
  validateVoidPayment,
} = require("../../validators/finance/cashierValidator");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/sessions/current",
  checkPermission("cashier_session", "view"),
  controller.getCurrentSession
);

router.post(
  "/sessions/open",
  checkPermission("cashier_session", "open"),
  validateOpenSession,
  controller.openSession
);

router.post(
  "/sessions/:sessionId/close",
  checkPermission("cashier_session", "close"),
  validateCloseSession,
  controller.closeSession
);

router.get(
  "/sessions/:sessionId/summary",
  checkPermission("cashier_session", "view"),
  controller.getSessionSummary
);

router.get(
  "/queue",
  checkPermission("cashier_queue", "view"),
  controller.listQueue
);

router.get(
  "/payments/today",
  checkPermission("cashier_queue", "view"),
  controller.listPaymentsToday
);

router.get(
  "/payments",
  checkPermission("cashier_payment", "view"),
  controller.listPaymentHistory
);

router.get(
  "/collections/export",
  checkPermission("finance_collections", "view"),
  controller.exportCollections
);

router.get(
  "/collections",
  checkPermission("finance_collections", "view"),
  controller.listPaymentHistory
);

router.get(
  "/accounts/:accountId",
  checkPermission("cashier_payment", "view"),
  controller.getAccount
);

router.post(
  "/accounts/:accountId/take",
  checkPermission("cashier_payment", "create"),
  controller.takeAccount
);

router.post(
  "/accounts/:accountId/release",
  checkPermission("cashier_payment", "create"),
  controller.releaseAccount
);

router.post(
  "/accounts/:accountId/force-release",
  checkPermission("finance_collections", "view"),
  controller.forceReleaseAccount
);

router.post(
  "/accounts/:accountId/payments",
  checkPermission("cashier_payment", "create"),
  validateRecordPayment,
  controller.recordPayment
);

router.get(
  "/payments/:paymentId/receipt",
  checkPermission("cashier_payment", "view"),
  controller.getReceipt
);

router.post(
  "/payments/:paymentId/void",
  checkPermission("cashier_payment", "void"),
  validateVoidPayment,
  controller.voidPayment
);

module.exports = router;
