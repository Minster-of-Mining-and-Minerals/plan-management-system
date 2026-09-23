"use strict";

const path = require("path");
const Module = require("module");

const backendNodeModules = path.join(__dirname, "node_modules");
process.env.NODE_PATH = [backendNodeModules, process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

const { Op } = require("sequelize");

const collaborationEnvPath = path.join(__dirname, "../collaboration-service/.env");

// Merge collaboration-only vars without overriding backend PORT, DB_NAME, etc.
require("dotenv").config({ path: collaborationEnvPath, override: false });

const db = require("./models");
// const { userCanReadPlanVersion } = require("./services/planVisibilityService");
// const {
//   initCollaboration,
//   createCollaborationRouter,
// } = require("../collaboration-service/mount");
const { authenticateToken } = require("./middlewares/authMiddleware");

function collaborationAuth(req, res, next) {
  authenticateToken(req, res, () => {
    const authHeader = req.headers.authorization;
    req.accessToken = authHeader && authHeader.split(" ")[1];
    next();
  });
}

async function mountCollaboration(app) {
  console.log("Collaboration service is disabled (missing files).");
}

module.exports = { mountCollaboration };
