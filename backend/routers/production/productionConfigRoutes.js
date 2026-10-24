"use strict";

const express = require("express");
const router = express.Router();

const productionConfigController = require("../../controllers/production/productionConfigController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

// Permissions
const itemsReadAccess = checkAnyPermission([
  { resource: "production_items", action: "read" },
  { resource: "production_items", action: "manage" },
  { resource: "company_production", action: "read" },
  { resource: "company_production", action: "manage" },
  { resource: "company_production_reports", action: "create" },
]);

const itemsCreateAccess = checkAnyPermission([
  { resource: "production_items", action: "create" },
  { resource: "production_items", action: "manage" },
]);

const itemsUpdateAccess = checkAnyPermission([
  { resource: "production_items", action: "update" },
  { resource: "production_items", action: "manage" },
]);

const itemsDeleteAccess = checkAnyPermission([
  { resource: "production_items", action: "delete" },
  { resource: "production_items", action: "manage" },
]);

const frequenciesReadAccess = checkAnyPermission([
  { resource: "production_frequencies", action: "read" },
  { resource: "production_frequencies", action: "manage" },
  { resource: "company_production", action: "read" },
  { resource: "company_production", action: "manage" },
]);

const frequenciesManageAccess = checkAnyPermission([
  { resource: "production_frequencies", action: "manage" },
]);

// All routes require authentication
router.use(authenticateToken);

// Production Items
router.get("/items", itemsReadAccess, productionConfigController.listProductionItemsHandler);
router.post("/items", itemsCreateAccess, productionConfigController.createProductionItemHandler);
router.get("/items/:id", itemsReadAccess, productionConfigController.getProductionItemByIdHandler);
router.put("/items/:id", itemsUpdateAccess, productionConfigController.updateProductionItemHandler);
router.delete("/items/:id", itemsDeleteAccess, productionConfigController.deleteProductionItemHandler);

// Unit Conversion
router.post("/convert-quantity", itemsReadAccess, productionConfigController.convertQuantityHandler);

// Reporting Frequencies
router.get("/frequencies", frequenciesReadAccess, productionConfigController.listFrequenciesHandler);
router.post("/frequencies", frequenciesManageAccess, productionConfigController.createFrequencyHandler);
router.put("/frequencies/:id", frequenciesManageAccess, productionConfigController.updateFrequencyHandler);

// Dynamic Period Generation
router.get("/target-periods", frequenciesReadAccess, productionConfigController.generateTargetPeriodsHandler);

module.exports = router;
