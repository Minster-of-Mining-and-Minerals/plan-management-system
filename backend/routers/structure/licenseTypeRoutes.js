"use strict";

const express = require("express");
const router = express.Router();
const licenseTypeController = require("../../controllers/structure/licenseTypeController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

const licenseTypeRead = checkAnyPermission([
  { resource: "license_types", action: "read" },
  { resource: "license_types", action: "manage" },
  { resource: "company_licenses", action: "read" },
  { resource: "company_licenses", action: "manage" },
  { resource: "companies", action: "read" },
  { resource: "companies", action: "manage" },
]);

const licenseTypeManage = checkAnyPermission([
  { resource: "license_types", action: "manage" },
  { resource: "company_licenses", action: "manage" },
  { resource: "companies", action: "manage" },
]);

router.use(authenticateToken);

router.get("/", licenseTypeRead, licenseTypeController.listLicenseTypes);
router.get("/:id", licenseTypeRead, licenseTypeController.getLicenseTypeById);
router.post("/", licenseTypeManage, licenseTypeController.createLicenseType);
router.put("/:id", licenseTypeManage, licenseTypeController.updateLicenseType);
router.delete("/:id", licenseTypeManage, licenseTypeController.deleteLicenseType);

module.exports = router;
