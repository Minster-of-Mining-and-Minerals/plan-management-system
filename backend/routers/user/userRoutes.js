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

const allowSelfRead = (req, res, next) => {
  if (req.user && req.user.user_id === req.params.id) {
    return next();
  }
  return checkPermission("users", "read")(req, res, next);
};

const allowSelfSignatureUpdate = (req, res, next) => {
  if (req.user && req.user.user_id === req.params.id) {
    const hasUpdatePerm = req.user.permissions?.includes("users:update") || req.user.permissions?.includes("*:*");
    if (!hasUpdatePerm) {
      req.body = {
        signature_file: req.body.signature_file,
        signature_enabled: req.body.signature_enabled,
      };
    }
    return next();
  }
  return checkPermission("users", "update")(req, res, next);
};

router.get("/profile/me", getProfile);

router.get("/", checkPermission("users", "read"), getUsers);
router.get("/:id", allowSelfRead, getUserById);
router.post("/", checkPermission("users", "create"), validateCreateInternalUser, createUser);
router.put("/:id", allowSelfSignatureUpdate, validateUpdateInternalUser, updateUser);
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
