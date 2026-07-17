"use strict";

const express = require("express");
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserActiveStatus,
  resetUserPassword,
  getProfile,
} = require("../../controllers/user/userController");

const {
  validateCreateInternalUser,
  validateUpdateInternalUser,
} = require("../../middlewares/internalUserValidationMiddleware");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/profile/me", getProfile);

router.get("/", checkPermission("users", "read"), getUsers);
router.get("/:id", checkPermission("users", "read"), getUserById);
router.post("/", checkPermission("users", "create"), validateCreateInternalUser, createUser);
router.put("/:id", checkPermission("users", "update"), validateUpdateInternalUser, updateUser);
router.delete("/:id", checkPermission("users", "delete"), deleteUser);
router.patch(
  "/:id/toggle-status",
  checkPermission("users", "update"),
  toggleUserActiveStatus
);
router.post(
  "/:id/reset-password",
  checkPermission("users", "update"),
  resetUserPassword
);

module.exports = router;
