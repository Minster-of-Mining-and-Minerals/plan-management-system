"use strict";

const express = require("express");
const router = express.Router();
const { sequelize } = require("../models");
const { PLATFORM_NAME } = require("../config/platformBranding");

router.get("/health", async (_req, res) => {
  const payload = {
    status: "ok",
    service: PLATFORM_NAME,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: "unknown",
  };

  try {
    await sequelize.authenticate();
    payload.database = "connected";
    return res.status(200).json(payload);
  } catch (err) {
    payload.status = "degraded";
    payload.database = "disconnected";
    payload.error = err.message;
    return res.status(503).json(payload);
  }
});

module.exports = router;
