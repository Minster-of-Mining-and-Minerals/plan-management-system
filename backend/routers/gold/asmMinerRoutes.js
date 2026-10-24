"use strict";

const express = require("express");
const router = express.Router();
const asmMinerController = require("../../controllers/gold/asmMinerController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Search candidates before registration
router.get(
  "/search-candidates",
  checkAnyPermission([
    { resource: "asm", action: "read" },
    { resource: "asm", action: "create" },
    { resource: "asm", action: "manage" },
    { resource: "gold_purchases", action: "create" },
    { resource: "gold_purchases", action: "read" },
  ]),
  asmMinerController.searchCandidates
);

// List ASM miners
router.get(
  "/",
  checkAnyPermission([
    { resource: "asm", action: "read" },
    { resource: "asm", action: "manage" },
    { resource: "gold_purchases", action: "create" },
    { resource: "gold_purchases", action: "read" },
  ]),
  asmMinerController.listMiners
);

// Get single ASM miner
router.get(
  "/:id",
  checkAnyPermission([
    { resource: "asm", action: "read" },
    { resource: "asm", action: "manage" },
  ]),
  asmMinerController.getMinerById
);

// Register a new ASM miner
router.post(
  "/",
  checkAnyPermission([
    { resource: "asm", action: "create" },
    { resource: "asm", action: "manage" },
  ]),
  asmMinerController.registerMiner
);

// Update an ASM miner
router.put(
  "/:id",
  checkAnyPermission([
    { resource: "asm", action: "update" },
    { resource: "asm", action: "manage" },
  ]),
  asmMinerController.updateMiner
);

// Deactivate / Activate an ASM miner
router.patch(
  "/:id/status",
  checkAnyPermission([
    { resource: "asm", action: "deactivate" },
    { resource: "asm", action: "update" },
    { resource: "asm", action: "manage" },
  ]),
  asmMinerController.toggleMinerStatus
);

module.exports = router;
