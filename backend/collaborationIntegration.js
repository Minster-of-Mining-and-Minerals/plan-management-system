"use strict";

const path = require("path");
const Module = require("module");

const backendNodeModules = path.join(__dirname, "node_modules");
process.env.NODE_PATH = [backendNodeModules, process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

const { Op } = require("sequelize");

require("dotenv").config({
  path: path.join(__dirname, "../collaboration-service/.env"),
  override: false,
});

const db = require("./models");
const { userCanReadPlanVersion } = require("./services/planVisibilityService");
const {
  initCollaboration,
  createCollaborationRouter,
} = require("../collaboration-service/mount");
const { authenticateToken } = require("./middlewares/authMiddleware");

function collaborationAuth(req, res, next) {
  authenticateToken(req, res, () => {
    const authHeader = req.headers.authorization;
    req.accessToken = authHeader && authHeader.split(" ")[1];
    next();
  });
}

async function mountCollaboration(app) {
  await initCollaboration({
    adapters: {
      getPermissions(user) {
        return (user?.permissions || []).map((permission) => permission.toUpperCase());
      },
      getUserProfile(user) {
        return {
          user_id: user.user_id,
          full_name: user.full_name || user.email || "User",
          email: user.email || "",
        };
      },
      async loadPlanVersion(versionId, user) {
        const req = { user };
        if (!(await userCanReadPlanVersion(req, versionId))) {
          return null;
        }

        const version = await db.PlanVersion.findByPk(versionId, {
          attributes: ["plan_version_id", "status", "is_locked"],
        });

        return version ? version.get({ plain: true }) : null;
      },
      async resolveUserDisplayNames(_user, userIds = []) {
        const uniqueIds = [...new Set(userIds.filter(Boolean))].slice(0, 100);
        if (!uniqueIds.length) {
          return {};
        }

        const users = await db.User.findAll({
          where: { user_id: { [Op.in]: uniqueIds } },
          attributes: ["user_id", "full_name", "email"],
        });

        const data = {};
        for (const row of users) {
          data[row.user_id] = {
            full_name: row.full_name,
            email: row.email,
          };
        }
        return data;
      },
      async getUserPermissionGroupIds(user) {
        const memberships = await db.UserPermissionGroup.findAll({
          where: { user_id: user.user_id },
          attributes: ["permission_group_id"],
        });
        return memberships.map((row) => row.permission_group_id);
      },
      async sendDocumentForward(fromUser, recipientUserId, document, message) {
        const { sendNotification } = require("./utils/notification");
        let io = null;
        try {
          io = require("./app").io;
        } catch {
          io = null;
        }

        await sendNotification(
          [{ user_id: recipientUserId }],
          {
            category: "documents",
            notification_type: "document_forwarded",
            title: `${fromUser.full_name || fromUser.email || "Someone"} forwarded a document to you`,
            message:
              message ||
              `Open "${document.title}" shared with you.`,
            related_entity_type: "document",
            related_entity_id: document.document_id,
            link_path: `/documents/${document.document_id}`,
            icon_variant: "file",
            priority: "normal",
            metadata: {
              document_id: document.document_id,
              document_title: document.title,
              forwarded_by: fromUser.user_id,
            },
          },
          io
        );
      },
    },
  });

  app.use("/api/v1", createCollaborationRouter({ authenticateToken: collaborationAuth }));
  console.log("Collaboration routes mounted at /api/v1");
}

module.exports = { mountCollaboration };
