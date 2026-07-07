"use strict";

const { sequelize } = require("./models");
const storageService = require("./services/storageService");
const createDocumentRouter = require("./routers/documentRoutes");
const { configureIntegration } = require("./services/integrationContext");

async function initCollaboration(options = {}) {
  if (options.adapters) {
    configureIntegration(options.adapters);
  }

  storageService.ensureStorageRoot();
  await sequelize.authenticate();
}

function createCollaborationRouter({ authenticateToken }) {
  return createDocumentRouter({ authenticateToken });
}

module.exports = {
  initCollaboration,
  createCollaborationRouter,
};
