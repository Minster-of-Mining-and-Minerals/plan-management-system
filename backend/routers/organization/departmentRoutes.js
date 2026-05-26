"use strict";

const express = require("express");
const router = express.Router();

const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

const {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateDepartmentStatus,
} = require("../../validators/organization/departmentValidator");

const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
} = require("../../controllers/organization/departmentController");

router.use(authenticateToken, requireInternalAccount);

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Hospital department management
 */

router.get("/", checkPermission("departments", "read"), getDepartments);
router.get("/:id", checkPermission("departments", "read"), getDepartmentById);
router.post(
  "/",
  checkPermission("departments", "create"),
  validateCreateDepartment,
  createDepartment
);
router.put(
  "/:id",
  checkPermission("departments", "update"),
  validateUpdateDepartment,
  updateDepartment
);
router.patch(
  "/:id/status",
  checkPermission("departments", "update"),
  validateDepartmentStatus,
  toggleDepartmentStatus
);
router.delete(
  "/:id",
  checkPermission("departments", "delete"),
  deleteDepartment
);

module.exports = router;
