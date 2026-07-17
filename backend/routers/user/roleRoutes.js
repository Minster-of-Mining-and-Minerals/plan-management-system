"use strict";

const express = require("express");
const router = express.Router();

const {
  validateCreateRole,
  validateUpdateRole,
} = require("../../validators/user/roleValidator");

const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

const {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../../controllers/user/roleController");

router.use(authenticateToken, requireInternalAccount);

router.post("/", checkPermission("roles", "create"), validateCreateRole, createRole);
router.get("/", checkPermission("roles", "read"), getRoles);
router.get("/:id", checkPermission("roles", "read"), getRoleById);
router.put("/:id", checkPermission("roles", "update"), validateUpdateRole, updateRole);
router.delete("/:id", checkPermission("roles", "delete"), deleteRole);

module.exports = router;
