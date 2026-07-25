"use strict";

const express = require("express");
const router = express.Router();
const clinicalOrderDefinitionController = require("../controllers/orders/clinicalOrderDefinitionController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/definitions",
  checkPermission("orders", "order_definition:view"),
  clinicalOrderDefinitionController.getOrderDefinitions
);

router.post(
  "/definitions",
  checkPermission("orders", "order_definition:manage"),
  clinicalOrderDefinitionController.createOrderDefinition
);

router.post(
  "/instantiate",
  checkPermission("orders", "order_definition:execute_render"),
  clinicalOrderDefinitionController.instantiateRuntimeOrder
);

router.get(
  "/designer-options",
  checkPermission("orders", "order_definition:designer"),
  clinicalOrderDefinitionController.getDesignerConfigOptions
);

module.exports = router;
