"use strict";

const express = require("express");
const router = express.Router();
const permissionController = require("../../controllers/user/permissionController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("permissions", "read"), permissionController.getPermissions);
router.put(
  "/activate/:permission_id",
  checkPermission("permissions", "update"),
  permissionController.activatePermission
);
router.put(
  "/deactivate/:permission_id",
  checkPermission("permissions", "update"),
  permissionController.deactivatePermission
);
router.put(
  "/toggle/:permission_id",
  checkPermission("permissions", "update"),
  permissionController.togglePermission
);

module.exports = router;
